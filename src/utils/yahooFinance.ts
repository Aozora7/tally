interface YahooChartResponse {
  chart: {
    result: {
      timestamp: number[];
      indicators: {
        quote: {
          close: (number | null)[];
        }[];
      };
    }[];
    error: { code: string; description: string } | null;
  };
}

export async function fetchMonthlyPrices(
  ticker: string,
  startDate: string,
  endDate: string
): Promise<{ yearMonth: string; price: number }[]> {
  const period1 = Math.floor(new Date(startDate).getTime() / 1000);
  const period2 = Math.floor(new Date(endDate).getTime() / 1000);

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?interval=1mo&period1=${period1}&period2=${period2}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Yahoo Finance request failed: ${response.status} ${response.statusText}`);
  }

  const data: YahooChartResponse = await response.json();

  if (data.chart.error) {
    throw new Error(`Yahoo Finance error: ${data.chart.error.description}`);
  }

  const result = data.chart.result?.[0];
  if (!result) {
    throw new Error('No data returned from Yahoo Finance');
  }

  const timestamps = result.timestamp;
  const closes = result.indicators.quote[0]?.close;
  if (!closes) {
    throw new Error('No price data in Yahoo Finance response');
  }

  const prices: { yearMonth: string; price: number }[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (close == null) continue;

    const date = new Date(timestamps[i]! * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const yearMonth = `${year}-${month}`;

    prices.push({
      yearMonth,
      price: Math.round(close * 10000),
    });
  }

  return prices;
}
