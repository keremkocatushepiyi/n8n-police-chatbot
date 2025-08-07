# services/webhook_service.py
import httpx
from core import config

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

async def submit_policy_to_n8n(user_id: str, policy_number: str) -> str:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                config.N8N_POLICY_WEBHOOK_URL,
                json={
                    "user_id": user_id,
                    "policy_number": int(policy_number),
                    "product_no": int(policy_number[:3])
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "Poliçe gönderildi ancak mesaj alınamadı.")
        except Exception as e:
            return f"Hata: {str(e)}"
