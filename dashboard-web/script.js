// !!!!!!!!!!!!!!!!!!! IMPORTANTE !!!!!!!!!!!!!!!!!!!
// Sua URL do Render (já está correta)
const API_URL = "https://pi-fraude-api-vncs.onrender.com/predict";
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// --- NOSSAS MUDANÇAS COMEÇAM AQUI ---

// Onde vamos guardar os exemplos de fraude que o JSON vai carregar
let fraudExamples = [];
// O exemplo legítimo continua fixo
const baseLegitData = {
  "Time": 18, "V1": 1.1666, "V2": 0.5021, "V3": -0.0673, "V4": 2.2615,
  "V5": 0.4288, "V6": 0.0894, "V7": 0.2411, "V8": 0.1380, "V9": -0.9891,
  "V10": 0.9221, "V11": 0.7447, "V12": -0.5313, "V13": -2.1053, "V14": 1.1268,
  "V15": 0.0030, "V16": 0.4244, "V17": -0.4544, "V18": -0.0988, "V19": -0.8165,
  "V20": -0.3071, "V21": 0.0187, "V22": -0.0619, "V23": -0.1038, "V24": -0.3704,
  "V25": 0.6032, "V26": 0.1085, "V27": -0.0405, "V28": -0.0114, "Amount": 2.28
};

// Seleciona os elementos da tela
const btnLegit = document.getElementById("btnLegit");
const btnFraud = document.getElementById("btnFraud");
const liveFeedList = document.getElementById("live-feed-list");
const fraudAlertList = document.getElementById("fraud-alert-list");

// Tenta carregar os exemplos de fraude assim que a página abre
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('fraud_examples.json');
        if (!response.ok) {
            throw new Error('Arquivo não encontrado');
        }
        fraudExamples = await response.json();
        console.log(`Carregados ${fraudExamples.length} exemplos de fraude.`);
        btnFraud.disabled = false; // Habilita o botão de fraude
    } catch (error) {
        console.error("Erro ao carregar fraud_examples.json:", error);
        alert("Erro ao carregar 'fraud_examples.json'. Por favor, execute o script 'python extract_fraud_examples.py' e recarregue a página.");
        btnFraud.disabled = true; // Desabilita o botão se não houver exemplos
    }
});

// Adiciona os eventos de clique
btnLegit.onclick = () => {
    // Para transações legítimas, simulamos um valor aleatório
    const randomAmount = parseFloat((Math.random() * (1000 - 5) + 5).toFixed(2));
    simulateTransaction(baseLegitData, randomAmount);
};

btnFraud.onclick = () => {
    if (fraudExamples.length === 0) {
        alert("Nenhum exemplo de fraude carregado. Verifique o console.");
        return;
    }
    // Escolhe um exemplo de fraude ALEATÓRIO da nossa lista
    const randomFraudExample = fraudExamples[Math.floor(Math.random() * fraudExamples.length)];
    
    // Para transações de fraude, usamos o valor REAL do exemplo
    simulateTransaction(randomFraudExample, randomFraudExample.Amount);
};

// --- FIM DAS NOSSAS MUDANÇAS ---


// Função de simulação (agora recebe o valor a ser exibido)
async function simulateTransaction(baseData, displayAmount) {
    
    // 1. Cria os dados "reais" para enviar à API
    let transactionDataToSend = { ...baseData };
    // Altera o Time para parecer uma nova transação (bom para o pre-processamento sin/cos)
    transactionDataToSend.Time = baseData.Time + Math.floor(Math.random() * 10000);
    // O Amount enviado é o original do 'baseData'
    transactionDataToSend.Amount = baseData.Amount; 

    // 2. Mostra o valor de exibição (displayAmount) na tela
    const li = document.createElement("li");
    li.textContent = `[PENDENTE] Nova Transação de R$ ${displayAmount.toFixed(2)}...`;
    liveFeedList.prepend(li); 
    
    try {
        // 3. Envia os dados "reais" para a API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionDataToSend) 
        });
        
        if (response.status === 503) {
            li.textContent = `[ACORDANDO API] O servidor gratuito estava dormindo. Tentando novamente...`;
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Tenta de novo com os mesmos dados
            return simulateTransaction(baseData, displayAmount); 
        }

        const result = await response.json();
        
        // Debug (do "Cursor" - muito útil)
        console.log("Resposta da API:", result);
        
        // Verifica se há erro na resposta
        if (result.error) {
            li.textContent = `[ERRO] ${result.error}`;
            li.className = "fraud";
            return;
        }
        
        // 4. Verifica se é fraude (lógica do "Cursor")
        const isFraud = result.prediction === 1 || result.prediction_label === "Fraude";
        
        // 5. Mostra o resultado, usando o valor de exibição
        if (isFraud) {
            li.textContent = `[ALERTA] Transação de R$ ${displayAmount.toFixed(2)}. Prob: ${(result.probability_fraud * 100).toFixed(2)}%`;
            li.className = "fraud";
            const alertLi = li.cloneNode(true);
            fraudAlertList.prepend(alertLi);
            
        } else {
            li.textContent = `[APROVADA] Transação de R$ ${displayAmount.toFixed(2)}.`;
            li.className = "legit";
        }
        
    } catch (error) {
        li.textContent = `[ERRO API] Falha ao processar R$ ${displayAmount.toFixed(2)}.`;
        li.className = "fraud";
    }
}