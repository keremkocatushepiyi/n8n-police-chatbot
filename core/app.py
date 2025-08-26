# core/app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import chat
from api.endpoints import identity

def create_app() -> FastAPI:
    app = FastAPI(
        title="Chatbot Web App",
        description="Jinja2 tabanlı bir chatbot arayüzü",
        version="1.0.0"
    )

    # CORS ayarları
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(chat.router)
    app.include_router(identity.router)

    return app
