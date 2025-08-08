# services/webhook_service.py
import httpx
from core import config
import logging

async def send_to_n8n(prompt: str, user_id: str, policy_number: str) -> str:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                config.N8N_WEBHOOK_URL,
                json={
                    "prompt": prompt,
                    "user_id": user_id,
                    "policy_number": policy_number
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("output", "Cevap alınamadı.")
        except Exception as e:
            return f"Hata: {str(e)}"


# services/webhook_service.py

logger = logging.getLogger(__name__)

async def submit_policy_to_n8n(user_id: str, policy_number: str) -> str:
    payload = {
        "user_id": user_id,
        "policy_number": policy_number,
        "product_no": policy_number[:3]
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(config.N8N_POLICY_WEBHOOK_URL, json=payload)
            response.raise_for_status()

            try:
                json_data = response.json()  # ✅ await kaldırıldı
                logger.debug("JSON yanıtı: %s", json_data)

                # Eğer liste geldiyse (örneğin: [{ "output": "..." }])
                if isinstance(json_data, list) and len(json_data) > 0:
                    return json_data[0].get("output", "Poliçen işlendi.")
                elif isinstance(json_data, dict):
                    return json_data.get("response", "Poliçen işlendi.")
                else:
                    return "Beklenmeyen yanıt formatı."

            except Exception as e:
                logger.warning("Yanıt JSON olarak parse edilemedi: %s", str(e))
                return response.text

    except httpx.RequestError as req_error:
        logger.exception("Bağlantı hatası:")
        return f"Bağlantı hatası: {str(req_error)}"

    except httpx.HTTPStatusError as http_error:
        logger.error("HTTP hatası: %s", http_error.response.text)
        return f"HTTP hatası: {http_error.response.status_code}"

    except Exception as e:
        logger.exception("Bilinmeyen hata:")
        return f"Bilinmeyen hata: {str(e)}"

