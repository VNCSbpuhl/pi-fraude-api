"""
Configurações da aplicação
"""
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Fraud Classifier API"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006",
        "*"  # Em produção, especificar domínios exatos
    ]
    
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/fraud_db"
    
    # Security
    API_KEY_HEADER: str = "X-API-Key"
    API_KEYS: List[str] = []  # Será carregado do Secrets Manager em produção
    
    # ML Model
    MODEL_PATH: str = "../ml/models/fraud_classifier.pkl"
    SCALER_PATH: str = "../ml/scalers/amount_scaler.pkl"
    FEATURES_PATH: str = "../ml/models/feature_columns.json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

