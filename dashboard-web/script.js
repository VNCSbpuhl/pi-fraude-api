// !!!!!!!!!!!!!!!!!!! IMPORTANTE !!!!!!!!!!!!!!!!!!!
// Sua URL do Render (já está correta)
const API_URL = "https://pi-fraude-api-vncs.onrender.com/predict";
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

// ==================================================================
// NOVA TRANSAÇÃO DE FRAUDE (EXEMPLO GARANTIDO DO KAGGLE)
// ==================================================================
const baseFraudData = {
    "Time": 472,
    "V1": -3.043540624, "V2": -3.157307121, "V3": 1.08846278, "V4": 2.288643618,
    "V5": 1.35980513, "V6": -1.064823159, "V7": 0.325574365, "V8": -0.067793653,
    "V9": -0.270952836, "V10": -0.838586565, "V11": -0.414575448, "V12": -0.50314086,
    "V13": 0.676501545, "V14": -1.692028933, "V15": 2.000634839, "V16": 0.666779696,
    "V17": -0.41018649, "V18": 0.92311537, "V19": -0.083501487, "V20": 1.378151613,
    "V21": 0.661695925, "V22": 0.435477265, "V23": 1.375965743, "V24": -0.293803152,
    "V25": 0.279797532, "V26": -0.145361715, "V27": -0.252773464, "V28": 0.035764225,
    "Amount": 529.0
};
// ==================================================================

// Seleciona os elementos da tela
const btnLegit = document.getElementById("btnLegit");
const btnFraud = document.getElementById("btnFraud");
const liveFeedList = document.getElementById("live-feed-list");
const fraudAlertList = document.getElementById("fraud-alert-list");

// Adiciona os eventos de clique
btnLegit.onclick = () => simulateTransaction(baseLegitData);
btnFraud.onclick = () => simulateTransaction(baseFraudData);

// Função para simular os dados e parecerem "reais"
// (Esta é a versão 2, que envia o Amount original)
async function simulateTransaction(baseData) {
    
    // 1. Cria os dados "falsos" para mostrar na tela
    const simulatedAmount = (baseData.Amount === 529.0) // Se for a nossa fraude
        ? 529.0 // Mostra o valor real da fraude
        : parseFloat((Math.random() * (1000 - 5) + 5).toFixed(2)); // Senão, mostra um valor aleatório
        
    const simulatedTime = baseData.Time + Math.floor(Math.random() * 10000);

    // 2. Cria os dados "reais" para enviar à API
    let transactionDataToSend = { ...baseData };
    transactionDataToSend.Amount = baseData.Amount; // Usa o Amount ORIGINAL
    transactionDataToSend.Time = simulatedTime;

    // 3. Mostra o valor "falso" na tela
    const li = document.createElement("li");
    li.textContent = `[PENDENTE] Nova Transação de R$ ${simulatedAmount}...`;
    liveFeedList.prepend(li); 
    
    try {
        // 4. Envia os dados "reais" para a API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transactionDataToSend) 
        });
        
        if (response.status === 503) {
            li.textContent = `[ACORDANDO API] O servidor gratuito estava dormindo. Tentando novamente...`;
            await new Promise(resolve => setTimeout(resolve, 2000));
            return simulateTransaction(baseData); 
        }

        const result = await response.json();
        
        // Debug: log da resposta da API
        console.log("Resposta da API:", result);
        
        // Verifica se há erro na resposta
        if (result.error) {
            li.textContent = `[ERRO] ${result.error}`;
            li.className = "fraud";
            return;
        }
        
        // 5. Verifica se é fraude usando prediction (0 ou 1) ou prediction_label
        // prediction: 0 = Legítimo, 1 = Fraude
        const isFraud = result.prediction === 1 || result.prediction_label === "Fraude";
        
        if (isFraud) {
            li.textContent = `[ALERTA] Transação de R$ ${simulatedAmount}. Prob: ${(result.probability_fraud * 100).toFixed(2)}%`;
            li.className = "fraud";
            const alertLi = li.cloneNode(true);
            fraudAlertList.prepend(alertLi);
            
        } else {
            li.textContent = `[APROVADA] Transação de R$ ${simulatedAmount}.`;
            li.className = "legit";
        }
        
    } catch (error) {
        li.textContent = `[ERRO API] Falha ao processar R$ ${simulatedAmount}.`;
        li.className = "fraud";
    }
}