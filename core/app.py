# core/app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import chat

def create_app() -> FastAPI:
    app = FastAPI(
        title="Chatbot Web App",
        description="Jinja2 tabanlı bir chatbot arayüzü",
        version="1.0.0"
    )

    # CORS ayarları
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Geliştirme için açık; prod'da domain ile değiştir.
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(chat.router)

    return app
