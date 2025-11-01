"""
FastAPI Backend - Sistema Classificador de Fraude
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from app.api.v1.endpoints import classify
from app.ml.model_loader import model_loader
from app.core.config import settings

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerenciamento do ciclo de vida da aplicação"""
    # Startup: Carregar modelo ML
    print("🚀 Iniciando aplicação...")
    try:
        model_loader.load_model()
        print("✅ Modelo ML carregado com sucesso")
    except Exception as e:
        print(f"⚠️ Aviso: Modelo ML não pôde ser carregado: {e}")
        print("⚠️ A aplicação continuará sem o modelo ML")
    
    yield
    
    # Shutdown: Limpar recursos
    print("🛑 Encerrando aplicação...")

app = FastAPI(
    title="Fraud Classifier API",
    description="API RESTful para classificação de fraude em transações financeiras",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check
@app.get("/health")
async def health_check():
    """Endpoint de health check"""
    return {
        "status": "healthy",
        "model_loaded": model_loader.is_loaded
    }

# Incluir rotas
app.include_router(classify.router, prefix="/api/v1", tags=["classification"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

