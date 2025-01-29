const API_KEYs = 'befc1acc-6f0d-4365-a5b4-d913a7f0f0c6'; // Substitua pela sua chave de API
const URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';

// Função para buscar as criptos lançadas nos últimos 5 dias
async function fetchCryptos() {
  try {
    const response = await fetch(URL, {
      method: 'GET',
      headers: {
        'X-CMC_PRO_API_KEY': API_KEYs,
        'Accept': 'application/json',
      }
    });
    const data = await response.json();

    // Filtra criptos lançadas nos últimos 5 dias e com tendência de alta
    const cryptos = data.data.filter(crypto => {
      const launchDate = new Date(crypto.date_added); // Data de lançamento
      const today = new Date();
      const diffDays = (today - launchDate) / (1000 * 3600 * 24); // Diferença em dias
      const priceChange = crypto.quote.USD.percent_change_24h; // Mudança de preço nos últimos 24h

      // Retorna criptos com menos de 5 dias de lançamento e com tendência de alta (preço subindo)
      return diffDays <= 5 && priceChange > 0;
    });

    return cryptos;
  } catch (error) {
    console.error('Erro ao buscar criptos:', error);
  }
}

// Função para gerar o PDF
async function generatePDF() {
  const cryptos = await fetchCryptos();
  if (cryptos.length === 0) {
    alert('Não há criptos lançadas nos últimos 5 dias com tendência de alta.');
    return;
  }

  const doc = new jsPDF();
  doc.text('Criptos Recentes com Tendência de Alta', 20, 20);
  
  cryptos.forEach((crypto, index) => {
    const yPosition = 30 + index * 10;
    doc.text(`Nome: ${crypto.name}`, 20, yPosition);
    doc.text(`Símbolo: ${crypto.symbol}`, 20, yPosition + 5);
    doc.text(`Preço: $${crypto.quote.USD.price.toFixed(2)}`, 20, yPosition + 10);
    doc.text(`Lançamento: ${crypto.date_added.split('T')[0]}`, 20, yPosition + 15);
    doc.text(`Mudança 24h: ${crypto.quote.USD.percent_change_24h}%`, 20, yPosition + 20);
  });

  doc.save('cripto_tendencia_alta.pdf');
}

// Event listener para o botão de gerar PDF
document.getElementById('generate3').addEventListener('click', generatePDF);
