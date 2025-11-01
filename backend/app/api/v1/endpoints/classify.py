"""
Endpoint de classificação de fraude
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import logging

from app.ml.model_loader import model_loader
from app.core.security import verify_api_key

logger = logging.getLogger(__name__)

router = APIRouter()

class LocationData(BaseModel):
    country: str = Field(..., description="País (ex: BR)")
    state: Optional[str] = Field(None, description="Estado (ex: SP)")
    city: Optional[str] = Field(None, description="Cidade")
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ClassificationRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Valor da transação (deve ser > 0)")
    hour: int = Field(..., ge=0, le=23, description="Hora do dia (0-23)")
    day_of_week: int = Field(default=0, ge=0, le=6, description="Dia da semana (0=segunda, 6=domingo)")
    merchant_category: str = Field(..., description="Categoria do comerciante (ex: online_retail)")
    location: LocationData = Field(..., description="Dados de localização")
    device_info: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    previous_transactions_count: Optional[int] = Field(default=0, ge=0)

class ClassificationDetails(BaseModel):
    legitimate_probability: float
    fraud_probability: float
    risk_level: str

class ClassificationResponse(BaseModel):
    transaction_id: str
    classification: int  # 0 = Não Fraude, 1 = Fraude
    fraud_score: float  # 0.0 - 1.0
    confidence: str  # low, medium, high
    details: ClassificationDetails
    timestamp: str

@router.post(
    "/classify",
    response_model=ClassificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Classificar transação",
    description="Classifica uma transação como Fraude (1) ou Não Fraude (0) usando modelo de ML"
)
async def classify_transaction(
    request: ClassificationRequest,
    api_key: str = Depends(verify_api_key)
):
    """
    Classifica transação como Fraude (1) ou Não Fraude (0)
    
    - **amount**: Valor da transação (deve ser > 0)
    - **hour**: Hora do dia (0-23)
    - **day_of_week**: Dia da semana (0-6)
    - **merchant_category**: Categoria do comerciante
    - **location**: Dados de localização (país, estado, cidade)
    """
    try:
        logger.info(f"Classificando transação: R$ {request.amount:.2f}")
        
        # Preparar dados para o modelo
        transaction_data = {
            'amount': request.amount,
            'hour': request.hour,
            'day_of_week': request.day_of_week,
            'merchant_category': request.merchant_category,
            'location': request.location.dict(),
        }
        
        # Classificar usando modelo ML
        result = model_loader.predict(transaction_data)
        
        # Gerar ID da transação
        transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
        
        logger.info(f"Transação {transaction_id} classificada como: {result['classification']} (score: {result['fraud_score']:.2f})")
        
        # Em produção, aqui persistiria no banco de dados
        # db.add(Transaction(...))
        # db.commit()
        
        # Retornar resposta
        return ClassificationResponse(
            transaction_id=transaction_id,
            classification=result['classification'],
            fraud_score=result['fraud_score'],
            confidence=result['confidence'],
            details=ClassificationDetails(**result['details']),
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    except ValueError as e:
        logger.error(f"Erro de validação: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dados inválidos: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Erro ao classificar transação: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao processar classificação: {str(e)}"
        )

