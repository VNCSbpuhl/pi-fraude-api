import pandas as pd
import joblib
import json
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from fastapi.middleware.cors import CORSMiddleware  # <-- 1. IMPORTAÇÃO NOVA

# 1. Inicializa o aplicativo FastAPI
app = FastAPI(
    title="API de Detecção de Fraude",
    description="Uma API para prever transações fraudulentas usando um modelo Random Forest.",
    version="1.0"
)

# ==================================================================
# 2. HABILITAR O CORS (BLOCO NOVO)
# Isso diz à API para aceitar requisições de qualquer origem ("*")
# ==================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todas as origens (inseguro para produção, perfeito para demo)
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos os métodos (POST, GET, etc.)
    allow_headers=["*"],  # Permite todos os cabeçalhos
)
# ==================================================================


# 3. Carrega os artefatos salvos (modelo, scaler, colunas)
try:
    model = joblib.load('models/fraud_classifier.pkl')
    scaler = joblib.load('scalers/amount_scaler.pkl')
    
    with open('models/feature_columns.json', 'r') as f:
        feature_columns = json.load(f)
    
    print("Modelo, Scaler e Colunas carregados com sucesso.")
except FileNotFoundError as e:
    print(f"Erro ao carregar arquivos: {e}")
    model = None
    scaler = None
    feature_columns = []


# 4. Define a estrutura de dados de entrada (Request Body)
class Transaction(BaseModel):
    Time: float
    V1: float
    V2: float
    V3: float
    V4: float
    V5: float
    V6: float
    V7: float
    V8: float
    V9: float
    V10: float
    V11: float
    V12: float
    V13: float
    V14: float
    V15: float
    V16: float
    V17: float
    V18: float
    V19: float
    V20: float
    V21: float
    V22: float
    V23: float
    V24: float
    V25: float
    V26: float
    V27: float
    V28: float
    Amount: float

    # Configuração de exemplo para a documentação automática
    class Config:
        schema_extra = {
            "example": {
                "Time": 86520.0, "V1": -1.86, "V2": -0.63, "V3": 1.43, "V4": -1.41,
                "V5": -0.36, "V6": -0.35, "V7": -0.44, "V8": 0.44, "V9": -0.83,
                "V10": -0.23, "V11": -1.13, "V12": -0.17, "V13": -1.33, "V14": -0.21,
                "V15": 0.17, "V16": -0.19, "V17": 0.13, "V18": -0.06, "V19": -0.07,
                "V20": 0.25, "V21": 0.22, "V22": 0.61, "V23": 0.19, "V24": 0.01,
                "V25": -0.16, "V26": 0.15, "V27": 0.06, "V28": -0.03, "Amount": 75.00
            }
        }

# 5. Define o endpoint de predição
@app.post("/predict")
def predict_fraud(transaction: Transaction):
    """
    Recebe os dados de uma transação e retorna a predição de fraude.
    - **Retorno:** `{"prediction": 0}` (Legítimo) ou `{"prediction": 1}` (Fraude).
    """
    if not model or not scaler or not feature_columns:
        return {"error": "Modelo não carregado. Verifique os logs do servidor."}

    # 5.1. Converte os dados de entrada Pydantic para um DataFrame do Pandas
    input_data = pd.DataFrame([transaction.dict()])

    # 5.2. **Aplicar o MESMO pré-processamento do treinamento**
    try:
        
        time_seconds = input_data['Time'].values[0]
        
        hour = (time_seconds // 3600) % 24
        input_data['hour_sin'] = np.sin(2 * np.pi * hour / 23.0) 
        input_data['hour_cos'] = np.cos(2 * np.pi * hour / 23.0) 
        
        day_of_week = (time_seconds // 86400) % 7 
        input_data['day_sin'] = np.sin(2 * np.pi * day_of_week / 6.0) 
        input_data['day_cos'] = np.cos(2 * np.pi * day_of_week / 6.0) 
        
        input_data['Amount_scaled'] = scaler.transform(input_data[['Amount']])
        
        final_input_data = input_data[feature_columns]

    except KeyError as e:
        return {"error": f"Erro de pré-processamento (KeyError): {e}."}
    except Exception as e:
        return {"error": f"Erro no pré-processamento: {e}"}

    # 5.3. Fazer a predição
    try:
        # Workaround para incompatibilidade de versão do scikit-learn
        # Versões novas do scikit-learn tentam acessar monotonic_cst que não existe em modelos antigos
        # Adiciona o atributo se não existir (compatibilidade com versões antigas)
        if hasattr(model, 'estimators_'):
            for estimator in model.estimators_:
                if hasattr(estimator, 'tree_'):
                    tree = estimator.tree_
                    # Adiciona monotonic_cst se não existir (para compatibilidade com versões novas)
                    if not hasattr(tree, 'monotonic_cst'):
                        # Cria um array vazio do tipo correto para compatibilidade
                        try:
                            # Cria um array de zeros com o número de features
                            tree.monotonic_cst = np.array([0] * tree.n_features, dtype=np.int32)
                        except:
                            pass
        
        prediction = model.predict(final_input_data)
        prediction_proba = model.predict_proba(final_input_data) 
        
        result = int(prediction[0])
        probability_fraud = float(prediction_proba[0][1]) # Probabilidade de ser classe 1 (Fraude)

        return {
            "prediction": result,
            "prediction_label": "Fraude" if result == 1 else "Legítimo",
            "probability_fraud": probability_fraud
        }
    except AttributeError as e:
        # Erro específico de incompatibilidade de versão
        error_msg = str(e)
        if 'monotonic_cst' in error_msg:
            return {
                "error": "Erro de compatibilidade do modelo. O modelo foi treinado com scikit-learn 1.3.2, mas o servidor está usando uma versão diferente. Por favor, reinstale as dependências com: pip install scikit-learn==1.3.2"
            }
        return {"error": f"Erro na predição (AttributeError): {error_msg}"}
    except Exception as e:
        return {"error": f"Erro na predição: {str(e)}"}

# Ponto de "boas-vindas" para testar se a API está no ar
@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API de Detecção de Fraude!"}