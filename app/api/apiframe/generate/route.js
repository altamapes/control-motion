export const runtime = 'nodejs';

const APIFRAME_BASE_URL = process.env.APIFRAME_BASE_URL || 'https://api.apiframe.ai/v2';

function normalizeStatus(status) {
  const value = String(status || '').toUpperCase();
  if (['COMPLETED', 'SUCCESS', 'SUCCEEDED', 'DONE', 'FINISHED'].includes(value)) return 'completed';
  if (['FAILED', 'ERROR', 'CANCELED', 'CANCELLED'].includes(value)) return 'failed';
  if (['PROCESSING', 'RUNNING', 'IN_PROGRESS', 'PENDING'].includes(value)) return 'processing';
  return value ? value.toLowerCase() : 'queued';
}

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

function extractTaskId(data) {
  return (
    data?.jobId ||
    data?.job_id ||
    data?.taskId ||
    data?.task_id ||
    data?.id ||
    data?.data?.jobId ||
    data?.data?.job_id ||
    data?.data?.taskId ||
    data?.data?.task_id ||
    data?.data?.id ||
    data?.result?.jobId ||
    data?.result?.job_id ||
    data?.result?.taskId ||
    data?.result?.task_id ||
    data?.result?.id ||
    deepFind(data, (key, value) => ['jobId', 'job_id', 'taskId', 'task_id', 'id'].includes(key) && typeof value === 'string') ||
    null
  );
}

export async function POST(req) {
  try {
    const apiKey = process.env.APIFRAME_API_KEY?.trim();
    if (!apiKey) {
      return Response.json({ error: 'APIFRAME_API_KEY belum diset di Vercel Environment Variables.' }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return Response.json({ error: 'Request body bukan JSON yang valid.' }, { status: 400 });

    const prompt = String(body.prompt || '').trim();
    if (!prompt) return Response.json({ error: 'Prompt wajib diisi untuk Apiframe.' }, { status: 400 });

    const payload = {
  model,
  prompt:
    body.prompt?.trim() ||
    "Create a cinematic AI video from the uploaded reference image. Smooth motion, natural camera movement, realistic lighting, high detail.",
};

if (body.imageUrl) {
  payload.image_url = body.imageUrl;
}
    

    const response = await fetch(`${APIFRAME_BASE_URL}/videos/generate`, {
      method: 'POST',
    headers: {
  "Content-Type": "application/json",
  "X-API-Key": apiKey,
},
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : { text: await response.text().catch(() => '') };

    if (!response.ok) {
  return Response.json(
    {
      error:
        typeof data === "string"
          ? data
          : data?.error ||
            data?.message ||
            data?.detail ||
            data?.details ||
            JSON.stringify(data, null, 2) ||
            "Generate video Apiframe gagal.",
      details: data,
      sentPayload: payload,
    },
    { status: response.status }
  );
}

    const taskId = extractTaskId(data);
    if (!taskId) {
      return Response.json({ error: 'Apiframe tidak mengembalikan jobId/taskId.', raw: data }, { status: 500 });
    }

    return Response.json({
      success: true,
      provider: 'apiframe',
      taskId,
      task_id: taskId,
      status: normalizeStatus(data?.status || data?.data?.status || data?.result?.status),
      videoUrl: null,
      raw: data,
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error Apiframe generate.' }, { status: 500 });
  }
}
