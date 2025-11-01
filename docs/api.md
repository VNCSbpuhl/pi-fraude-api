# 📚 Documentação da API - Sistema Classificador de Fraude

## Visão Geral

API RESTful para classificação de fraude em transações financeiras usando Machine Learning.

**Base URL:** `https://api.fraude-classifier.com/api/v1` (produção)  
**Base URL:** `http://localhost:8000/api/v1` (desenvolvimento)

## Autenticação

A API utiliza API Keys para autenticação. Inclua o header `X-API-Key` em todas as requisições:

```
X-API-Key: sk_live_xxxxxxxxxxxxxxxxx
```

### Obter API Key

Entre em contato com o administrador do sistema para obter uma API Key válida.

## Endpoints

### 1. Health Check

Verifica o status da API e se o modelo ML está carregado.

**Endpoint:** `GET /health`

**Resposta (200 OK):**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

---

### 2. Classificar Transação

Classifica uma transação como Fraude (1) ou Não Fraude (0) usando modelo de Machine Learning.

**Endpoint:** `POST /api/v1/classify`

**Headers:**
```
Content-Type: application/json
X-API-Key: sk_live_xxxxxxxxxxxxxxxxx
```

**Request Body:**
```json
{
  "amount": 1500.50,
  "hour": 14,
  "day_of_week": 1,
  "merchant_category": "online_retail",
  "location": {
    "country": "BR",
    "state": "SP",
    "city": "São Paulo",
    "latitude": -23.5505,
    "longitude": -46.6333
  },
  "device_info": {
    "device_type": "mobile",
    "ip_address": "192.168.1.1"
  },
  "user_id": "user_123",
  "previous_transactions_count": 15
}
```

**Parâmetros:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `amount` | number | ✅ | Valor da transação (deve ser > 0) |
| `hour` | integer | ✅ | Hora do dia (0-23) |
| `day_of_week` | integer | ❌ | Dia da semana (0=segunda, 6=domingo). Padrão: 0 |
| `merchant_category` | string | ✅ | Categoria do comerciante (ex: "online_retail", "physical_store") |
| `location` | object | ✅ | Dados de localização |
| `location.country` | string | ✅ | Código do país (ex: "BR") |
| `location.state` | string | ❌ | Estado (ex: "SP") |
| `location.city` | string | ❌ | Cidade |
| `location.latitude` | number | ❌ | Latitude |
| `location.longitude` | number | ❌ | Longitude |
| `device_info` | object | ❌ | Informações do dispositivo |
| `user_id` | string | ❌ | ID do usuário |
| `previous_transactions_count` | integer | ❌ | Número de transações anteriores. Padrão: 0 |

**Resposta (200 OK):**
```json
{
  "transaction_id": "txn_a1b2c3d4e5f6",
  "classification": 1,
  "fraud_score": 0.87,
  "confidence": "high",
  "details": {
    "legitimate_probability": 0.13,
    "fraud_probability": 0.87,
    "risk_level": "critical"
  },
  "timestamp": "2024-01-15T10:30:45Z"
}
```

**Campos da Resposta:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `transaction_id` | string | ID único da transação |
| `classification` | integer | `0` = Não Fraude, `1` = Fraude |
| `fraud_score` | number | Score de fraude (0.0 - 1.0). Quanto maior, maior a probabilidade de fraude |
| `confidence` | string | Nível de confiança: `"low"`, `"medium"`, `"high"` |
| `details.legitimate_probability` | number | Probabilidade de ser legítima (0.0 - 1.0) |
| `details.fraud_probability` | number | Probabilidade de ser fraude (0.0 - 1.0) |
| `details.risk_level` | string | Nível de risco: `"low"`, `"medium"`, `"high"`, `"critical"` |
| `timestamp` | string | Timestamp ISO 8601 da classificação |

**Resposta de Erro (400 Bad Request):**
```json
{
  "detail": "Dados inválidos: amount deve ser maior que zero"
}
```

**Resposta de Erro (401 Unauthorized):**
```json
{
  "detail": "API key inválida ou ausente"
}
```

**Resposta de Erro (500 Internal Server Error):**
```json
{
  "detail": "Erro interno ao processar classificação: <mensagem de erro>"
}
```

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 400 | Dados inválidos (validação falhou) |
| 401 | Não autorizado (API key inválida) |
| 429 | Muitas requisições (rate limit) |
| 500 | Erro interno do servidor |

## Exemplos de Uso

### cURL

```bash
curl -X POST "http://localhost:8000/api/v1/classify" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{
    "amount": 1500.50,
    "hour": 14,
    "day_of_week": 1,
    "merchant_category": "online_retail",
    "location": {
      "country": "BR",
      "state": "SP",
      "city": "São Paulo"
    }
  }'
```

### Python

```python
import requests

url = "http://localhost:8000/api/v1/classify"
headers = {
    "Content-Type": "application/json",
    "X-API-Key": "your-api-key-here"
}
data = {
    "amount": 1500.50,
    "hour": 14,
    "day_of_week": 1,
    "merchant_category": "online_retail",
    "location": {
        "country": "BR",
        "state": "SP",
        "city": "São Paulo"
    }
}

response = requests.post(url, json=data, headers=headers)
result = response.json()

print(f"Classificação: {'FRAUDE' if result['classification'] == 1 else 'NÃO FRAUDE'}")
print(f"Score: {result['fraud_score']:.2f}")
print(f"Risco: {result['details']['risk_level']}")
```

### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:8000/api/v1/classify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify({
    amount: 1500.50,
    hour: 14,
    day_of_week: 1,
    merchant_category: 'online_retail',
    location: {
      country: 'BR',
      state: 'SP',
      city: 'São Paulo'
    }
  })
});

const result = await response.json();
console.log(`Classificação: ${result.classification === 1 ? 'FRAUDE' : 'NÃO FRAUDE'}`);
console.log(`Score: ${result.fraud_score.toFixed(2)}`);
```

## Rate Limiting

- **Limite:** 100 requisições por minuto por API key
- **Header de Resposta:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- **Excedido:** Retorna `429 Too Many Requests`

## Versionamento

A API utiliza versionamento de URL. A versão atual é `v1`.

**Formato:** `/api/v1/<endpoint>`

Versões futuras: `/api/v2/<endpoint>`

## Swagger/OpenAPI

Documentação interativa disponível em:
- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

## Suporte

Para suporte técnico ou dúvidas:
- **Email:** suporte@fraude-classifier.com
- **Documentação:** https://docs.fraude-classifier.com

