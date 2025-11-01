// !!!!!!!!!!!!!!!!!!! IMPORTANTE !!!!!!!!!!!!!!!!!!!
// TROQUE PELA URL QUE O GOOGLE CLOUD RUN TE DEU
const API_URL = "https://api-fraude-xxxxxxxx-uc.a.run.app/predict";
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// Templates de dados (baseados nos que testamos)
const baseLegitData = {
  "Time": 18, "V1": 1.1666, "V2": 0.5021, "V3": -0.0673, "V4": 2.2615,
  "V5": 0.4288, "V6": 0.0894, "V7": 0.2411, "V8": 0.1380, "V9": -0.9891,
  "V10": 0.9221, "V11": 0.7447, "V12": -0.5313, "V13": -2.1053, "V14": 1.1268,
  "V15": 0.0030, "V16": 0.4244, "V17": -0.4544, "V18": -0.0988, "V19": -0.8165,
  "V20": -0.3071, "V21": 0.0187, "V22": -0.0619, "V23": -0.1038, "V24": -0.3704,
  "V25": 0.6032, "V26": 0.1085, "V27": -0.0405, "V28": -0.0114, "Amount": 2.28
};

const baseFraudData = {
  "Time": 406, "V1": -2.3122, "V2": 1.9519, "V3": -1.6098, "V4": 3.9979,
  "V5": -0.5221, "V6": -1.4265, "V7": -2.5373, "V8": 1.3916, "V9": -2.7700,
  "V10": -2.7722, "V11": 3.2020, "V12": -2.8999, "V13": -0.5952, "V14": -4.2892,
  "V15": 0.3897, "V16": -1.1407, "V17": -2.8300, "V18": -0.0168, "V19": 0.4169,
  "V20": 0.1269, "V21": 0.5172, "V22": -0.0350, "V23": -0.4652, "V24": 0.3201,
  "V25": 0.0445, "V26": 0.1778, "V27": 0.2611, "V28": -0.1432, "Amount": 0
};

// Seleciona os elementos da tela
const btnLegit = document.getElementById("btnLegit");
const btnFraud = document.getElementById("btnFraud");
const liveFeedList = document.getElementById("live-feed-list");
const fraudAlertList = document.getElementById("fraud-alert-list");

// Adiciona os eventos de clique
btnLegit.onclick = () => simulateTransaction(baseLegitData);
btnFraud.onclick = () => simulateTransaction(baseFraudData);

// Função para simular os dados e parecerem "reais"
function getSimulatedData(baseData) {
    // Cria uma cópia dos dados base
    let newData = { ...baseData }; 
    
    // Altera o 'Amount' e 'Time' para parecer uma nova transação
    // Math.random() * (max - min) + min
    newData.Amount = parseFloat((Math.random() * (2000 - 5) + 5).toFixed(2));
    newData.Time = baseData.Time + Math.floor(Math.random() * 10000);
    
    return newData;
}

async function simulateTransaction(baseData) {
    const transactionData = getSimulatedData(baseData);
    
    // 1. Adiciona um item "pendente" ao feed
    const li = document.createElement("li");
    li.textContent = `[PENDENTE] Nova Transação de R$ ${transactionData.Amount}...`;
    liveFeedList.prepend(li); // Adiciona no topo da lista
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionData)
        });
        
        const result = await response.json();
        
        // 2. Atualiza o item com o resultado da API
        if (result.prediction_label === "Fraude") {
            li.textContent = `[ALERTA] Transação de R$ ${transactionData.Amount}. Prob: ${(result.probability_fraud * 100).toFixed(2)}%`;
            li.className = "fraud";
            
            // Adiciona na lista de alertas
            const alertLi = li.cloneNode(true);
            fraudAlertList.prepend(alertLi);
            
        } else {
            li.textContent = `[APROVADA] Transação de R$ ${transactionData.Amount}.`;
            li.className = "legit";
        }
        
    } catch (error) {
        li.textContent = `[ERRO API] Falha ao processar R$ ${transactionData.Amount}.`;
        li.className = "fraud";
    }
}