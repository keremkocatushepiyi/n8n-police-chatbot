# api/endpoints/chat.py
from fastapi import APIRouter, Request
from controllers.chat_controller import handle_prompt

router = APIRouter()

@router.post("/send-message")
async def send_message(request: Request):
    body = await request.json()
    prompt = body.get("prompt")
    user_id = body.get("user_id")

    if not prompt:
        return {"response": "Prompt boş olamaz."}

    if not user_id:
        return {"response": "user_id eksik."}

    response = await handle_prompt(prompt, user_id)
    return {"response": response}
