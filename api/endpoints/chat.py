# api/endpoints/chat.py
from fastapi import APIRouter, Request
from controllers.chat_controller import handle_prompt

router = APIRouter()

@router.post("/send-message")
async def send_message(request: Request):
    body = await request.json()
    prompt = body.get("prompt")
    user_id = body.get("user_id")
    policy_number = body.get("policy_number")

    if not prompt:
        return {"response": "Prompt boş olamaz."}
    if not user_id:
        return {"response": "Kullanıcı ID eksik."}
    if not policy_number:
        return {"response": "Poliçe numarası eksik."}

    response = await handle_prompt(prompt, user_id, policy_number)
    return {"response": response}


@router.post("/submit-policy")
async def submit_policy(request: Request):
    body = await request.json()
    user_id = body.get("user_id")
    policy_number = body.get("policy_number")

    if not user_id or not policy_number:
        return {"response": "Eksik bilgi gönderildi."}

    from controllers.policy_controller import handle_policy
    response = await handle_policy(user_id, policy_number)
    return {"response": response}

