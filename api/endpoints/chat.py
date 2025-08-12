# api/endpoints/chat.py
from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
import pdfplumber
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


@router.post("/extract-text")
async def extract_text(
    file: UploadFile = File(..., description="PDF dosyası"),
    start_page: int = 1,                 # 1-indexed
    end_page: int | None = None,         # None => son sayfaya kadar
):
    # Basit içerik türü kontrolü
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Lütfen bir PDF dosyası yükleyin.")

    try:
        # UploadFile.file bir dosya-benzeri objedir; pdfplumber doğrudan açabilir.
        file.file.seek(0)
        with pdfplumber.open(file.file) as pdf:
            total_pages = len(pdf.pages)
            if total_pages == 0:
                return JSONResponse({"text": "", "total_pages": 0})

            # Sayfa sınırlarını ayarla
            if start_page < 1:
                start_page = 1
            if end_page is None or end_page > total_pages:
                end_page = total_pages
            if start_page > end_page:
                raise HTTPException(status_code=400, detail="start_page end_page'den büyük olamaz.")

            # Metni topla
            chunks: list[str] = []
            for i in range(start_page - 1, end_page):
                page = pdf.pages[i]
                # Toleransları gerektiğinde ayarlayabilirsiniz
                text = page.extract_text(x_tolerance=2, y_tolerance=2) or ""
                if text:
                    chunks.append(text)

            full_text = "\n".join(chunks).strip()

        return {
            "filename": file.filename,
            "total_pages": total_pages,
            "start_page": start_page,
            "end_page": end_page,
            "text": full_text,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF okunurken hata oluştu: {e}")
