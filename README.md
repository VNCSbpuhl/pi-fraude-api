# 🏦 Sistema Classificador de Fraude em Transações Financeiras

## 📋 Visão Geral

Sistema completo de ponta-a-ponta para classificação de fraude em transações financeiras, composto por:
- **Front-End Mobile**: Aplicativo React Native para simulação e visualização de transações
- **Back-End RESTful**: API FastAPI com integração de modelo de Machine Learning
- **Modelo ML**: Classificador binário (Fraude/Não Fraude) usando Random Forest
- **Banco de Dados**: PostgreSQL hospedado em nuvem (AWS RDS)

## 🏗️ Arquitetura

### Componentes Principais

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │ HTTPS/REST
         ▼
┌─────────────────┐
│  API Gateway    │
│  (AWS)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Backend        │◄────►│  ML Model    │
│  (FastAPI)      │      │  (.pkl)      │
│  (AWS Lambda/   │      │  (local)     │
│   ECS Fargate)  │      └──────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  (AWS RDS)      │
│  (VPC Privada)  │
└─────────────────┘
```

## 📁 Estrutura do Projeto

```
PiFraude/
├── backend/              # API RESTful FastAPI
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   └── ml/
│   ├── tests/
│   └── requirements.txt
├── mobile/               # App React Native
│   ├── src/
│   │   ├── screens/
│   │   ├── services/
│   │   └── components/
│   └── package.json
├── ml/                   # Pipeline de Machine Learning
│   ├── training/
│   ├── models/
│   └── notebooks/
├── infrastructure/       # Scripts de infraestrutura
│   ├── terraform/
│   └── cloudformation/
├── docs/                 # Documentação
│   ├── arquitetura.md
│   └── api.md
└── .github/
    └── workflows/       # CI/CD
```

## 🚀 Início Rápido

### Pré-requisitos
- Python 3.9+
- Node.js 18+
- Docker (opcional)
- Conta AWS/Azure/GCP

### Instalação Local

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Mobile
```bash
cd mobile
npm install
npm start
```

#### ML Model Training
```bash
cd ml
python training/train_model.py
```

## 📚 Documentação Completa

- [Arquitetura de Nuvem](./docs/arquitetura.md)
- [Documentação da API](./docs/api.md)
- [Guia de Desenvolvimento](./docs/desenvolvimento.md)

## 🔒 Segurança

- Banco de dados em VPC privada
- Autenticação via API Keys
- Criptografia em trânsito (HTTPS/TLS)
- Criptografia em repouso (RDS)

## 📊 Métricas e Monitoramento

- CloudWatch Logs
- API Gateway Metrics
- RDS Performance Insights

## 🤝 Contribuindo

Este projeto segue metodologia Ágil (Scrum). Todos os commits devem seguir padrões convencionais.

## 📄 Licença

MIT License

