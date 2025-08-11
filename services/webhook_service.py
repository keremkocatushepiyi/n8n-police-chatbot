# services/webhook_service.py
import httpx
from core import config
import logging

logger = logging.getLogger(__name__)

def _extract_output(json_data):
    # n8n bazen list, bazen dict döndürür
    if isinstance(json_data, list) and json_data:
        # ilk itemdan output/response alanını dene
        first = json_data[0]
        return first.get("output") or first.get("response")
    if isinstance(json_data, dict):
        return json_data.get("output") or json_data.get("response")
    return None

async def send_to_n8n(prompt: str, user_id: str, policy_number: str) -> str:
    # URL kontrolü
    if not getattr(config, "N8N_WEBHOOK_URL", None):
        return "Hata: N8N_WEBHOOK_URL tanımlı değil."

    payload = {
        "prompt": prompt,
        "user_id": user_id,
        "policy_number": policy_number,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(config.N8N_WEBHOOK_URL, json=payload)
            resp.raise_for_status()

            try:
                jd = resp.json()
            except Exception as je:
                logger.warning("JSON parse hatası: %s | text=%s", je, resp.text[:500])
                return resp.text or "Cevap alınamadı."

            out = _extract_output(jd)
            return out or "Cevap alınamadı."
    except httpx.HTTPStatusError as he:
        logger.error("HTTP hatası: %s | body=%s", he.response.status_code, he.response.text[:500])
        return f"HTTP hatası: {he.response.status_code}"
    except httpx.RequestError as re:
        logger.exception("Bağlantı hatası:")
        return f"Bağlantı hatası: {str(re)}"
    except Exception as e:
        logger.exception("Bilinmeyen hata:")
        return f"Hata: {e}"

async def submit_policy_to_n8n(user_id: str, policy_number: str) -> str:
    if not getattr(config, "N8N_POLICY_WEBHOOK_URL", None):
        return "Hata: N8N_POLICY_WEBHOOK_URL tanımlı değil."

    pn = policy_number or ""
    payload = {
        "user_id": user_id,
        "policy_number": pn,
        "product_no": pn[:3],  # None güvenli
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(config.N8N_POLICY_WEBHOOK_URL, json=payload)
            response.raise_for_status()

            try:
                json_data = response.json()
                logger.debug("JSON yanıtı: %s", json_data)
            except Exception as je:
                logger.warning("Yanıt JSON olarak parse edilemedi: %s", je)
                return response.text or "Poliçen işlendi."

            out = _extract_output(json_data)
            if out:
                return out

            # Geriye kalan durumlar
            if isinstance(json_data, dict):
                return json_data.get("message") or "Poliçen işlendi."
            return "Beklenmeyen yanıt formatı."
    except httpx.RequestError as req_error:
        logger.exception("Bağlantı hatası:")
        return f"Bağlantı hatası: {str(req_error)}"
    except httpx.HTTPStatusError as http_error:
        logger.error("HTTP hatası: %s", http_error.response.text[:500])
        return f"HTTP hatası: {http_error.response.status_code}"
    except Exception as e:
        logger.exception("Bilinmeyen hata:")
        return f"Bilinmeyen hata: {str(e)}"
