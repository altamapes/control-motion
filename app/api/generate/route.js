export const runtime = 'nodejs';

const ENDPOINTS = {
  'kling-v2-6-motion-control-std': '/v1/ai/video/kling-v2-6-motion-control-std',
  'kling-v2-6-motion-control-pro': '/v1/ai/video/kling-v2-6-motion-control-pro',
  'kling-v3-motion-control-std': '/v1/ai/video/kling-v3-motion-control-std',
  'kling-v3-motion-control-pro': '/v1/ai/video/kling-v3-motion-control-pro',
};

function deepFind(obj, matcher) {
  if (!obj || typeof obj !== 'object') return null;
  for (const [key, value] of Object.entries(obj)) {
    if (matcher(key, value)) return value;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = deepFind(item, matcher);
        if (found) return found;
      }
    } else if (value && typeof value === 'object') {
      const found = deepFind(value, matcher);
      if (found) return found;
    }
  }
  return null;
}

function getTaskId(data) {
  return (
    data?.task_id ||
    data?.id ||
    data?.uuid ||
    data?.data?.task_id ||
    data?.data?.id ||
    data?.data?.uuid ||
    data?.result?.task_id ||
    data?.result?.id ||
    data?.task?.id ||
    data?.task?.task_id ||
    deepFind(data, (key, value) => ['task_id', 'taskId', 'id', 'uuid'].includes(key) && typeof value === 'string') ||
    null
  );
}

function getVideoUrl(data) {
  return (
    data?.video_url ||
    data?.videoUrl ||
    data?.url ||
    data?.data?.video_url ||
    data?.data?.videoUrl ||
    data?.data?.url ||
    data?.result?.video_url ||
    data?.result?.videoUrl ||
    data?.result?.url ||
    deepFind(data, (_key, value) => typeof value === 'string' && /https?:\/\/.*\.(mp4|mov|webm)(\?|$)/i.test(value)) ||
    null
  );
}

async function readApiResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json().catch(() => ({}));
    return { type: 'json', data: json, rawText: null, contentType };
  }
  const text = await res.text().catch(() => '');
  return { type: 'text', data: {}, rawText: text, contentType };
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: 'Request body bukan JSON yang valid.' }, { status: 400 });

    const apiKey = body.apiKey || process.env.MAGNIFIC_API_KEY || process.env.FREEPIK_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API key kosong. Isi form API key atau set MAGNIFIC_API_KEY di Vercel.' }, { status: 400 });
    }

    if (!body.imageUrl || !body.videoUrl) {
      return Response.json({ error: 'imageUrl dan videoUrl wajib ada. Upload file dulu atau isi URL publik.' }, { status: 400 });
    }

    const model = body.model || 'kling-v3-motion-control-std';
    const endpoint = ENDPOINTS[model];
    if (!endpoint) return Response.json({ error: 'Model tidak dikenal.', allowedModels: Object.keys(ENDPOINTS) }, { status: 400 });

    const cfgScale = Number(body.cfgScale ?? 0.5);
    const payload = {
      image_url: String(body.imageUrl).trim(),
      video_url: String(body.videoUrl).trim(),
      character_orientation: body.orientation || 'video',
      cfg_scale: Number.isFinite(cfgScale) ? cfgScale : 0.5,
    };

    if (body.prompt && String(body.prompt).trim()) payload.prompt = String(body.prompt).trim();

    const baseUrl = process.env.MAGNIFIC_API_BASE_URL || 'https://api.freepik.com';
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const parsed = await readApiResponse(res);
    if (parsed.type !== 'json') {
      return Response.json(
        {
          error: parsed.rawText || `Server tidak mengembalikan JSON. HTTP ${res.status}`,
          detail: {
            status: res.status,
            contentType: parsed.contentType,
            responsePreview: parsed.rawText?.slice(0, 700) || null,
          },
        },
        { status: res.ok ? 502 : res.status }
      );
    }

    const data = parsed.data;
    if (!res.ok) {
      return Response.json(
        {
          error: data?.message || data?.error || data?.detail || data?.data?.message || data?.data?.error || `Generate gagal. HTTP ${res.status}`,
          detail: data,
        },
        { status: res.status }
      );
    }

    const taskId = getTaskId(data);
    const videoUrl = getVideoUrl(data);
    return Response.json({ success: true, model, task_id: taskId, video_url: videoUrl, raw: data });
  } catch (err) {
    return Response.json({ error: err?.message || 'Generate error.' }, { status: 500 });
  }
}
