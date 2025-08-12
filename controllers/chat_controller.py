# controllers/chat_controller.py
from services.webhook_service import send_to_n8n

async def handle_prompt(prompt: str, user_id: str, session_id: str, policy_number: str) -> str:
    return await send_to_n8n(
        prompt=prompt,
        user_id=user_id,
        session_id=session_id,
        policy_number=policy_number,
    )
