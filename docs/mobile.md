# 📱 Plano de Desenvolvimento Mobile - Sistema Classificador de Fraude

## 1. Tecnologia Escolhida: React Native

### Justificativa da Escolha

**React Native** foi escolhida sobre outras alternativas por:

1. **Multiplataforma Nativa**: Um único código para iOS e Android
   - Compartilhamento de ~90% do código entre plataformas
   - Performance nativa (não é web view como PWA)

2. **Ecossistema Rico**:
   - Bibliotecas maduras para consumo de APIs REST
   - Navegação robusta (React Navigation)
   - Estado global (Context API, Redux)

3. **Produtividade**:
   - Hot Reload para desenvolvimento rápido
   - TypeScript support nativo
   - Grande comunidade e documentação

4. **Manutenibilidade**:
   - Padrões web conhecidos (JSX, componentes)
   - Fácil integração com CI/CD

**Alternativas Consideradas:**
- **Flutter**: Boa performance, mas curva de aprendizado maior (Dart)
- **Ionic/Cordova**: Performance inferior (web view), não é verdadeiramente nativo
- **Native (Kotlin/Swift)**: Maior custo de desenvolvimento (2 codebases separados)

## 2. Desenvolvimento de Interface (UI/UX)

### 2.1 Tela de Simulação de Transação (`TransactionSimulationScreen`)

**Componentes:**
- **Inputs:**
  - `AmountInput`: Campo numérico para valor da transação (R$)
  - `MerchantCategoryPicker`: Seletor para categoria (Online, Físico, ATM, etc.)
  - `DateTimePicker`: Seletor de data/hora da transação
  - `LocationPicker`: Seletor ou input de localização (cidade, estado, país)

- **Botões:**
  - `SubmitButton`: Botão principal "Classificar Transação"
  - `ClearButton`: Botão secundário "Limpar Campos"

- **Layout:**
  - Formulário com validação em tempo real
  - Feedback visual (cores, ícones) para campos válidos/inválidos
  - Indicador de loading durante a submissão

**Design:**
```
┌─────────────────────────────┐
│  🔍 Classificar Transação  │
├─────────────────────────────┤
│                             │
│  Valor (R$):                │
│  [________________]         │
│                             │
│  Categoria:                 │
│  [Online ▼]                 │
│                             │
│  Data/Hora:                 │
│  [15/01/2024 10:30 ▼]      │
│                             │
│  Localização:               │
│  [São Paulo, SP ▼]          │
│                             │
│  [ Classificar Transação ]  │
│  [   Limpar Campos   ]      │
│                             │
└─────────────────────────────┘
```

### 2.2 Tela de Resultado da Classificação (`TransactionResultScreen`)

**Componentes:**
- **Display de Resultado:**
  - `ClassificationBadge`: Badge grande mostrando "FRAUDE" (vermelho) ou "NÃO FRAUDE" (verde)
  - `FraudScoreBar`: Barra de progresso mostrando score de fraude (0-100%)
  - `ConfidenceIndicator`: Indicador de confiança ("Alta", "Média", "Baixa")

- **Detalhes:**
  - `TransactionDetailsCard`: Card mostrando dados da transação enviada
  - `RiskLevelCard`: Card com nível de risco e explicação

- **Ações:**
  - `NewTransactionButton`: Botão "Nova Transação"
  - `ShareButton`: Botão "Compartilhar Resultado" (opcional)

**Design:**
```
┌─────────────────────────────┐
│  ✓ Resultado da Análise    │
├─────────────────────────────┤
│                             │
│     ┌─────────────┐         │
│     │   FRAUDE    │         │
│     │   (87%)     │         │
│     └─────────────┘         │
│                             │
│  Nível de Risco: CRÍTICO    │
│  [████████░░] 87%           │
│                             │
│  Confiança: Alta            │
│                             │
│  Detalhes da Transação:     │
│  • Valor: R$ 1.500,50       │
│  • Categoria: Online        │
│  • Data: 15/01/2024 10:30   │
│  • Localização: SP, BR      │
│                             │
│  [ Nova Transação ]         │
│                             │
└─────────────────────────────┘
```

## 3. Eventos, Props e State

### 3.1 Estado da Tela de Simulação

**Gerenciamento de Estado usando `useState`:**

```typescript
import React, { useState } from 'react';

interface TransactionForm {
  amount: string;
  merchantCategory: string;
  timestamp: Date;
  location: {
    city: string;
    state: string;
    country: string;
  };
}

const TransactionSimulationScreen = () => {
  // Estado do formulário
  const [formData, setFormData] = useState<TransactionForm>({
    amount: '',
    merchantCategory: 'online_retail',
    timestamp: new Date(),
    location: {
      city: '',
      state: '',
      country: 'BR',
    },
  });

  // Estado de validação
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estado de loading
  const [isLoading, setIsLoading] = useState(false);

  // Handler para atualizar campo específico
  const updateField = (field: keyof TransactionForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    // Limpar erro do campo quando editado
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handler para submissão
  const handleSubmit = async () => {
    // Validação
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const result = await classifyTransaction(formData);
      // Navegar para tela de resultado
      navigation.navigate('Result', { result });
    } catch (error) {
      // Exibir erro
      Alert.alert('Erro', 'Falha ao classificar transação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // JSX do formulário
  );
};
```

### 3.2 Validação em Tempo Real

```typescript
const validateForm = (data: TransactionForm): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Validar valor
  const amount = parseFloat(data.amount);
  if (!amount || amount <= 0) {
    errors.amount = 'Valor deve ser maior que zero';
  }
  if (amount > 100000) {
    errors.amount = 'Valor muito alto';
  }

  // Validar categoria
  if (!data.merchantCategory) {
    errors.merchantCategory = 'Selecione uma categoria';
  }

  // Validar localização
  if (!data.location.city || !data.location.state) {
    errors.location = 'Selecione uma localização válida';
  }

  return errors;
};
```

## 4. Navegação

### 4.1 Estrutura de Navegação (React Navigation)

**Stack Navigator** com as seguintes rotas:

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="TransactionSimulation"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen
          name="TransactionSimulation"
          component={TransactionSimulationScreen}
          options={{ title: 'Classificar Transação' }}
        />
        <Stack.Screen
          name="TransactionResult"
          component={TransactionResultScreen}
          options={{ title: 'Resultado da Análise' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### 4.2 Fluxo de Navegação

```
1. App Inicia
   │
   ├─► Tela: TransactionSimulation (tela inicial)
   │   ├─► Usuário preenche formulário
   │   ├─► Clica em "Classificar Transação"
   │   ├─► Validação local
   │   ├─► Loading indicator
   │   └─► Chamada API
   │
2. API Retorna Resultado
   │
   ├─► Navegação: navigation.navigate('TransactionResult', { result })
   │
3. Tela: TransactionResult
   │   ├─► Exibe classificação (Fraude/Não Fraude)
   │   ├─► Exibe score de fraude
   │   ├─► Exibe detalhes da transação
   │   └─► Botão "Nova Transação"
   │
4. Usuário Clica "Nova Transação"
   │
   ├─► Navegação: navigation.goBack() ou navigation.replace('TransactionSimulation')
   │
5. Retorna para Tela: TransactionSimulation
   │   └─► Formulário limpo (reset state)
```

## 5. Construção de Serviço RESTful (Consumo)

### 5.1 Serviço de API (Service Pattern)

**Criação do serviço de API usando `axios`:**

```typescript
// src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_BASE_URL, API_KEY } from '@env';

interface ClassificationRequest {
  amount: number;
  hour: number;
  day_of_week: number;
  merchant_category: string;
  location: {
    country: string;
    state: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  device_info?: {
    device_type: string;
    ip_address?: string;
  };
  user_id?: string;
  previous_transactions_count?: number;
}

interface ClassificationResponse {
  transaction_id: string;
  classification: 0 | 1; // 0 = Não Fraude, 1 = Fraude
  fraud_score: number; // 0.0 - 1.0
  confidence: 'low' | 'medium' | 'high';
  details: {
    legitimate_probability: number;
    fraud_probability: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
  };
  timestamp: string;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL, // ex: 'https://api.fraude-classifier.com'
      timeout: 10000, // 10 segundos
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

    // Interceptor para tratar erros globalmente
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // Erro do servidor (4xx, 5xx)
          const status = error.response.status;
          if (status === 401) {
            throw new Error('API Key inválida');
          } else if (status === 429) {
            throw new Error('Muitas requisições. Tente novamente mais tarde.');
          } else if (status >= 500) {
            throw new Error('Erro no servidor. Tente novamente mais tarde.');
          }
        } else if (error.request) {
          // Sem resposta do servidor
          throw new Error('Sem conexão com o servidor. Verifique sua internet.');
        } else {
          throw new Error('Erro ao processar requisição');
        }
        return Promise.reject(error);
      }
    );
  }

  async classifyTransaction(
    data: ClassificationRequest
  ): Promise<ClassificationResponse> {
    try {
      const response = await this.client.post<ClassificationResponse>(
        '/api/v1/classify',
        data
      );
      return response.data;
    } catch (error: any) {
      // Re-throw com mensagem mais amigável
      throw new Error(error.message || 'Erro ao classificar transação');
    }
  }
}

export const apiService = new ApiService();
```

### 5.2 Uso do Serviço no Componente

```typescript
// src/screens/TransactionSimulationScreen.tsx
import { apiService } from '../services/api';

const TransactionSimulationScreen = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    // Preparar dados para API
    const requestData: ClassificationRequest = {
      amount: parseFloat(formData.amount),
      hour: formData.timestamp.getHours(),
      day_of_week: formData.timestamp.getDay(),
      merchant_category: formData.merchantCategory,
      location: {
        country: formData.location.country,
        state: formData.location.state,
        city: formData.location.city,
      },
      device_info: {
        device_type: 'mobile',
      },
      user_id: 'user_123', // Pode vir de AsyncStorage ou AuthContext
      previous_transactions_count: 15,
    };

    setIsLoading(true);
    try {
      const result = await apiService.classifyTransaction(requestData);
      
      // Navegar para tela de resultado
      navigation.navigate('TransactionResult', {
        result,
        originalData: formData,
      });
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View>
      {/* Formulário */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <Text>Classificar Transação</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
```

## 6. Design Patterns

### 6.1 Padrão de Serviço/API (Service Pattern)

**Estrutura de Diretórios:**
```
src/
├── services/
│   ├── api.ts              # Cliente HTTP (axios)
│   ├── storage.ts          # AsyncStorage wrapper
│   └── location.ts         # Location services
├── screens/
│   ├── TransactionSimulationScreen.tsx
│   └── TransactionResultScreen.tsx
├── components/
│   ├── AmountInput.tsx
│   ├── CategoryPicker.tsx
│   └── FraudScoreBar.tsx
└── context/
    └── TransactionContext.tsx  # Context API para estado global
```

**Benefícios:**
- **Separação de Responsabilidades**: Lógica de API separada da UI
- **Reutilização**: Serviço pode ser usado em múltiplos componentes
- **Testabilidade**: Fácil mockar o serviço para testes
- **Manutenibilidade**: Mudanças na API afetam apenas o serviço

### 6.2 Context API para Estado Global

**Uso de Context API para gerenciar estado de transações:**

```typescript
// src/context/TransactionContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ClassificationResponse } from '../services/api';

interface TransactionContextType {
  transactions: ClassificationResponse[];
  addTransaction: (transaction: ClassificationResponse) => void;
  clearTransactions: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined
);

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [transactions, setTransactions] = useState<ClassificationResponse[]>(
    []
  );

  const addTransaction = (transaction: ClassificationResponse) => {
    setTransactions(prev => [transaction, ...prev]);
  };

  const clearTransactions = () => {
    setTransactions([]);
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        addTransaction,
        clearTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransaction = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransaction must be used within TransactionProvider');
  }
  return context;
};
```

**Uso no Componente:**
```typescript
import { useTransaction } from '../context/TransactionContext';

const TransactionResultScreen = ({ result }) => {
  const { addTransaction } = useTransaction();

  useEffect(() => {
    // Salvar transação no histórico global
    addTransaction(result);
  }, [result]);

  return (
    // UI do resultado
  );
};
```

### 6.3 Padrão de Hooks Customizados

**Hook customizado para classificação de transação:**

```typescript
// src/hooks/useTransactionClassification.ts
import { useState } from 'react';
import { apiService } from '../services/api';
import { ClassificationRequest, ClassificationResponse } from '../services/api';

export const useTransactionClassification = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classifyTransaction = async (
    data: ClassificationRequest
  ): Promise<ClassificationResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiService.classifyTransaction(data);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    classifyTransaction,
    isLoading,
    error,
  };
};
```

**Uso:**
```typescript
const TransactionSimulationScreen = () => {
  const { classifyTransaction, isLoading, error } = useTransactionClassification();

  const handleSubmit = async () => {
    const result = await classifyTransaction(requestData);
    if (result) {
      navigation.navigate('Result', { result });
    }
  };

  return (
    <View>
      {error && <Text style={styles.error}>{error}</Text>}
      {/* Resto do formulário */}
    </View>
  );
};
```

## 7. Estrutura de Arquivos Completa

```
mobile/
├── src/
│   ├── screens/
│   │   ├── TransactionSimulationScreen.tsx
│   │   └── TransactionResultScreen.tsx
│   ├── components/
│   │   ├── AmountInput.tsx
│   │   ├── MerchantCategoryPicker.tsx
│   │   ├── DateTimePicker.tsx
│   │   ├── LocationPicker.tsx
│   │   ├── ClassificationBadge.tsx
│   │   ├── FraudScoreBar.tsx
│   │   └── TransactionDetailsCard.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── storage.ts
│   ├── context/
│   │   └── TransactionContext.tsx
│   ├── hooks/
│   │   └── useTransactionClassification.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx
│   ├── utils/
│   │   ├── validation.ts
│   │   └── formatters.ts
│   └── types/
│       └── index.ts
├── App.tsx
├── package.json
├── tsconfig.json
├── babel.config.js
└── .env
```

## 8. Tecnologias e Bibliotecas

### Dependências Principais

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.72.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/stack": "^6.3.0",
    "axios": "^1.6.0",
    "react-native-gesture-handler": "^2.14.0",
    "react-native-reanimated": "^3.5.0",
    "@react-native-async-storage/async-storage": "^1.19.0",
    "react-native-vector-icons": "^10.0.0",
    "@react-native-community/datetimepicker": "^7.6.0",
    "react-native-picker-select": "^9.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-native": "^0.72.0",
    "typescript": "^5.2.0",
    "@babel/core": "^7.23.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0"
  }
}
```

## 9. Resumo

### Checklist de Implementação

- [x] Escolha de tecnologia (React Native)
- [x] Definição de telas e componentes
- [x] Gerenciamento de estado (`useState`, Context API)
- [x] Navegação (Stack Navigator)
- [x] Serviço RESTful (axios + Service Pattern)
- [x] Design patterns (Service, Context, Custom Hooks)
- [x] Estrutura de diretórios
- [x] Bibliotecas e dependências

**Próximos Passos:**
1. Implementar código dos componentes
2. Configurar ambiente de desenvolvimento
3. Testes unitários e de integração
4. Build para iOS e Android

