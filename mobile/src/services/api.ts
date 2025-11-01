import axios, { AxiosInstance, AxiosError } from 'axios';

// Configurar base URL da API
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'your-api-key-here';

export interface ClassificationRequest {
  amount: number;
  hour: number;
  day_of_week: number;
  merchant_category: string;
  location: {
    country: string;
    state?: string;
    city?: string;
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

export interface ClassificationResponse {
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
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
    });

    // Interceptor para tratar erros
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          if (status === 401) {
            throw new Error('API Key inválida');
          } else if (status === 429) {
            throw new Error('Muitas requisições. Tente novamente mais tarde.');
          } else if (status >= 500) {
            throw new Error('Erro no servidor. Tente novamente mais tarde.');
          } else if (status === 400) {
            const data: any = error.response.data;
            throw new Error(data.detail || 'Dados inválidos');
          }
        } else if (error.request) {
          throw new Error('Sem conexão com o servidor. Verifique sua internet.');
        }
        throw new Error('Erro ao processar requisição');
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
      throw new Error(error.message || 'Erro ao classificar transação');
    }
  }
}

export const apiService = new ApiService();

