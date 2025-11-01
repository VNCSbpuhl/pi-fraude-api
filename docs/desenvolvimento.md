# 🛠️ Guia de Desenvolvimento

## Pré-requisitos

- Python 3.9+
- Node.js 18+
- Docker (opcional)
- PostgreSQL (para desenvolvimento local)
- Git

## Configuração do Ambiente

### Backend

1. **Instalar dependências:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
# Editar .env com suas configurações
```

3. **Executar servidor:**
```bash
uvicorn app.main:app --reload
```

A API estará disponível em: `http://localhost:8000`

### Mobile

1. **Instalar dependências:**
```bash
cd mobile
npm install
```

2. **Configurar variáveis de ambiente:**
Criar arquivo `.env`:
```
API_BASE_URL=http://localhost:8000
API_KEY=your-api-key-here
```

3. **Executar aplicativo:**
```bash
npm start
```

### ML Model

1. **Baixar dataset:**
- Acessar: https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud
- Baixar `creditcard.csv`
- Colocar em `ml/data/creditcard.csv`

2. **Instalar dependências:**
```bash
cd ml
pip install -r requirements.txt
```

3. **Treinar modelo:**
```bash
python training/train_model.py
```

O modelo será salvo em `ml/models/fraud_classifier.pkl`

## Estrutura do Projeto

```
PiFraude/
├── backend/           # API FastAPI
├── mobile/            # App React Native
├── ml/                # Pipeline ML
├── infrastructure/    # Scripts Terraform/CloudFormation
├── docs/              # Documentação
└── .github/           # GitHub Actions CI/CD
```

## Testes

### Backend
```bash
cd backend
pytest tests/ -v
```

### Mobile
```bash
cd mobile
npm test
```

## Commits

Seguir padrão Conventional Commits:

```
feat: adiciona endpoint de classificação
fix: corrige validação de amount
docs: atualiza documentação da API
test: adiciona testes para model_loader
```

## Deploy

### Desenvolvimento
```bash
# Backend local
cd backend
uvicorn app.main:app --reload

# Mobile
cd mobile
npm start
```

### Produção (AWS)

1. **Infraestrutura:**
```bash
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

2. **Backend:**
- Push para `main` branch
- GitHub Actions faz deploy automático para ECS

## Metodologia Ágil

- **Sprints:** 2 semanas
- **Reuniões:** Daily standup, Sprint planning, Retrospectiva
- **Ferramentas:** GitHub Issues, Projects

