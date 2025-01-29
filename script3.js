const API_URLsss = 'https://api.coingecko.com/api/v3/coins/markets';
const COIN_DETAILS_URL = 'https://api.coingecko.com/api/v3/coins';

// Parâmetros para buscar as criptomoedas mais populares
const paramsss = {
  vs_currency: 'usd',
  order: 'market_cap_desc',
  per_page: 100,
  page: 1,
  price_change_percentage: '24h',
};

// Função para buscar dados da API com retry
async function fetchCryptoData(retries = 3) {
  try {
    const query = new URLSearchParams(paramsss).toString();
    const response = await fetch(`${API_URLsss}?${query}`);
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

// Função para buscar detalhes de uma criptomoeda (incluindo a data de criação)
async function fetchCoinDetails(coinId) {
  try {
    const response = await fetch(`${COIN_DETAILS_URL}/${coinId}`);
    if (!response.ok) {
      throw new Error(`Erro ao buscar detalhes da criptomoeda: ${response.status}`);
    }
    const data = await response.json();
    return data.genesis_date || null; // Retorna a data de criação ou null
  } catch (error) {
    console.error(`Erro ao buscar detalhes da criptomoeda ${coinId}:`, error);
    return null;
  }
}

// Função para filtrar criptomoedas com no máximo 5 dias de existência
async function filterRecentCryptos(data) {
  const currentDate = new Date();
  const recentCryptos = [];

  for (const coin of data) {
    const genesisDate = await fetchCoinDetails(coin.id); // Busca a data de criação
    if (genesisDate) {
      const creationDate = new Date(genesisDate);
      const daysSinceCreation = (currentDate - creationDate) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation <= 5) {
        recentCryptos.push({ ...coin, creationDate });
      }
    }
  }

  return recentCryptos;
}

// Função para calcular o score de valorização
function calculateScore(coin) {
  const volumeScore = coin.total_volume || 0;
  const priceChangeScore = coin.price_change_percentage_24h || 0;
  const marketCapScore = coin.market_cap || 0;

  // Pesos para cada métrica
  const weights = {
    volume: 0.4,
    priceChange: 0.3,
    marketCap: 0.3,
  };

  return (
    (volumeScore * weights.volume) +
    (priceChangeScore * weights.priceChange) +
    (marketCapScore * weights.marketCap)
  );
}

// Função para gerar o PDF
async function generatePDF() {
  const data = await fetchCryptoData();
  if (!data.length) return;

  // Filtrar criptomoedas recentes
  const recentCryptos = await filterRecentCryptos(data);

  // Calcular scores e ordenar
  const analyzedData = recentCryptos.map(coin => ({
    name: coin.name,
    symbol: coin.symbol,
    volume: coin.total_volume || 0,
    priceChange: coin.price_change_percentage_24h || 0,
    marketCap: coin.market_cap || 0,
    creationDate: coin.creationDate.toLocaleDateString(),
    score: calculateScore(coin),
  }));

  // Ordenar por score e pegar as top 15
  const top15Cryptos = analyzedData
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  // Criar PDF
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Título e explicação
  doc.setFontSize(16);
  doc.text('Top 15 Criptomoedas Recentes com Potencial de Valorização', 10, 10);

  doc.setFontSize(12);
  doc.text('Este relatório lista as 15 criptomoedas que nasceram nos últimos 5 dias e têm maior potencial de valorização.', 10, 20);
  doc.text('As métricas utilizadas incluem volume de transações, variação de preço e capitalização de mercado.', 10, 30);

  // Listar as top 15 criptomoedas
  doc.setFontSize(14);
  doc.text('Top 15 Criptomoedas:', 10, 40);
  doc.setFontSize(12);
  let yPosition = 50;

  top15Cryptos.forEach((coin, index) => {
    const line1 = `${index + 1}. ${coin.name} (${coin.symbol.toUpperCase()})`;
    const line2 = `Volume: $${coin.volume.toLocaleString()} | Price Change: ${coin.priceChange.toFixed(2)}% | Market Cap: $${coin.marketCap.toLocaleString()} | Score: ${coin.score.toFixed(2)}`;
    const line3 = `Criada em: ${coin.creationDate}`;
    
    doc.text(line1, 10, yPosition);
    yPosition += 10;
    doc.text(line2, 10, yPosition);
    yPosition += 10;
    doc.text(line3, 10, yPosition);
    yPosition += 10;

    if (yPosition > 280) { // Se ultrapassar o limite da página
      doc.addPage();
      yPosition = 10; // Reinicia a posição no topo
    }
  });

  doc.save('top_15_recent_cryptos.pdf');
}

// Adicionar evento ao botão
document.getElementById('generate3').addEventListener('click', generatePDF);