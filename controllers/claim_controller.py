# controllers/claim_controller.py
from services.webhook_service import submit_claim_to_n8n, send_claim_prompt_to_n8n

async def handle_claim(user_id: str, session_id: str, claim_number: str) -> str:
    """
    Hasar dosyasını başlatır (sabit prompt ile).
    """
    return await submit_claim_to_n8n(
        user_id=user_id,
        session_id=session_id,
        claim_number=claim_number,
    )

async def handle_claim_prompt(prompt: str, user_id: str, session_id: str, claim_number: str) -> str:
    """
    Kullanıcıdan gelen prompt'a göre hasar dosyasına soru sorar.
    """
    return await send_claim_prompt_to_n8n(
        prompt=prompt,
        user_id=user_id,
        session_id=session_id,
        claim_number=claim_number,
    )
