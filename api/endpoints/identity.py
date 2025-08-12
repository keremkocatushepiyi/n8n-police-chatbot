# api/endpoints/identity.py
from fastapi import APIRouter
import uuid

router = APIRouter()

@router.get("/generate-ids")
async def generate_ids():
    return {
        "user_id": str(uuid.uuid4()),
        "session_id": str(uuid.uuid4())
    }
