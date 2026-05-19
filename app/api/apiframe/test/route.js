export const runtime = "nodejs";

const BASE_URL = "https://api.apiframe.ai/v2";

export async function GET() {
  const apiKey = process.env.APIFRAME_API_KEY?.trim();

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        error: "APIFRAME_API_KEY kosong / belum terbaca di Vercel.",
      },
      { status: 500 }
    );
  }

  const checks = [];

  const authModes = [
    {
      name: "Authorization Bearer",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
    {
      name: "X-API-Key",
      headers: {
        "X-API-Key": apiKey,
      },
    },
    {
      name: "x-api-key lowercase",
      headers: {
        "x-api-key": apiKey,
      },
    },
  ];

  for (const mode of authModes) {
    try {
      const response = await fetch(`${BASE_URL}/jobs/test`, {
        method: "GET",
        headers: mode.headers,
      });

      const text = await response.text();

      checks.push({
        mode: mode.name,
        status: response.status,
        response: text.slice(0, 500),
      });
    } catch (error) {
      checks.push({
        mode: mode.name,
        error: error?.message || String(error),
      });
    }
  }

  return Response.json({
    ok: true,
    keyLoaded: true,
    keyPrefix: apiKey.slice(0, 4),
    keyLength: apiKey.length,
    checks,
  });
}