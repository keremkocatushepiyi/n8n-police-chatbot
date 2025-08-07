# services/webhook_service.py
import httpx
from core import config


async def send_to_n8n(prompt: str, user_id: str) -> str:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                config.N8N_WEBHOOK_URL,
                json={
                    "prompt": prompt,
                    "user_id": user_id
                }
            )
            response.raise_for_status()

            data = response.json()
            return data.get("output", "Cevap bulunamadı.")

        except Exception as e:
            return f"Hata: {str(e)}"
