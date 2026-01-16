# api/endpoints/chat.py
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
import pdfplumber
from uuid import uuid4
import io
import pdfplumber

from controllers.chat_controller import handle_prompt
from controllers.policy_controller import handle_policy
from controllers.claim_controller import handle_claim, handle_claim_prompt  

router = APIRouter()


@router.post("/send-message")
async def send_message(request: Request):
    body = await request.json()
    prompt = body.get("prompt")
    user_id = body.get("user_id")
    session_id = body.get("session_id") or str(uuid4())

    is_police = body.get("is_police")
    policy_number = body.get("policy_number")
    claim_number = body.get("claim_number")

    if not prompt:
        raise HTTPException(status_code=400, detail="prompt zorunlu")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id zorunlu")
    if is_police is None:
        raise HTTPException(status_code=400, detail="is_police zorunlu")

    if is_police:
        if not policy_number:
            raise HTTPException(status_code=400, detail="policy_number zorunlu (is_police=true iken)")
        response = await handle_prompt(prompt, user_id, session_id, policy_number)
    else:
        if not claim_number:
            raise HTTPException(status_code=400, detail="claim_number zorunlu (is_police=false iken)")
        response = await handle_claim_prompt(prompt, user_id, session_id, claim_number)

    return {"response": response, "session_id": session_id}


@router.post("/submit-policy")
async def submit_policy(request: Request):
    body = await request.json()
    user_id = body.get("user_id")
    session_id = body.get("session_id") or str(uuid4())

    is_police = body.get("is_police")
    policy_number = body.get("policy_number")
    claim_number = body.get("claim_number")

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id zorunlu")
    if is_police is None:
        raise HTTPException(status_code=400, detail="is_police zorunlu")

    if is_police:
        if not policy_number:
            raise HTTPException(status_code=400, detail="policy_number zorunlu (is_police=true iken)")
        response = await handle_policy(user_id, session_id, policy_number)
    else:
        if not claim_number:
            raise HTTPException(status_code=400, detail="claim_number zorunlu (is_police=false iken)")
        response = await handle_claim(user_id, session_id, claim_number)  # ✅ claim akışı

    return {"response": response, "session_id": session_id}


@router.post("/extract-text")
async def extract_text(
    file: UploadFile = File(..., description="PDF dosyası"),
    start_page: int = 1,
    end_page: int | None = None,
):
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Lütfen geçerli bir PDF dosyası yükleyin.")

    try:
        file_content = await file.read()
        
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            total_pages = len(pdf.pages)
            
            if total_pages == 0:
                return JSONResponse({"text": "", "total_pages": 0})

            if start_page < 1:
                start_page = 1
            
            real_end_page = end_page if (end_page is not None and end_page <= total_pages) else total_pages

            if start_page > real_end_page:
                raise HTTPException(status_code=400, detail="start_page end_page'den büyük olamaz.")

            chunks: list[str] = []
            
            for i in range(start_page - 1, real_end_page):
                page = pdf.pages[i]
                
                text = page.extract_text(x_tolerance=2, y_tolerance=2, layout=False) or ""
                
                if text:
                    chunks.append(text)

            full_text = "\n".join(chunks).strip()

        return {
            "filename": file.filename,
            "total_pages": total_pages,
            "start_page": start_page,
            "end_page": real_end_page,
            "text": full_text,
        }

    except Exception as e:
        print(f"Hata detayı: {e}")
        raise HTTPException(status_code=500, detail=f"PDF okunurken hata oluştu: {str(e)}")
