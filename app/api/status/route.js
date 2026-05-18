export const runtime = 'nodejs';

const STATUS_ENDPOINTS = {
  'kling-v2-6-motion-control-std': '/v1/ai/image-to-video/kling-v2-6',
  'kling-v2-6-motion-control-pro': '/v1/ai/image-to-video/kling-v2-6',
  'kling-v3-motion-control-std': '/v1/ai/video/kling-v3-motion-control-std',
  'kling-v3-motion-control-pro': '/v1/ai/video/kling-v3-motion-control-pro',
};

function findVideoUrl(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const keys = ['video_url', 'videoUrl', 'url', 'download_url', 'downloadUrl', 'output_url', 'outputUrl'];
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && /https?:\/\//i.test(value) && /(\.mp4|\.mov|\.webm|cloudinary|video)/i.test(value)) return value;
  }
  for (const value of Object.values(obj)) {
    if (typeof value === 'string' && /https?:\/\/.*\.(mp4|mov|webm)(\?|$)/i.test(value)) return value;
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findVideoUrl(item);
        if (found) return found;
      }
    } else if (value && typeof value === 'object') {
      const found = findVideoUrl(value);
      if (found) return found;
    }
  }
  return null;
}

function findStatus(data) {
  return (
    data?.status ||
    data?.state ||
    data?.data?.status ||
    data?.data?.state ||
    data?.task?.status ||
    data?.task?.state ||
    data?.result?.status ||
    data?.result?.state ||
    'unknown'
  ).toString();
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = body.apiKey || process.env.MAGNIFIC_API_KEY || process.env.FREEPIK_API_KEY;
    const taskId = body.taskId;
    const model = body.model || 'kling-v3-motion-control-std';

    if (!apiKey) return Response.json({ error: 'API key kosong.' }, { status: 400 });
    if (!taskId) return Response.json({ error: 'Task ID kosong.' }, { status: 400 });

    const basePath = STATUS_ENDPOINTS[model];
    if (!basePath) return Response.json({ error: 'Model tidak dikenal.' }, { status: 400 });

    const baseUrl = process.env.MAGNIFIC_STATUS_BASE_URL || 'https://api.magnific.com';
    const res = await fetch(`${baseUrl}${basePath}/${taskId}`, {
      method: 'GET',
      headers: {
        'x-freepik-api-key': apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json().catch(() => ({})) : { text: await res.text().catch(() => '') };

    if (!res.ok) {
      return Response.json(
        { error: data?.message || data?.error || data?.detail || 'Gagal cek status.', detail: data },
        { status: res.status }
      );
    }

    return Response.json({
      ...data,
      normalized: {
        status: findStatus(data),
        videoUrl: findVideoUrl(data),
      },
    });
  } catch (err) {
    return Response.json({ error: err?.message || 'Status error.' }, { status: 500 });
  }
}
