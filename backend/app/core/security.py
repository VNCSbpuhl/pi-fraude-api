"""
Segurança e Autenticação
"""
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from app.core.config import settings
import os

api_key_header = APIKeyHeader(name=settings.API_KEY_HEADER, auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    """
    Verifica a API key fornecida no header
    """
    # Em desenvolvimento, permitir sem API key se configurado
    if os.getenv("ENVIRONMENT") == "development" and not api_key:
        return api_key
    
    # Carregar API keys (em produção, virá do Secrets Manager)
    valid_keys = settings.API_KEYS
    if not valid_keys:
        # Fallback: carregar de variável de ambiente
        env_key = os.getenv("API_KEY")
        if env_key:
            valid_keys = [env_key]
    
    if not api_key or api_key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key inválida ou ausente",
            headers={"WWW-Authenticate": "API-Key"},
        )
    
    return api_key

