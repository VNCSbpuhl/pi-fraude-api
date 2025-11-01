# 1. Imagem base do Python
FROM python:3.11-slim

# 2. Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# 3. Copia o arquivo de requisitos e instala as bibliotecas
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copia todos os arquivos da sua API para o contêiner
COPY main.py .
COPY models/ ./models
COPY scalers/ ./scalers

# 5. Expõe a porta que o uvicorn usa
EXPOSE 8000

# 6. Comando para rodar a API
#    O host 0.0.0.0 é OBRIGATÓRIO para funcionar na nuvem
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]