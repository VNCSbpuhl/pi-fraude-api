"""
Carregador do Modelo de Machine Learning
"""
import joblib
import json
import numpy as np
from pathlib import Path
import os
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class FraudClassifierModel:
    """Classe para carregar e usar o modelo de ML"""
    
    def __init__(self):
        self.model = None
        self.amount_scaler = None
        self.feature_columns = None
        self.is_loaded = False
        
    def load_model(self):
        """Carrega modelo e pré-processadores"""
        try:
            # Determinar caminho base (pode estar em diferentes locais)
            base_paths = [
                Path(__file__).parent.parent.parent.parent / 'ml' / 'models',
                Path(__file__).parent.parent.parent / 'ml' / 'models',
                Path('ml/models'),
                Path('../ml/models')
            ]
            
            model_path = None
            for base_path in base_paths:
                potential_path = base_path / 'fraud_classifier.pkl'
                if potential_path.exists():
                    model_path = potential_path
                    break
            
            if not model_path or not model_path.exists():
                logger.warning("Modelo não encontrado. Criando modelo dummy para desenvolvimento.")
                # Em desenvolvimento, continuar sem modelo real
                return
            
            # Carregar modelo
            self.model = joblib.load(model_path)
            logger.info(f"Modelo carregado de: {model_path}")
            
            # Carregar scaler
            scaler_path = model_path.parent.parent / 'scalers' / 'amount_scaler.pkl'
            if scaler_path.exists():
                self.amount_scaler = joblib.load(scaler_path)
            else:
                logger.warning("Scaler não encontrado. Usando normalização simples.")
                from sklearn.preprocessing import StandardScaler
                self.amount_scaler = StandardScaler()
            
            # Carregar lista de features
            features_path = model_path.parent / 'feature_columns.json'
            if features_path.exists():
                with open(features_path, 'r') as f:
                    self.feature_columns = json.load(f)
            else:
                # Features padrão baseadas no dataset do Kaggle
                self.feature_columns = [
                    f'V{i}' for i in range(1, 29)
                ] + ['Amount_scaled', 'hour_sin', 'hour_cos', 'day_sin', 'day_cos']
            
            self.is_loaded = True
            logger.info("✅ Modelo ML carregado com sucesso")
            
        except Exception as e:
            logger.error(f"❌ Erro ao carregar modelo: {e}")
            # Em desenvolvimento, não falhar se modelo não existir
            if os.getenv("ENVIRONMENT") != "production":
                logger.warning("Continuando sem modelo (modo desenvolvimento)")
            else:
                raise
    
    def preprocess(self, transaction_data: Dict[str, Any]) -> np.ndarray:
        """Pré-processa dados da transação para formato do modelo"""
        amount = transaction_data['amount']
        hour = transaction_data['hour']
        day_of_week = transaction_data.get('day_of_week', 0)
        merchant_category = transaction_data.get('merchant_category', 'online_retail')
        location = transaction_data.get('location', {})
        
        # Normalizar Amount
        try:
            amount_scaled = self.amount_scaler.transform([[amount]])[0, 0]
        except:
            # Fallback: normalização simples
            amount_scaled = np.log1p(amount) / 10.0
        
        # Features temporais cíclicas
        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)
        day_sin = np.sin(2 * np.pi * day_of_week / 7)
        day_cos = np.cos(2 * np.pi * day_of_week / 7)
        
        # Features V1-V28 (heurísticas baseadas em padrões conhecidos)
        v_features = self._generate_v_features(transaction_data)
        
        # Combinar todas as features
        features = np.array([
            *v_features,           # V1-V28 (28 features)
            amount_scaled,         # Amount_scaled
            hour_sin, hour_cos,    # hora_sin, hora_cos
            day_sin, day_cos       # dia_sin, dia_cos
        ])
        
        return features.reshape(1, -1)
    
    def _generate_v_features(self, transaction_data: Dict[str, Any]) -> list:
        """
        Gera features V1-V28 baseado em heurísticas.
        Em produção real, essas features viriam de análise de comportamento.
        """
        amount = transaction_data['amount']
        hour = transaction_data['hour']
        day_of_week = transaction_data.get('day_of_week', 0)
        merchant_category = transaction_data.get('merchant_category', 'online_retail')
        location = transaction_data.get('location', {})
        
        # Heurísticas baseadas em padrões conhecidos de fraude
        features = []
        
        # Features relacionadas a valor
        amount_log = np.log1p(amount)
        features.append(amount_log * 0.1)  # V1
        features.append(amount / 10000)    # V2
        features.append(np.sin(amount / 1000))  # V3
        features.append(np.cos(amount / 1000))  # V4
        
        # Features relacionadas a tempo
        features.append((hour / 24) * 2 - 1)  # V5
        features.append(np.sin(2 * np.pi * hour / 24))  # V6
        features.append(np.cos(2 * np.pi * hour / 24))  # V7
        features.append((day_of_week / 7) * 2 - 1)  # V8
        
        # Features de interação
        features.append(amount_log * (hour / 24))  # V9
        features.append(amount_log * (day_of_week / 7))  # V10
        
        # Features de categoria (encoding simples)
        category_hash = hash(merchant_category) % 1000 / 1000.0
        features.append(category_hash)  # V11
        features.append(category_hash * amount_log)  # V12
        
        # Features de localização (se disponível)
        country_hash = hash(location.get('country', 'BR')) % 1000 / 1000.0
        features.append(country_hash)  # V13
        features.append(country_hash * amount_log)  # V14
        
        # Features adicionais baseadas em padrões (preencher até 28)
        # Em produção, essas viriam de análise estatística real
        np.random.seed(int(amount) % 1000)  # Seed baseado no valor para consistência
        for i in range(15, 29):
            # Gerar features que têm alguma relação com os dados
            feature_value = np.random.normal(0, 0.5) + (amount_log * 0.01)
            features.append(feature_value)
        
        return features
    
    def predict(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classifica transação e retorna resultado
        """
        if not self.is_loaded:
            # Modo dummy para desenvolvimento
            logger.warning("Modelo não carregado. Retornando predição dummy.")
            amount = transaction_data.get('amount', 100)
            hour = transaction_data.get('hour', 12)
            
            # Heurística simples: valores altos ou horários suspeitos = possível fraude
            fraud_score = 0.0
            if amount > 5000:
                fraud_score += 0.3
            if hour < 6 or hour > 22:
                fraud_score += 0.2
            if amount > 10000:
                fraud_score += 0.3
            
            fraud_score = min(fraud_score, 0.95)
            classification = 1 if fraud_score > 0.5 else 0
        else:
            # Pré-processar
            features = self.preprocess(transaction_data)
            
            # Predição
            prediction = self.model.predict(features)[0]
            probabilities = self.model.predict_proba(features)[0]
            
            classification = int(prediction)
            fraud_score = float(probabilities[1])
        
        # Determinar nível de confiança
        if fraud_score > 0.8 or fraud_score < 0.2:
            confidence = 'high'
        elif fraud_score > 0.6 or fraud_score < 0.4:
            confidence = 'medium'
        else:
            confidence = 'low'
        
        # Determinar nível de risco
        if fraud_score >= 0.8:
            risk_level = 'critical'
        elif fraud_score >= 0.6:
            risk_level = 'high'
        elif fraud_score >= 0.4:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        return {
            'classification': classification,
            'fraud_score': float(fraud_score),
            'confidence': confidence,
            'details': {
                'legitimate_probability': float(1 - fraud_score),
                'fraud_probability': float(fraud_score),
                'risk_level': risk_level
            }
        }

# Singleton para carregar modelo uma vez
model_loader = FraudClassifierModel()

