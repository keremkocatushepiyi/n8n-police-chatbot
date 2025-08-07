# controllers/chat_controller.py
from services.webhook_service import send_to_n8n

async def handle_prompt(prompt: str, user_id: str) -> str:
    return await send_to_n8n(prompt, user_id)

