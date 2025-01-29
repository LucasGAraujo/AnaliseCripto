const apiurl1 = 'https://api.coingecko.com/api/v3/coins/markets';
const params1 = {
  vs_currency: 'usd',
  order: 'market_cap_desc',
  per_page: 100,
  page: 1,
  price_change_percentage: '30d' // Alterado para 30 dias
};

// Função para buscar dados da API com retry
async function fetchCryptoData(retries = 3) {
  try {
    const query = new URLSearchParams(params1).toString();
    const response = await fetch(`${apiurl1}?${query}`);
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados da API: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    if (retries > 0) {
      console.log('Tentando novamente...');
      return fetchCryptoData(retries - 1);  // Retry
    }
    alert('Ocorreu um erro ao buscar os dados. Tente novamente mais tarde.');
    return [];
  }
}

// Função de Média Móvel Exponencial (EMA)
function exponentialMovingAverage(data, period) {
  const k = 2 / (period + 1);
  const ema = [data[0]]; // Inicia com o primeiro valor

  for (let i = 1; i < data.length; i++) {
    ema.push((data[i] - ema[i - 1]) * k + ema[i - 1]);
  }

  return ema;
}

// Função para calcular o Índice de Força Relativa (RSI) com média exponencial
function calculateRSI(data, period = 14) {
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const avgGain = exponentialMovingAverage(gains, period);
  const avgLoss = exponentialMovingAverage(losses, period);

  return avgGain.map((gain, index) => {
    const loss = avgLoss[index] || 0;
    const rs = gain / (loss || 1);
    return 100 - (100 / (1 + rs));
  });
}

// Função para calcular a volatilidade (desvio padrão)
function calculateVolatility(data, period = 30) { // Alterado para 30 dias
  const volatility = [];
  
  for (let i = 0; i <= data.length - period; i++) {
    const slice = data.slice(i, i + period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    volatility.push(Math.sqrt(variance));
  }

  return volatility;
}

// Função para gerar o PDF
async function generatePDF() {
  const data = await fetchCryptoData();
  if (!data.length) return;

  const analyzedData = data.map(coin => ({
    name: coin.name,
    symbol: coin.symbol,
    volume: coin.total_volume,
    marketCapChange: coin.market_cap_change_percentage_24h,
    priceChange30d: coin.price_change_percentage_30d_in_currency, // Alterado para 30 dias
    priceHistory: coin.price_change_percentage_30d_in_currency, // Alterado para 30 dias
  }));

  // Média Móvel Exponencial de 30 dias
  const priceChanges30d = analyzedData.map(coin => coin.priceChange30d);
  const ema30d = exponentialMovingAverage(priceChanges30d, 30); // Alterado para 30 dias

  // Cálculo do RSI com média exponencial de 14 dias
  const rsiValues = calculateRSI(priceChanges30d, 14);

  // Cálculo da volatilidade (desvio padrão) com 30 dias
  const volatilityValues = calculateVolatility(priceChanges30d, 30); // Alterado para 30 dias

  // Ajustar pesos
  const weights = {
    volume: 0.25,
    marketCapChange: 0.25,
    volatility: 0.2,
    ema: 0.15,
    rsi: 0.15
  };

  const analyzedScores = analyzedData.map((coin, index) => ({
    ...coin,
    score: (
      (coin.volume * weights.volume) +
      (coin.marketCapChange * weights.marketCapChange) +
      (volatilityValues[index] * weights.volatility) +
      ((ema30d[index] || 0) * weights.ema) +
      ((rsiValues[index] || 0) * weights.rsi)
    )
  }));

  // Tendências de Alta (maior score)
  const topHigh = [...analyzedScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  // Tendências de Baixa (menor score)
  const topLow = [...analyzedScores]
    .sort((a, b) => a.score - b.score)
    .slice(0, 15);

  // Criar PDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Título e explicação
  doc.setFontSize(16);
  doc.text('Análise Avançada de Cripto Tendências (30 Dias)', 10, 10);

  doc.setFontSize(12);
  doc.text('Este relatório utiliza diversos fatores para identificar as criptomoedas com maior potencial:', 10, 20);
  doc.text('- Aumento no volume negociado nos últimos 30 dias.', 10, 30);
  doc.text('- Crescimento consistente do valor de mercado (market cap).', 10, 40);
  doc.text('- Volatilidade (variabilidade do preço).', 10, 50);
  doc.text('- Média Móvel Exponencial de 30 dias (EMA).', 10, 60);
  doc.text('- Índice de Força Relativa (RSI) para identificar condições de sobrecompra ou sobrevenda.', 10, 70);

  doc.text('O "score" é uma pontuação que combina vários fatores:', 10, 80);
  doc.text('- Volume de transações, variação de market cap, volatilidade,', 10, 90);
  doc.text('  média móvel exponencial e RSI. Quanto maior o score, maior o potencial da criptomoeda para valorização.', 10, 100);

  // Tendências de Alta
  doc.setFontSize(14);
  doc.text('Top 15 Criptomoedas em Tendência de Alta:', 10, 110);
  doc.setFontSize(12);
  let yPosition = 120;

  topHigh.forEach((coin, index) => {
    const line1 = `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()})`;
    const line2 = `Volume: $${coin.volume.toLocaleString()} | Market Cap Change: ${coin.marketCapChange.toFixed(2)}% | Score: ${formatNumber(coin.score)}`;
    
    doc.text(line1, 10, yPosition);
    yPosition += 10;
    doc.text(line2, 10, yPosition);
    yPosition += 10;

    if (yPosition > 280) { // Se ultrapassar o limite da página
      doc.addPage();
      yPosition = 10; // Reinicia a posição no topo
    }
  });

  // Tendências de Baixa
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Top 15 Criptomoedas em Tendência de Baixa:', 10, 10);
  doc.setFontSize(12);
  yPosition = 20;

  topLow.forEach((coin, index) => {
    const line1 = `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()})`;
    const line2 = `Volume: $${coin.volume.toLocaleString()} | Market Cap Change: ${coin.marketCapChange.toFixed(2)}% | Score: ${formatNumber(coin.score)}`;
    
    doc.text(line1, 10, yPosition);
    yPosition += 10;
    doc.text(line2, 10, yPosition);
    yPosition += 10;

    if (yPosition > 280) { // Se ultrapassar o limite da página
      doc.addPage();
      yPosition = 10; // Reinicia a posição no topo
    }
  });

  doc.save('cripto_tendencias_avancadas_30d.pdf');
}

// Função para formatar números (K, M, B)
function formatNumber(num) {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B'; // Bilhões
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M'; // Milhões
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K'; // Milhares
  } else {
    return num.toString(); // Número normal
  }
}

// Adicionar evento ao botão
document.getElementById('generate1').addEventListener('click', generatePDF);