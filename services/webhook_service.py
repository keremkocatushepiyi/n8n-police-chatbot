# services/webhook_service.py
import httpx
from core import config
import logging
from typing import Any

logger = logging.getLogger(__name__)

def _extract_output(jd: Any):
    try:
        obj = jd[0] if isinstance(jd, list) and jd else jd
        if isinstance(obj, dict):
            return (
                obj.get("output")
                or obj.get("response")
                or obj.get("message")
                or obj.get("result")
                or (obj.get("data") or {}).get("response")
            )
    except Exception:
        pass
    return None

def _extract_session(jd: Any):
    try:
        obj = jd[0] if isinstance(jd, list) and jd else jd
        if isinstance(obj, dict):
            return (
                obj.get("session_id")
                or (obj.get("data") or {}).get("session_id")
            )
    except Exception:
        pass
    return None

async def send_to_n8n(prompt: str, user_id: str, session_id: str, policy_number: str) -> str:
    if not getattr(config, "N8N_WEBHOOK_URL", None):
        return "Hata: N8N_WEBHOOK_URL tanımlı değil."

    payload = {
        "prompt": prompt,
        "user_id": user_id,
        "session_id": session_id,      # <<< önemli
        "policy_number": policy_number,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(config.N8N_WEBHOOK_URL, json=payload)
            resp.raise_for_status()
            try:
                jd = resp.json()
            except Exception:
                return resp.text or "Cevap alınamadı."

            # İstersen burada da session_id yakalayıp tutabilirsin
            return _extract_output(jd) or "Cevap alınamadı."
    except httpx.HTTPStatusError as he:
        logger.error("HTTP hatası: %s | body=%s", he.response.status_code, he.response.text[:500])
        return f"HTTP hatası: {he.response.status_code}"
    except httpx.RequestError as re:
        logger.exception("Bağlantı hatası:")
        return f"Bağlantı hatası: {str(re)}"
    except Exception as e:
        logger.exception("Bilinmeyen hata:")
        return f"Hata: {e}"

async def submit_policy_to_n8n(user_id: str, session_id: str, policy_number: str) -> str:
    if not getattr(config, "N8N_POLICY_WEBHOOK_URL", None):
        return "Hata: N8N_POLICY_WEBHOOK_URL tanımlı değil."

    pn = policy_number or ""
    payload = {
        "user_id": user_id,
        "session_id": session_id,      # <<< önemli
        "policy_number": pn,
        "product_no": pn[:3],
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(config.N8N_POLICY_WEBHOOK_URL, json=payload)
            response.raise_for_status()
            try:
                jd = response.json()
            except Exception:
                return response.text or "Poliçen işlendi."

            return _extract_output(jd) or (jd.get("message") if isinstance(jd, dict) else "Poliçen işlendi.")
    except httpx.RequestError as req_error:
        logger.exception("Bağlantı hatası:")
        return f"Bağlantı hatası: {str(req_error)}"
    except httpx.HTTPStatusError as http_error:
        logger.error("HTTP hatası: %s", http_error.response.text[:500])
        return f"HTTP hatası: {http_error.response.status_code}"
    except Exception as e:
        logger.exception("Bilinmeyen hata:")
        return f"Bilinmeyen hata: {str(e)}"
    

async def submit_claim_to_n8n(user_id: str, session_id: str, claim_number: str) -> str:
    if not getattr(config, "N8N_CLAIM_WEBHOOK_URL", None):
        return "Hata: N8N_CLAIM_WEBHOOK_URL tanımlı değil."

    cn = claim_number or ""
    payload = {
        "user_id": user_id,
        "session_id": session_id,   
        "claim_number": cn[:-2],
        "claim_prefix": cn[-1], 
        "prompt": "Hasar dosyasının güncel durumu"   
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(config.N8N_CLAIM_WEBHOOK_URL, json=payload)
            response.raise_for_status()
            try:
                jd = response.json()
            except Exception:
                return response.text or "Hasar dosyan işlenemedi."

            return _extract_output(jd) or (
                jd.get("message") if isinstance(jd, dict) else "Hasar dosyan işlendi."
            )
    except httpx.RequestError as req_error:
        logger.exception("Bağlantı hatası:")
        return f"Bağlantı hatası: {str(req_error)}"
    except httpx.HTTPStatusError as http_error:
        logger.error("HTTP hatası: %s", http_error.response.text[:500])
        return f"HTTP hatası: {http_error.response.status_code}"
    except Exception as e:
        logger.exception("Bilinmeyen hata:")
        return f"Bilinmeyen hata: {str(e)}"


async def send_claim_prompt_to_n8n(prompt: str, user_id: str, session_id: str, claim_number: str) -> str:
    if not getattr(config, "N8N_CLAIM_WEBHOOK_URL", None):
        return "Hata: N8N_CLAIM_WEBHOOK_URL tanımlı değil."

    cn = claim_number or ""
    payload = {
        "prompt": prompt,              # <<< kullanıcı prompt'u
        "user_id": user_id,
        "session_id": session_id,
        "claim_number": cn[:-2],
        "claim_prefix": cn[-1],
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(config.N8N_CLAIM_WEBHOOK_URL, json=payload)
            response.raise_for_status()
            try:
                jd = response.json()
            except Exception:
                return response.text or "Cevap alınamadı."

            return _extract_output(jd) or (
                jd.get("message") if isinstance(jd, dict) else "Cevap alınamadı."
            )
    except httpx.RequestError as req_error:
        logger.exception("Bağlantı hatası:")
        return f"Bağlantı hatası: {str(req_error)}"
    except httpx.HTTPStatusError as http_error:
        logger.error("HTTP hatası: %s", http_error.response.text[:500])
        return f"HTTP hatası: {http_error.response.status_code}"
    except Exception as e:
        logger.exception("Bilinmeyen hata:")
        return f"Bilinmeyen hata: {str(e)}"
