# 🏗️ Arquitetura de Nuvem - Sistema Classificador de Fraude

## 1. Escolha de Serviços na AWS

### 1.1 Hospedagem do Back-End

**Escolha Principal: AWS ECS (Fargate) + Application Load Balancer (ALB)**

**Justificativa:**
- **Fargate**: Serverless, sem necessidade de gerenciar servidores EC2
- **Escalabilidade Automática**: Pode escalar de 1 a 1000+ containers automaticamente
- **Custo-Eficiente**: Paga apenas pelo tempo de execução dos containers
- **Flexibilidade**: Permite carregar modelos ML maiores (até 10GB por container)
- **Integração**: Fácil integração com RDS via VPC

**Alternativa Considerada: AWS Lambda**
- ❌ Limitações: 15 minutos timeout, 10GB memória máxima, package size limitado
- ❌ Não ideal para modelos ML grandes que requerem carregamento persistente
- ✅ Melhor para: Requisições muito rápidas, sem estado persistente

**Diagrama de Componentes:**
```
Internet → Route 53 → CloudFront (CDN) → ALB → ECS Fargate → RDS (VPC Privada)
                                                ↓
                                            ML Model (local)
```

### 1.2 Hospedagem do Banco de Dados

**Escolha: AWS RDS PostgreSQL (Multi-AZ para produção)**

**Justificativa:**
- **Gerenciado**: Backup automático, patching, monitoring
- **Alta Disponibilidade**: Multi-AZ com failover automático
- **Segurança**: Integração nativa com VPC, Encryption at rest
- **Performance**: Suporte a read replicas para escalar leitura
- **Compatibilidade**: PostgreSQL é robusto para dados relacionais e JSON

**Configuração Sugerida:**
- Instance Class: `db.t3.medium` (dev/staging), `db.r5.large` (produção)
- Storage: 100GB SSD gp3 (autoscaling habilitado)
- Multi-AZ: Habilitado em produção
- Backup: Retention 7 dias, automated backups diários

### 1.3 Modelo de Machine Learning

**Estratégia: Modelo carregado no container do backend**

- Modelo serializado em `.pkl` (pickle) ou `.onnx` (otimizado)
- Armazenado em S3 bucket privado
- Carregado na inicialização do container ECS
- Cache em memória para inferência rápida (~10-50ms por predição)

**Alternativa: AWS SageMaker Endpoint**
- Usar apenas se modelo for muito grande (>5GB) ou requerer GPU
- Maior latência devido a chamadas de rede
- Mais custoso para volumes baixos/médios

## 2. Fluxo de Dados (Data Flow)

### Fluxo Completo de uma Transação

```
1. Usuário no Mobile App
   │
   ├─► Insere dados da transação (valor, hora, tipo, localização)
   │
2. Mobile App faz requisição HTTPS
   │
   ├─► POST https://api.fraude-classifier.com/api/v1/classify
   │   Headers: { "X-API-Key": "xxx", "Content-Type": "application/json" }
   │   Body: { "amount": 1500.00, "hour": 3, "type": "online", "location": {...} }
   │
3. CloudFront (CDN) → Cache miss
   │
4. Application Load Balancer (ALB)
   │   ├─► Valida SSL/TLS
   │   ├─► Rate limiting (WAF rules)
   │   └─► Roteamento para ECS Service
   │
5. ECS Fargate Container (Backend FastAPI)
   │   ├─► Valida autenticação (API Key)
   │   ├─► Valida payload JSON
   │   ├─► Pré-processa dados (feature engineering)
   │   ├─► Carrega modelo ML (já em memória)
   │   ├─► model.predict_proba(data) → {fraud: 0.87, legitimate: 0.13}
   │   ├─► Classifica: fraud_score > 0.5 → FRAUDE (1), caso contrário → NÃO FRAUDE (0)
   │   └─► Persiste no RDS (async)
   │
6. RDS PostgreSQL (em VPC privada)
   │   ├─► INSERT INTO transactions (..., fraud_score, classification, timestamp)
   │   └─► Commit transaction
   │
7. Backend retorna resposta JSON
   │
8. CloudFront (opcional: cache da resposta por 1 minuto)
   │
9. Mobile App recebe e exibe resultado
   │   {
   │     "classification": 1,
   │     "fraud_score": 0.87,
   │     "confidence": "high",
   │     "transaction_id": "txn_123abc"
   │   }
```

### Tempo de Resposta Esperado
- **Latência total**: 150-300ms (sem cache) | 50-100ms (com cache CloudFront)
- **Breakdown**:
  - Network: 20-50ms
  - ALB processing: 5-10ms
  - ECS container: 50-150ms (incluindo inferência ML)
  - RDS write: 10-30ms
  - Response: 10-20ms

## 3. Contrato da API

### Endpoint: `POST /api/v1/classify`

#### Request

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-API-Key": "sk_live_xxxxxxxxxxxxxxxxx",
  "Accept": "application/json"
}
```

**Body:**
```json
{
  "amount": 1500.50,
  "hour": 3,
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

#### Response (Success - 200 OK)

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

#### Response (Error - 400 Bad Request)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "amount": "must be positive number",
      "hour": "must be between 0 and 23"
    }
  }
}
```

#### Response (Error - 401 Unauthorized)

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key"
  }
}
```

## 4. Boas Práticas de Segurança

### 4.1 VPC e Isolamento de Rede

**Configuração:**
- **VPC**: CIDR `10.0.0.0/16`
- **Sub-redes Públicas**: `10.0.1.0/24`, `10.0.2.0/24` (para ALB e NAT Gateway)
- **Sub-redes Privadas**: `10.0.10.0/24`, `10.0.11.0/24` (para ECS e RDS)

**Security Groups:**
- **ALB Security Group**: 
  - Inbound: Port 443 (HTTPS) de 0.0.0.0/0
  - Outbound: Port 8080 para ECS Security Group
- **ECS Security Group**:
  - Inbound: Port 8080 do ALB Security Group
  - Outbound: Port 5432 (PostgreSQL) para RDS Security Group
- **RDS Security Group**:
  - Inbound: Port 5432 APENAS do ECS Security Group
  - Sem acesso público (sem Internet Gateway associado à sub-rede)

**Resultado:** RDS completamente isolado, acessível apenas pelo backend via VPC privada.

### 4.2 IAM Roles e Least Privilege

**ECS Task Role** (para o container):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::fraude-ml-models/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:region:account:secret:api-keys-*"
    }
  ]
}
```

**ECS Execution Role** (para o serviço ECS):
```json
{
  "Effect": "Allow",
  "Action": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents",
    "ecr:GetAuthorizationToken",
    "ecr:BatchCheckLayerAvailability",
    "ecr:GetDownloadUrlForLayer",
    "ecr:BatchGetImage"
  ],
  "Resource": "*"
}
```

**Benefícios:**
- Container não precisa de credenciais hardcoded
- Acesso mínimo necessário (S3 para modelo ML, Secrets Manager para API keys)
- Rotação automática de credenciais via Secrets Manager

### 4.3 Criptografia de Dados

**Em Repouso (RDS):**
- Encryption at rest: Habilitada (AES-256)
- KMS Key: Chave gerenciada pela AWS ou chave customizada
- Automatic backups: Criptografados
- Snapshot: Criptografados

**Em Trânsito:**
- HTTPS/TLS 1.3 entre Mobile ↔ API Gateway/ALB
- TLS 1.3 entre ALB ↔ ECS (mesmo dentro da VPC)
- SSL/TLS entre ECS ↔ RDS (force_ssl = true no PostgreSQL)

**No Aplicativo:**
- API Keys armazenadas em AWS Secrets Manager (criptografadas)
- Senhas de DB: Armazenadas em Secrets Manager (nunca em código)
- Modelo ML no S3: Server-side encryption (SSE-S3 ou SSE-KMS)

## 5. Gestão de Custos

### 5.1 Monitoramento e Alertas

**CloudWatch Billing Alerts:**
- Alert 1: Custo total do mês > $100 (Warning)
- Alert 2: Custo total do mês > $200 (Critical)
- Alert 3: Custo diário > $10 (Warning)

**CloudWatch Cost Anomaly Detection:**
- Monitora gastos por serviço (ECS, RDS, Data Transfer)
- Detecta aumentos súbitos (>50% em 1 dia)
- Notificações via SNS → Email/Slack

**Dashboard Customizado:**
- ECS Task Count (pode escalar automaticamente)
- RDS Connection Count
- API Gateway Request Count
- S3 Storage (modelos ML)

### 5.2 Estratégias de Otimização

**Estratégia 1: Serverless e Auto-Scaling**
- **ECS Fargate**: Escala para 0 tasks quando sem tráfego (economia em dev/staging)
- **Auto Scaling**: 
  - Scale Out: CPU > 70% ou Memory > 80%
  - Scale In: CPU < 30% e Memory < 40% (após 5 minutos)
- **Resultado**: Paga apenas pelo uso real (sem custo fixo de EC2 idle)

**Estratégia 2: Reserva e Spot Instances (para RDS)**
- **RDS Reserved Instances**: 1-3 anos de compromisso (até 40% desconto) para produção
- **RDS Dev/Test**: Usar instâncias menores (`db.t3.micro`) para ambiente de desenvolvimento
- **Multi-AZ**: Desabilitar em staging/dev (economiza 2x)
- **Backup Retention**: Reduzir de 7 para 3 dias em dev (economiza storage)

**Estratégia 3: Otimização de Data Transfer**
- CloudFront: Cache de respostas comuns (reduz chamadas ao backend)
- Compressão: Habilitar gzip/brotli no ALB
- Region Selection: Colocar recursos na mesma região (reduz custo de data transfer)

**Estimativa Mensal (Staging):**
- ECS Fargate (1 task, 0.5 vCPU, 1GB): ~$15/mês
- RDS db.t3.small: ~$25/mês
- ALB: ~$20/mês
- Data Transfer: ~$5/mês
- **Total: ~$65/mês**

## 6. CI/CD Pipeline

### 6.1 Pipeline com GitHub Actions

**Workflow: `.github/workflows/deploy-backend.yml`**

**Etapas:**
1. **Checkout**: Clone do código
2. **Testes**: Rodar testes unitários e de integração
3. **Build Docker Image**: Construir imagem do backend
4. **Push to ECR**: Enviar imagem para Amazon ECR
5. **Deploy to ECS**: Atualizar task definition e forçar novo deploy

**Configuração:**
- **Trigger**: Push para `main` branch ou PR merge
- **Environment**: Staging (automático) | Production (manual approval)

**Segredos Necessários:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `ECR_REPOSITORY`
- `ECS_SERVICE_NAME`
- `ECS_CLUSTER_NAME`

**Resultado:**
- Deploy automático após merge
- Zero downtime (rolling update)
- Rollback automático em caso de falha no health check

### 6.2 Pipeline Detalhado

```yaml
# Fluxo de CI/CD
1. Developer faz push/merge
   │
2. GitHub Actions triggered
   │
3. Run Tests (pytest)
   │   ├─► Testes passam → Continue
   │   └─► Testes falham → Stop pipeline, notificar
   │
4. Build Docker Image
   │   ├─► Dockerfile: FROM python:3.9-slim
   │   ├─► Instalar dependências
   │   ├─► Copiar código
   │   └─► Tag: latest + git-sha
   │
5. Push to ECR
   │   ├─► Autenticar no ECR
   │   └─► docker push
   │
6. Update ECS Task Definition
   │   ├─► Buscar task definition atual
   │   ├─► Atualizar image URI
   │   └─► Registrar nova revisão
   │
7. Deploy to ECS
   │   ├─► Update service (nova task definition)
   │   ├─► Rolling update (ECS cria novas tasks)
   │   ├─► Health checks nas novas tasks
   │   ├─► Descomissionar tasks antigas
   │   └─► Deploy completo
   │
8. Smoke Tests (opcional)
   │   ├─► Testar endpoint /health
   │   └─► Testar endpoint /api/v1/classify (teste simples)
```

## 7. Escala Automática

### 7.1 Auto Scaling do ECS Fargate

**Configuração:**
- **Mínimo**: 1 task (garantir disponibilidade)
- **Máximo**: 50 tasks (limite de custo)
- **Target**: CPU 60%, Memory 70%

**Métricas:**
- **CPU Utilization**: Target 60% (se > 60%, adicionar tasks)
- **Memory Utilization**: Target 70%
- **Request Count** (via ALB): Opcional, para scaling mais agressivo

**Comportamento:**
- **Scale Out**: Se CPU > 60% por 2 minutos consecutivos → Adicionar 2 tasks
- **Scale In**: Se CPU < 30% por 5 minutos consecutivos → Remover 1 task (até mínimo)

**Capacidade Estimada:**
- 1 task: ~50 req/s (com modelo ML)
- 50 tasks: ~2,500 req/s
- **Latência**: Mantém < 300ms mesmo sob carga

### 7.2 Estratégia de Escalabilidade Horizontal

**Load Distribution:**
- ALB distribui requisições entre todas as tasks saudáveis
- Health checks: `/health` endpoint a cada 30s
- Unhealthy tasks: Removidas automaticamente do pool

**Modelo ML:**
- Cada task carrega o modelo uma vez na inicialização
- Modelo fica em memória (sem recarregamento por requisição)
- Escalabilidade horizontal: Adicionar mais tasks = mais capacidade

**Limitações e Soluções:**
- **RDS Connection Pool**: Máximo de conexões limitado (usar pgbouncer ou aumentar `max_connections`)
- **Cold Start**: Primeira requisição pode ser lenta (~2-3s) → Manter mínimo de 1 task sempre rodando

## 8. Diagrama de Arquitetura Final

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Internet                                      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Route 53     │
                    │  (DNS)        │
                    └───────┬───────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  CloudFront (CDN)     │
                │  - Cache estático     │
                │  - DDoS protection    │
                └───────────┬───────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Application Load Balancer     │
            │  - SSL/TLS termination        │
            │  - WAF (Web Application Firewall)│
            │  - Health checks              │
            └───────────┬───────────────────┘
                        │
                        │ (VPC: 10.0.0.0/16)
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
    ┌──────────────┐      ┌──────────────┐
    │  Subnet      │      │  Subnet      │
    │  Public 1a   │      │  Public 1b   │
    └──────┬───────┘      └──────┬───────┘
           │                     │
           ▼                     ▼
    ┌─────────────────────────────────────┐
    │  ECS Fargate Service                │
    │  - Auto Scaling: 1-50 tasks         │
    │  - Task Definition:                 │
    │    * FastAPI Backend                │
    │    * ML Model (.pkl em memória)    │
    │    * Health check: /health          │
    └───────────────┬─────────────────────┘
                    │
                    │ (Security Group)
                    │ Port 5432
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│  Subnet       │      │  Subnet       │
│  Private 10a  │      │  Private 10b  │
└───────┬───────┘      └───────┬───────┘
        │                      │
        ▼                      ▼
┌───────────────────────────────────────┐
│  RDS PostgreSQL (Multi-AZ)            │
│  - Instance: db.r5.large              │
│  - Encryption: Enabled                │
│  - Backup: Automated (7 days)         │
│  - VPC: Private Subnets Only          │
│  - Security Group: ECS only           │
└───────────────────────────────────────┘

Acessos Externos:
  - S3 Bucket (ML Models): Via ECS Task Role (IAM)
  - Secrets Manager (API Keys): Via ECS Task Role (IAM)
  - CloudWatch Logs: Via ECS Execution Role
```

## 9. Resumo das Tecnologias Escolhidas

| Componente | Tecnologia | Justificativa |
|------------|-----------|---------------|
| **Backend Hosting** | AWS ECS Fargate | Serverless, auto-scaling, suporta modelos ML grandes |
| **Load Balancer** | Application Load Balancer | SSL termination, health checks, integração com ECS |
| **Database** | AWS RDS PostgreSQL | Gerenciado, alta disponibilidade, segurança |
| **ML Model Storage** | S3 + In-Memory | S3 para versionamento, memória para performance |
| **CDN** | CloudFront | Cache, DDoS protection, latência reduzida |
| **CI/CD** | GitHub Actions | Integração nativa com GitHub, fácil configuração |
| **Monitoring** | CloudWatch | Logs, métricas, alertas integrados |
| **Secrets** | Secrets Manager | Rotação automática, integração IAM |

---

**Próximos Passos:**
1. Implementar código do backend (FastAPI)
2. Treinar e serializar modelo ML
3. Criar scripts Terraform/CloudFormation para infraestrutura
4. Configurar pipeline CI/CD
5. Implementar app mobile

