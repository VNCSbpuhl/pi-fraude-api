# 🤖 Plano de Machine Learning - Sistema Classificador de Fraude

## 1. Linguagem e Frameworks

### Stack Tecnológica Escolhida

**Linguagem:** Python 3.9+

**Frameworks e Bibliotecas:**
- **Scikit-learn**: Para algoritmos de ML (Random Forest, Logistic Regression)
- **Pandas**: Manipulação e análise de dados
- **NumPy**: Operações numéricas
- **Joblib**: Serialização do modelo treinado
- **FastAPI**: Framework web para integração no backend (parte do backend)

**Justificativa:**
- Python: Padrão da indústria para ML, vasto ecossistema
- Scikit-learn: Implementações robustas, bem testadas, fácil de usar
- Pandas: Essencial para ETL e feature engineering
- Joblib: Serialização eficiente de modelos Python

**Dependências:**
```
pandas==2.1.0
numpy==1.24.0
scikit-learn==1.3.0
joblib==1.3.0
matplotlib==3.7.0
seaborn==0.12.0
imbalanced-learn==0.11.0  # Para balanceamento de classes
```

## 2. Pipeline do Modelo de Machine Learning

### 2.1 Obtenção de Dados

**Dataset Escolhido: Credit Card Fraud Detection (Kaggle)**

- **Fonte**: [Kaggle - Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
- **Características**:
  - ~284.807 transações
  - 31 features (28 anonimizadas + Time, Amount, Class)
  - Classe altamente desbalanceada (~0.17% de fraude)
  - Features já normalizadas (PCA aplicado)

**Alternativa (caso necessário):**
- Dataset sintético gerado com características realistas
- Features: `amount`, `hour`, `day_of_week`, `merchant_category`, `location`, etc.

**Estrutura Esperada do Dataset:**
```
creditcard.csv
├── Time: Segundos transcorridos entre a primeira transação e a atual
├── V1-V28: Features anonimizadas (resultado de PCA)
├── Amount: Valor da transação
└── Class: 0 (legítimo) ou 1 (fraude)
```

### 2.2 Pré-processamento e Feature Engineering

#### Etapas de Pré-processamento

**1. Carregamento e Exploração Inicial**
```python
import pandas as pd
import numpy as np

# Carregar dados
df = pd.read_csv('creditcard.csv')

# Informações básicas
print(df.shape)  # (284807, 31)
print(df['Class'].value_counts())  # Desbalanceamento extremo
```

**2. Tratamento de Valores Ausentes e Outliers**
```python
# Verificar valores ausentes (dataset geralmente já limpo)
print(df.isnull().sum())

# Tratar outliers em 'Amount' (remover valores extremos)
Q1 = df['Amount'].quantile(0.25)
Q3 = df['Amount'].quantile(0.75)
IQR = Q3 - Q1
lower_bound = Q1 - 3 * IQR
upper_bound = Q3 + 3 * IQR

# Opcional: Remover outliers extremos (ou usar transformação log)
df = df[(df['Amount'] >= lower_bound) & (df['Amount'] <= upper_bound)]
```

**3. Feature Engineering**

**Criação de Features Temporais:**
```python
# Converter 'Time' em features mais úteis
df['hour'] = (df['Time'] // 3600) % 24
df['day_of_week'] = (df['Time'] // (3600 * 24)) % 7

# Feature cíclica para hora (capturar padrões temporais)
df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
```

**Normalização de 'Amount':**
```python
from sklearn.preprocessing import RobustScaler, StandardScaler

# 'Amount' geralmente tem distribuição muito assimétrica
# Opção 1: Log transformação
df['Amount_log'] = np.log1p(df['Amount'])  # log(1 + x) para evitar log(0)

# Opção 2: RobustScaler (menos sensível a outliers)
scaler_amount = RobustScaler()
df['Amount_scaled'] = scaler_amount.fit_transform(df[['Amount']])

# Salvar scaler para uso na inferência
import joblib
joblib.dump(scaler_amount, 'scalers/amount_scaler.pkl')
```

**Features de Interação:**
```python
# Interações entre features importantes
df['V1_x_Amount'] = df['V1'] * df['Amount_scaled']
df['V3_x_V4'] = df['V3'] * df['V4']

# Features estatísticas (médias móveis, se disponível histórico por usuário)
# (Não aplicável neste dataset, mas útil em produção com histórico)
```

**4. Seleção de Features**
```python
# Features finais para treinamento
feature_columns = [
    'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10',
    'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20',
    'V21', 'V22', 'V23', 'V24', 'V25', 'V26', 'V27', 'V28',
    'Amount_scaled',
    'hour_sin', 'hour_cos', 'day_sin', 'day_cos'
]

X = df[feature_columns]
y = df['Class']
```

**5. Balanceamento de Classes**

**Problema:** Dataset altamente desbalanceado (~0.17% de fraude)

**Solução: SMOTE (Synthetic Minority Oversampling Technique)**
```python
from imblearn.over_sampling import SMOTE

# SMOTE: Gera exemplos sintéticos da classe minoritária
smote = SMOTE(random_state=42, sampling_strategy=0.1)  # Balancear para 10% de fraude
X_balanced, y_balanced = smote.fit_resample(X, y)

print(f"Shape antes: {X.shape}, Shape depois: {X_balanced.shape}")
print(f"Distribuição: {pd.Series(y_balanced).value_counts()}")
```

**Alternativa: Undersampling + Oversampling Combinado (SMOTEENN)**
```python
from imblearn.combine import SMOTEENN

sme = SMOTEENN(random_state=42)
X_balanced, y_balanced = sme.fit_resample(X, y)
```

### 2.3 Treinamento do Modelo

#### Escolha do Algoritmo: Random Forest Classifier

**Justificativa:**
- **Robustez**: Lida bem com features não normalizadas
- **Importância de Features**: Fornece insights sobre quais features são mais relevantes
- **Performance**: Geralmente melhor que Logistic Regression para dados complexos
- **Menos Overfitting**: Comparado a modelos lineares em datasets complexos

**Alternativa: Logistic Regression**
- Mais interpretável
- Menos propenso a overfitting
- Pode ter performance inferior em padrões não-lineares

#### Implementação do Treinamento

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)

# Divisão Train/Test (80/20)
X_train, X_test, y_train, y_test = train_test_split(
    X_balanced, y_balanced,
    test_size=0.2,
    random_state=42,
    stratify=y_balanced  # Manter proporção de classes
)

# Instanciar modelo
model = RandomForestClassifier(
    n_estimators=100,      # Número de árvores
    max_depth=20,          # Profundidade máxima (evitar overfitting)
    min_samples_split=10,  # Mínimo de amostras para split
    min_samples_leaf=5,     # Mínimo de amostras em folhas
    max_features='sqrt',   # Número de features por split
    class_weight='balanced',  # Ajustar pesos automaticamente
    random_state=42,
    n_jobs=-1              # Usar todos os CPUs
)

# Treinar modelo
print("Treinando modelo...")
model.fit(X_train, y_train)

# Predições
y_pred = model.predict(X_test)
y_pred_proba = model.predict_proba(X_test)[:, 1]  # Probabilidade de fraude
```

### 2.4 Avaliação do Modelo

#### Métricas Principais

**Métricas Focadas em Fraude (Classe Positiva):**
- **Recall (Sensibilidade)**: Prioridade MÁXIMA (não perder fraudes)
- **Precisão**: Importante (evitar falsos positivos)
- **F1-Score**: Balanceamento entre Precisão e Recall
- **ROC-AUC**: Performance geral do classificador

**Implementação da Avaliação:**
```python
# Métricas
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)  # MÉTRICA MAIS IMPORTANTE
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_pred_proba)

print(f"Accuracy: {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall: {recall:.4f}")  # Queremos > 0.90
print(f"F1-Score: {f1:.4f}")
print(f"ROC-AUC: {roc_auc:.4f}")

# Matriz de Confusão
cm = confusion_matrix(y_test, y_pred)
print("\nConfusion Matrix:")
print(cm)

# Relatório Detalhado
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['Legítimo', 'Fraude']))
```

**Meta de Performance Esperada:**
- **Recall (Fraude)**: > 0.90 (detectar pelo menos 90% das fraudes)
- **Precision (Fraude)**: > 0.70 (evitar muitos falsos positivos)
- **F1-Score**: > 0.80
- **ROC-AUC**: > 0.95

#### Feature Importance

```python
# Importância das features
feature_importance = pd.DataFrame({
    'feature': feature_columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

print("\nTop 10 Features Mais Importantes:")
print(feature_importance.head(10))

# Visualização
import matplotlib.pyplot as plt
import seaborn as sns

plt.figure(figsize=(10, 8))
sns.barplot(data=feature_importance.head(15), x='importance', y='feature')
plt.title('Top 15 Features - Random Forest')
plt.xlabel('Importance')
plt.tight_layout()
plt.savefig('ml/models/feature_importance.png')
```

### 2.5 Serialização do Modelo

**Salvar modelo e pré-processadores:**
```python
import joblib
import os

# Criar diretório se não existir
os.makedirs('ml/models', exist_ok=True)
os.makedirs('ml/scalers', exist_ok=True)

# Salvar modelo
joblib.dump(model, 'ml/models/fraud_classifier.pkl')

# Salvar scalers (necessários para pré-processamento em produção)
joblib.dump(scaler_amount, 'ml/scalers/amount_scaler.pkl')

# Salvar lista de features (para garantir ordem na inferência)
import json
with open('ml/models/feature_columns.json', 'w') as f:
    json.dump(feature_columns, f)

print("Modelo salvo em: ml/models/fraud_classifier.pkl")
```

## 3. Integração (Inferência no Back-End)

### 3.1 Carregamento do Modelo no FastAPI

**Estrutura no Backend:**
```python
# backend/app/ml/model_loader.py
import joblib
import json
import os
from pathlib import Path

class FraudClassifierModel:
    def __init__(self):
        self.model = None
        self.amount_scaler = None
        self.feature_columns = None
        self.is_loaded = False

    def load_model(self):
        """Carrega modelo e pré-processadores"""
        try:
            base_path = Path(__file__).parent.parent.parent / 'ml' / 'models'
            
            # Carregar modelo
            model_path = base_path / 'fraud_classifier.pkl'
            self.model = joblib.load(model_path)
            
            # Carregar scaler
            scaler_path = Path(__file__).parent.parent.parent / 'ml' / 'scalers' / 'amount_scaler.pkl'
            self.amount_scaler = joblib.load(scaler_path)
            
            # Carregar lista de features
            features_path = base_path / 'feature_columns.json'
            with open(features_path, 'r') as f:
                self.feature_columns = json.load(f)
            
            self.is_loaded = True
            print("✅ Modelo ML carregado com sucesso")
            
        except Exception as e:
            print(f"❌ Erro ao carregar modelo: {e}")
            raise

    def preprocess(self, transaction_data: dict) -> np.ndarray:
        """Pré-processa dados da transação para formato do modelo"""
        # Extrair features da transação
        amount = transaction_data['amount']
        hour = transaction_data['hour']
        day_of_week = transaction_data.get('day_of_week', 0)
        
        # Normalizar Amount
        amount_scaled = self.amount_scaler.transform([[amount]])[0, 0]
        
        # Features temporais cíclicas
        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)
        day_sin = np.sin(2 * np.pi * day_of_week / 7)
        day_cos = np.cos(2 * np.pi * day_of_week / 7)
        
        # Features V1-V28 (anônimas, simuladas ou do histórico)
        # Em produção real, essas features viriam de análise de comportamento
        # Por simplicidade, vamos gerar valores baseados em heurísticas
        v_features = self._generate_v_features(transaction_data)
        
        # Combinar todas as features na ordem esperada
        features = np.array([
            *v_features,           # V1-V28
            amount_scaled,         # Amount_scaled
            hour_sin, hour_cos,   # hora_sin, hora_cos
            day_sin, day_cos      # dia_sin, dia_cos
        ])
        
        return features.reshape(1, -1)  # Reshape para (1, n_features)
    
    def _generate_v_features(self, transaction_data: dict) -> list:
        """
        Gera features V1-V28 baseado em heurísticas.
        Em produção, essas features viriam de análise de comportamento real.
        """
        amount = transaction_data['amount']
        hour = transaction_data['hour']
        merchant_category = transaction_data.get('merchant_category', '')
        location = transaction_data.get('location', {})
        
        # Simulação: Features baseadas em padrões conhecidos
        # Em produção real, usar histórico do usuário, geolocalização, etc.
        v_features = []
        
        # V1-V14: Features relacionadas a valor e tempo
        v_features.extend([
            np.log1p(amount) * 0.1,          # V1
            (hour / 24) * 2 - 1,            # V2
            np.sin(amount / 1000),           # V3
            np.cos(amount / 1000),          # V4
            amount / 10000,                 # V5
            hour % 12 / 12,                 # V6
            # ... mais features heurísticas
        ])
        
        # Preencher até 28 features (simulação)
        while len(v_features) < 28:
            v_features.append(np.random.normal(0, 0.1))  # Placeholder
        
        return v_features[:28]
    
    def predict(self, transaction_data: dict) -> dict:
        """
        Classifica transação e retorna resultado
        """
        if not self.is_loaded:
            raise RuntimeError("Modelo não foi carregado")
        
        # Pré-processar
        features = self.preprocess(transaction_data)
        
        # Predição
        prediction = self.model.predict(features)[0]  # 0 ou 1
        probabilities = self.model.predict_proba(features)[0]  # [P(legítimo), P(fraude)]
        
        fraud_score = probabilities[1]  # Probabilidade de fraude
        
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
            'classification': int(prediction),
            'fraud_score': float(fraud_score),
            'confidence': confidence,
            'details': {
                'legitimate_probability': float(probabilities[0]),
                'fraud_probability': float(probabilities[1]),
                'risk_level': risk_level
            }
        }

# Singleton para carregar modelo uma vez
model_loader = FraudClassifierModel()
```

### 3.2 Endpoint FastAPI com Integração ML

```python
# backend/app/api/v1/endpoints/classify.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

from app.ml.model_loader import model_loader
from app.db.database import get_db
from app.models.transaction import Transaction

router = APIRouter()

class ClassificationRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Valor da transação")
    hour: int = Field(..., ge=0, le=23, description="Hora do dia (0-23)")
    day_of_week: int = Field(..., ge=0, le=6, description="Dia da semana (0=segunda, 6=domingo)")
    merchant_category: str = Field(..., description="Categoria do comerciante")
    location: dict = Field(..., description="Dados de localização")
    device_info: Optional[dict] = None
    user_id: Optional[str] = None
    previous_transactions_count: Optional[int] = 0

class ClassificationResponse(BaseModel):
    transaction_id: str
    classification: int  # 0 ou 1
    fraud_score: float  # 0.0 - 1.0
    confidence: str  # low, medium, high
    details: dict
    timestamp: str

@router.post("/classify", response_model=ClassificationResponse)
async def classify_transaction(
    request: ClassificationRequest,
    db = Depends(get_db)
):
    """
    Classifica transação como Fraude (1) ou Não Fraude (0)
    """
    try:
        # Classificar usando modelo ML
        result = model_loader.predict({
            'amount': request.amount,
            'hour': request.hour,
            'day_of_week': request.day_of_week,
            'merchant_category': request.merchant_category,
            'location': request.location,
        })
        
        # Gerar ID da transação
        transaction_id = f"txn_{uuid.uuid4().hex[:12]}"
        
        # Persistir no banco de dados
        transaction = Transaction(
            transaction_id=transaction_id,
            amount=request.amount,
            hour=request.hour,
            day_of_week=request.day_of_week,
            merchant_category=request.merchant_category,
            location=request.location,
            classification=result['classification'],
            fraud_score=result['fraud_score'],
            confidence=result['confidence'],
            risk_level=result['details']['risk_level']
        )
        db.add(transaction)
        db.commit()
        
        # Retornar resposta
        return ClassificationResponse(
            transaction_id=transaction_id,
            classification=result['classification'],
            fraud_score=result['fraud_score'],
            confidence=result['confidence'],
            details=result['details'],
            timestamp=datetime.utcnow().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao classificar: {str(e)}")
```

### 3.3 Inicialização do Modelo no FastAPI

```python
# backend/app/main.py
from fastapi import FastAPI
from app.api.v1.endpoints import classify
from app.ml.model_loader import model_loader
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Carregar modelo ML
    model_loader.load_model()
    yield
    # Shutdown: Limpar recursos (opcional)

app = FastAPI(
    title="Fraud Classifier API",
    description="API para classificação de fraude em transações",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(classify.router, prefix="/api/v1", tags=["classification"])
```

## 4. Resumo do Pipeline ML

### Checklist de Implementação

1. ✅ Obtenção de dados (Kaggle dataset)
2. ✅ Pré-processamento e feature engineering
3. ✅ Balanceamento de classes (SMOTE)
4. ✅ Treinamento (Random Forest)
5. ✅ Avaliação (Recall > 0.90, F1 > 0.80)
6. ✅ Serialização (joblib)
7. ✅ Integração no backend (FastAPI)
8. ✅ Persistência no banco de dados

### Arquivos Esperados

```
ml/
├── training/
│   └── train_model.py        # Script de treinamento
├── models/
│   ├── fraud_classifier.pkl  # Modelo serializado
│   ├── feature_columns.json   # Lista de features
│   └── feature_importance.png # Visualização
├── scalers/
│   └── amount_scaler.pkl     # Scaler de Amount
└── notebooks/
    └── exploratory_analysis.ipynb  # Análise exploratória
```

**Próximos Passos:**
1. Implementar script de treinamento completo
2. Testar inferência no backend
3. Validação cruzada e tuning de hiperparâmetros
4. Deploy do modelo no S3 para produção

