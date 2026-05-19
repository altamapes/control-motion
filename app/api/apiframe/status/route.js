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

function extractVideoUrl(data) {
  const direct =
    data?.videoUrl ||
    data?.video_url ||
    data?.url ||
    data?.outputUrl ||
    data?.output_url ||
    data?.data?.videoUrl ||
    data?.data?.video_url ||
    data?.data?.url ||
    data?.data?.outputUrl ||
    data?.data?.output_url ||
    data?.result?.videoUrl ||
    data?.result?.video_url ||
    data?.result?.url ||
    data?.result?.outputUrl ||
    data?.result?.output_url;
  if (typeof direct === 'string' && /^https?:\/\//i.test(direct)) return direct;

  if (Array.isArray(data?.result)) {
    for (const item of data.result) {
      if (typeof item === 'string' && /^https?:\/\//i.test(item)) return item;
      if (item && typeof item === 'object') {
        const nested = extractVideoUrl(item);
        if (nested) return nested;
      }
    }
  }

  return deepFind(data, (_key, value) => typeof value === 'string' && /^https?:\/\//i.test(value) && /(mp4|mov|webm|video|cloudinary)/i.test(value));
}

function extractStatus(data) {
  return (
    data?.status ||
    data?.state ||
    data?.data?.status ||
    data?.data?.state ||
    data?.result?.status ||
    data?.result?.state ||
    data?.job?.status ||
    data?.job?.state ||
    'queued'
  );
}

export async function POST(req) {
  try {
    const apiKey = process.env.APIFRAME_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'APIFRAME_API_KEY belum diset di Vercel Environment Variables.' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const taskId = body.taskId || body.task_id || body.jobId || body.job_id;
    if (!taskId) return Response.json({ error: 'taskId/jobId Apiframe wajib diisi.' }, { status: 400 });

    const response = await fetch(`${APIFRAME_BASE_URL}/jobs/${taskId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : { text: await response.text().catch(() => '') };

    if (!response.ok) {
      return Response.json(
        { error: data?.error || data?.message || data?.detail || data?.text || 'Cek status Apiframe gagal.', details: data },
        { status: response.status }
      );
    }

    const status = normalizeStatus(extractStatus(data));
    const videoUrl = extractVideoUrl(data);

    return Response.json({
      success: true,
      provider: 'apiframe',
      taskId,
      task_id: taskId,
      status,
      progress: data?.progress ?? data?.data?.progress ?? null,
      videoUrl,
      video_url: videoUrl,
      error: data?.error || data?.message || null,
      raw: data,
      normalized: { status, videoUrl },
    });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error Apiframe status.' }, { status: 500 });
  }
}
