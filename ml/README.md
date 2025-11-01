# 🤖 Machine Learning - Sistema de Classificação de Fraude

## Pré-requisitos

- Python 3.9+
- Dataset: Credit Card Fraud Detection (Kaggle)

## Instalação

```bash
pip install -r requirements.txt
```

## Download do Dataset

1. Acesse: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
2. Baixe `creditcard.csv`
3. Coloque em `ml/data/creditcard.csv`

## Treinamento

```bash
python training/train_model.py
```

## Estrutura de Arquivos

```
ml/
├── data/
│   └── creditcard.csv        # Dataset (não incluído no repo)
├── training/
│   └── train_model.py        # Script de treinamento
├── models/
│   ├── fraud_classifier.pkl  # Modelo treinado (gerado)
│   └── feature_columns.json  # Lista de features (gerado)
├── scalers/
│   └── amount_scaler.pkl     # Scaler de Amount (gerado)
└── requirements.txt
```

## Métricas Esperadas

- **Recall (Fraude)**: > 0.90
- **Precision**: > 0.70
- **F1-Score**: > 0.80
- **ROC-AUC**: > 0.95

