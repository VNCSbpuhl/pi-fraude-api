"""
Script de Treinamento do Modelo de Classificação de Fraude
"""
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, classification_report
)
from sklearn.preprocessing import RobustScaler
from imblearn.over_sampling import SMOTE
import joblib
import json
import os
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_data(filepath: str = 'data/creditcard.csv'):
    """Carrega dataset de transações"""
    logger.info(f"Carregando dados de: {filepath}")
    df = pd.read_csv(filepath)
    logger.info(f"Dataset carregado: {df.shape[0]} transações, {df.shape[1]} features")
    return df

def preprocess_data(df: pd.DataFrame):
    """Pré-processa dados e cria features"""
    logger.info("Pré-processando dados...")
    
    # Converter Time em features temporais
    df['hour'] = (df['Time'] // 3600) % 24
    df['day_of_week'] = (df['Time'] // (3600 * 24)) % 7
    
    # Features cíclicas para hora
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
    
    # Normalizar Amount usando RobustScaler
    scaler = RobustScaler()
    df['Amount_scaled'] = scaler.fit_transform(df[['Amount']])
    
    # Selecionar features
    feature_columns = [
        'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10',
        'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17', 'V18', 'V19', 'V20',
        'V21', 'V22', 'V23', 'V24', 'V25', 'V26', 'V27', 'V28',
        'Amount_scaled',
        'hour_sin', 'hour_cos', 'day_sin', 'day_cos'
    ]
    
    X = df[feature_columns]
    y = df['Class']
    
    logger.info(f"Distribuição de classes: {y.value_counts().to_dict()}")
    
    return X, y, scaler, feature_columns

def balance_classes(X, y):
    """Balanceia classes usando SMOTE"""
    logger.info("Balanceando classes com SMOTE...")
    
    smote = SMOTE(random_state=42, sampling_strategy=0.1)
    X_balanced, y_balanced = smote.fit_resample(X, y)
    
    logger.info(f"Após balanceamento: {pd.Series(y_balanced).value_counts().to_dict()}")
    
    return X_balanced, y_balanced

def train_model(X_train, y_train):
    """Treina o modelo Random Forest"""
    logger.info("Treinando modelo Random Forest...")
    
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,
        min_samples_split=10,
        min_samples_leaf=5,
        max_features='sqrt',
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    logger.info("Modelo treinado com sucesso")
    
    return model

def evaluate_model(model, X_test, y_test):
    """Avalia o modelo"""
    logger.info("Avaliando modelo...")
    
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    
    logger.info(f"Accuracy: {accuracy:.4f}")
    logger.info(f"Precision: {precision:.4f}")
    logger.info(f"Recall: {recall:.4f}")
    logger.info(f"F1-Score: {f1:.4f}")
    logger.info(f"ROC-AUC: {roc_auc:.4f}")
    
    logger.info("\nMatriz de Confusão:")
    logger.info(confusion_matrix(y_test, y_pred))
    
    logger.info("\nClassification Report:")
    logger.info(classification_report(y_test, y_pred, target_names=['Legítimo', 'Fraude']))
    
    return {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'roc_auc': roc_auc
    }

def save_model(model, scaler, feature_columns, base_path='models'):
    """Salva modelo e artefatos"""
    logger.info(f"Salvando modelo em: {base_path}")
    
    # Criar diretórios
    Path(base_path).mkdir(parents=True, exist_ok=True)
    Path('scalers').mkdir(parents=True, exist_ok=True)
    
    # Salvar modelo
    model_path = Path(base_path) / 'fraud_classifier.pkl'
    joblib.dump(model, model_path)
    logger.info(f"Modelo salvo: {model_path}")
    
    # Salvar scaler
    scaler_path = Path('scalers') / 'amount_scaler.pkl'
    joblib.dump(scaler, scaler_path)
    logger.info(f"Scaler salvo: {scaler_path}")
    
    # Salvar lista de features
    features_path = Path(base_path) / 'feature_columns.json'
    with open(features_path, 'w') as f:
        json.dump(feature_columns, f, indent=2)
    logger.info(f"Features salvas: {features_path}")

def main():
    """Pipeline principal de treinamento"""
    logger.info("=" * 50)
    logger.info("Iniciando treinamento do modelo de fraude")
    logger.info("=" * 50)
    
    try:
        # 1. Carregar dados
        df = load_data('data/creditcard.csv')
        
        # 2. Pré-processar
        X, y, scaler, feature_columns = preprocess_data(df)
        
        # 3. Balancear classes
        X_balanced, y_balanced = balance_classes(X, y)
        
        # 4. Split train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X_balanced, y_balanced,
            test_size=0.2,
            random_state=42,
            stratify=y_balanced
        )
        
        # 5. Treinar modelo
        model = train_model(X_train, y_train)
        
        # 6. Avaliar
        metrics = evaluate_model(model, X_test, y_test)
        
        # 7. Salvar
        save_model(model, scaler, feature_columns)
        
        logger.info("=" * 50)
        logger.info("Treinamento concluído com sucesso!")
        logger.info("=" * 50)
        
        return model, metrics
        
    except FileNotFoundError as e:
        logger.error(f"Arquivo não encontrado: {e}")
        logger.error("Certifique-se de que o dataset está em data/creditcard.csv")
        logger.error("Download: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud")
        raise
    except Exception as e:
        logger.error(f"Erro durante treinamento: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    main()

