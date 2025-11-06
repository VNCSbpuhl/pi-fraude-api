import pandas as pd
import json
import os

# Define os caminhos
CSV_FILE_PATH = os.path.join('data', 'creditcard.csv')
OUTPUT_JSON_PATH = os.path.join('dashboard-web', 'fraud_examples.json')
NUM_EXAMPLES = 20 # Quantos exemplos de fraude queremos?

def extract_examples():
    print(f"Carregando dataset de {CSV_FILE_PATH}...")
    
    # Verifica se o arquivo CSV existe
    if not os.path.exists(CSV_FILE_PATH):
        print(f"Erro: Arquivo não encontrado em {CSV_FILE_PATH}")
        print("Por favor, certifique-se que o 'creditcard.csv' está na pasta 'data'.")
        return

    try:
        df = pd.read_csv(CSV_FILE_PATH)
        
        # Filtra apenas as fraudes (Classe 1)
        frauds_df = df[df['Class'] == 1]
        
        # Pega 20 amostras aleatórias (ou menos, se não houver 20)
        if len(frauds_df) > NUM_EXAMPLES:
            samples_df = frauds_df.sample(NUM_EXAMPLES)
        else:
            samples_df = frauds_df
        
        # Não precisamos da coluna 'Class' no JSON
        samples_df = samples_df.drop(columns=['Class'])
        
        # Converte para uma lista de dicionários
        examples_list = samples_df.to_dict(orient='records')
        
        # Salva o arquivo JSON diretamente na pasta do dashboard
        with open(OUTPUT_JSON_PATH, 'w') as f:
            json.dump(examples_list, f, indent=2)
            
        print(f"Sucesso! {len(examples_list)} exemplos de fraude salvos em:")
        print(OUTPUT_JSON_PATH)

    except Exception as e:
        print(f"Ocorreu um erro: {e}")

if __name__ == "__main__":
    # Garante que a pasta do dashboard exista
    os.makedirs(os.path.dirname(OUTPUT_JSON_PATH), exist_ok=True)
    extract_examples()