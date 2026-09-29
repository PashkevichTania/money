import process from 'node:process';

const headers = { 'Cache-Control': 'no-store' };

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const base = (params.get('base') ?? '').trim().toUpperCase();
  if (params.getAll('base').length !== 1 || !/^[A-Z]{3}$/.test(base)) {
    return Response.json(
      { error: 'Invalid base currency' },
      { status: 400, headers }
    );
  }
  const key = process.env.EXCHANGE_RATE_API_KEY?.trim();
  if (!key) {
    return Response.json(
      { error: 'Rates unavailable' },
      { status: 503, headers }
    );
  }
  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/latest/${base}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!response.ok) throw new Error('Upstream failure');
    const data = await response.json();
    if (
      data.result !== 'success' ||
      data.base_code !== base ||
      !Number.isFinite(data.time_last_update_unix) ||
      data.time_last_update_unix <= 0 ||
      !Number.isFinite(data.time_next_update_unix) ||
      data.time_next_update_unix <= data.time_last_update_unix ||
      !data.conversion_rates ||
      typeof data.conversion_rates !== 'object' ||
      Array.isArray(data.conversion_rates) ||
      data.conversion_rates[base] !== 1 ||
      !Object.entries(data.conversion_rates).every(
        ([code, rate]) =>
          /^[A-Z]{3}$/.test(code) &&
          typeof rate === 'number' &&
          Number.isFinite(rate) &&
          rate > 0
      )
    )
      throw new Error('Invalid upstream response');
    return Response.json(
      {
        base,
        rates: data.conversion_rates,
        date: new Date(data.time_last_update_unix * 1000)
          .toISOString()
          .slice(0, 10),
        nextUpdate: data.time_next_update_unix * 1000,
      },
      { headers }
    );
  } catch {
    // Never expose upstream URLs, credentials or provider error details.
    return Response.json(
      { error: 'Rates unavailable' },
      { status: 502, headers }
    );
  }
}
