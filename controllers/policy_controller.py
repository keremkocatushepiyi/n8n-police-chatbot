from services.webhook_service import submit_policy_to_n8n

async def handle_policy(user_id: str, policy_number: str) -> str:
    return await submit_policy_to_n8n(user_id, policy_number)
