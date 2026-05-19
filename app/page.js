'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  MonitorSmartphone,
  Play,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wand2,
  Zap,
} from 'lucide-react';

const MODELS = [
  { label: 'Kling 2.6 Standard', value: 'kling-v2-6-motion-control-std', tag: 'Stable' },
  { label: 'Kling 2.6 Pro', value: 'kling-v2-6-motion-control-pro', tag: 'Quality' },
  { label: 'Kling 3 Standard', value: 'kling-v3-motion-control-std', tag: 'New' },
  { label: 'Kling 3 Pro', value: 'kling-v3-motion-control-pro', tag: 'Best' },
];

const MAX_IMAGE_MB = 25;
const MAX_VIDEO_MB = 250;

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

function cx(...items) {
  return items.filter(Boolean).join(' ');
}

function useObjectUrl(file) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) {
      setUrl('');
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);
  return url;
}

function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }
  }, []);
  return null;
}

function FileBox({ kind, title, hint, accept, file, onFile, maxMb }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const previewUrl = useObjectUrl(file);
  const isVideo = kind === 'video';

  const handleFile = useCallback(
    (selected) => {
      if (!selected) return;
      const limit = maxMb * 1024 * 1024;
      if (selected.size > limit) {
        alert(`${title} terlalu besar. Maksimal ${maxMb}MB.`);
        return;
      }
      onFile(selected);
    },
    [maxMb, onFile, title]
  );

  return (
    <div
      className={cx('drop relative overflow-hidden p-5', dragging && 'border-yellow-300')}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="relative z-10 flex h-full min-h-[145px] flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="label mb-2">{title}</div>
            <p className="text-sm text-zinc-300">{hint}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-yellow-200">
            {isVideo ? <FileVideo size={22} /> : <ImageIcon size={22} />}
          </div>
        </div>

        {file ? (
          <div className="grid gap-4 sm:grid-cols-[120px_1fr] sm:items-center">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {isVideo ? (
                <video src={previewUrl} muted playsInline className="h-28 w-full object-cover" />
              ) : (
                <img src={previewUrl} alt="Preview" className="h-28 w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-black text-white">{file.name}</p>
              <p className="small mt-1">{formatBytes(file.size)} · siap diupload langsung ke Cloudinary</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-ghost text-xs" onClick={() => inputRef.current?.click()}>
                  Ganti file
                </button>
                <button type="button" className="btn-ghost text-xs" onClick={() => onFile(null)}>
                  Hapus
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 py-8 text-center transition hover:bg-black/30"
          >
            <UploadCloud className="mb-3 text-yellow-200" size={34} />
            <span className="font-black">Klik atau drag file ke sini</span>
            <span className="small mt-1">Maksimal {maxMb}MB · upload langsung browser ke Cloudinary</span>
          </button>
        )}
      </div>
    </div>
  );
}

function Step({ number, title, text, active }) {
  return (
    <div className={cx('rounded-2xl border p-4', active ? 'border-yellow-300/40 bg-yellow-300/10' : 'border-white/10 bg-white/[0.04]')}>
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-black text-yellow-200">{number}</span>
        <b>{title}</b>
      </div>
      <p className="small leading-relaxed">{text}</p>
    </div>
  );
}

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['succeeded', 'success', 'completed', 'complete', 'done', 'finished'].includes(value)) return 'completed';
  if (['failed', 'error', 'canceled', 'cancelled'].includes(value)) return 'failed';
  if (['processing', 'running', 'pending', 'queued', 'created', 'in_progress'].includes(value)) return 'processing';
  return value || 'unknown';
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [model, setModel] = useState('kling-v3-motion-control-std');
  const [prompt, setPrompt] = useState('');
  const [orientation, setOrientation] = useState('video');
  const [cfgScale, setCfgScale] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [taskId, setTaskId] = useState('');
  const [status, setStatus] = useState('idle');
  const [resultVideo, setResultVideo] = useState('');
  const [error, setError] = useState('');
  const [raw, setRaw] = useState(null);
  const [autoPoll, setAutoPoll] = useState(true);

  const canGenerate = useMemo(() => {
    return Boolean((imageFile || imageUrl.trim()) && (videoFile || videoUrl.trim()) && !loading);
  }, [imageFile, imageUrl, loading, videoFile, videoUrl]);

console.log("DEBUG CLOUDINARY:", {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
});
  
  async function uploadToCloudinary(file, type) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !preset) {
      throw new Error('Cloudinary belum diset. Isi NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET di Vercel.');
    }

    const resourceType = type === 'video' ? 'video' : 'image';
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', preset);
    form.append('folder', 'motion-control');

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
      method: 'POST',
      body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `Upload ${type} ke Cloudinary gagal. Pastikan preset Cloudinary mode Unsigned.`);
    }
    return data.secure_url;
  }

  async function generate() {
    setLoading(true);
    setError('');
    setRaw(null);
    setTaskId('');
    setResultVideo('');
    setStatus('uploading');
    setUploadProgress('Menyiapkan file...');

    try {
      let finalImageUrl = imageUrl.trim();
      let finalVideoUrl = videoUrl.trim();

      if (!finalImageUrl && imageFile) {
        setUploadProgress('Mengupload image ke Cloudinary...');
        finalImageUrl = await uploadToCloudinary(imageFile, 'image');
        setImageUrl(finalImageUrl);
      }

      if (!finalVideoUrl && videoFile) {
        setUploadProgress('Mengupload video ke Cloudinary...');
        finalVideoUrl = await uploadToCloudinary(videoFile, 'video');
        setVideoUrl(finalVideoUrl);
      }

      setStatus('creating');
      setUploadProgress('Membuat task generate video...');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          imageUrl: finalImageUrl,
          videoUrl: finalVideoUrl,
          model,
          prompt,
          orientation,
          cfgScale,
        }),
      });

      const data = await res.json().catch(() => ({}));
      setRaw(data);
      if (!res.ok) throw new Error(data.error || 'Generate gagal.');

      const id = data.task_id;
      if (!id) {
        throw new Error('Task ID tidak ditemukan dari response API. Buka Raw Response untuk melihat format response.');
      }

      setTaskId(id);
      setStatus('processing');
      setUploadProgress('Task dibuat. Menunggu hasil video...');

      if (data.video_url) {
        setResultVideo(data.video_url);
        setStatus('completed');
      }
    } catch (err) {
      setError(err?.message || 'Terjadi error.');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    if (!taskId) return;
    setError('');
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim(), model, taskId }),
      });
      const data = await res.json().catch(() => ({}));
      setRaw(data);
      if (!res.ok) throw new Error(data.error || 'Gagal cek status.');

      const nextStatus = normalizeStatus(data?.normalized?.status || data?.status || data?.state);
      setStatus(nextStatus);

      const video = data?.normalized?.videoUrl || data?.video_url || data?.videoUrl || data?.url;
      if (video) {
        setResultVideo(video);
        setStatus('completed');
      }
    } catch (err) {
      setError(err?.message || 'Status error.');
    }
  }

  useEffect(() => {
    if (!autoPoll || !taskId || resultVideo || status === 'failed') return;
    const timer = setInterval(checkStatus, 10000);
    return () => clearInterval(timer);
  }, [autoPoll, taskId, resultVideo, status, apiKey, model]);

  async function copy(text) {
    await navigator.clipboard.writeText(text);
  }

  const progressIndex = status === 'idle' ? 0 : status === 'uploading' ? 1 : status === 'creating' ? 2 : ['processing', 'unknown'].includes(status) ? 3 : status === 'completed' ? 4 : 0;

  return (
    <>
      <PwaRegister />
      <main className="relative mx-auto min-h-screen w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-7 grid gap-5 lg:grid-cols-[1.3fr_.7fr] lg:items-stretch">
          <section className="glass overflow-hidden rounded-[32px] p-6 sm:p-8 lg:p-10">
            <div className="mb-6 flex flex-wrap gap-2">
              <span className="badge"><Sparkles size={14} /> Professional UI</span>
              <span className="badge"><MonitorSmartphone size={14} /> Mobile + PWA</span>
              <span className="badge"><Cloud size={14} /> Direct Cloudinary Upload</span>
            </div>
            <div className="max-w-3xl">
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Motion Control <span className="bg-gradient-to-r from-yellow-200 via-orange-300 to-purple-300 bg-clip-text text-transparent">AI Studio</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
                Upload reference image dan video besar langsung ke Cloudinary, lalu generate AI motion video dengan API Magnific / Freepik. Tampilan dibuat lebih rapi, cepat, responsif, dan siap dipasang ke Vercel.
              </p>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => document.getElementById('generator')?.scrollIntoView()} className="btn-primary inline-flex items-center justify-center gap-2">
                Mulai Generate <ArrowRight size={18} />
              </button>
              <a href="#setup" className="btn-ghost inline-flex items-center justify-center gap-2 text-center">
                Lihat Setup <ShieldCheck size={18} />
              </a>
            </div>
          </section>

          <aside className="card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="label mb-1">Pipeline</div>
                <h2 className="text-2xl font-black">Proses Generate</h2>
              </div>
              <div className="rounded-2xl bg-yellow-300/15 p-3 text-yellow-200"><Rocket size={25} /></div>
            </div>
            <div className="grid gap-3">
              <Step number="1" title="Upload" text="File image/video diupload langsung dari browser ke Cloudinary." active={progressIndex >= 1} />
              <Step number="2" title="Create Task" text="URL publik dikirim ke API untuk membuat task generate." active={progressIndex >= 2} />
              <Step number="3" title="Polling" text="Aplikasi otomatis cek status setiap 10 detik." active={progressIndex >= 3} />
              <Step number="4" title="Result" text="Video hasil generate muncul dan bisa dibuka/download." active={progressIndex >= 4} />
            </div>
          </aside>
        </header>

        <section id="generator" className="grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
          <div className="grid content-start gap-6">
            <div className="card p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3 text-yellow-200"><Clapperboard size={22} /></div>
                <div>
                  <div className="label">Input Media</div>
                  <h2 className="text-2xl font-black">Reference Files</h2>
                </div>
              </div>

              <div className="grid gap-4">
                <FileBox
                  kind="image"
                  title="Reference Image"
                  hint="Gambar karakter / subject utama"
                  accept="image/*"
                  file={imageFile}
                  onFile={setImageFile}
                  maxMb={MAX_IMAGE_MB}
                />
                <FileBox
                  kind="video"
                  title="Reference Video"
                  hint="Video motion / gerakan yang ingin ditiru"
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  file={videoFile}
                  onFile={setVideoFile}
                  maxMb={MAX_VIDEO_MB}
                />
              </div>
            </div>

            <div className="card p-5 sm:p-6">
              <div className="label mb-4">Atau pakai URL publik</div>
              <div className="grid gap-4">
                <div>
                  <label className="small mb-2 block">Image URL</label>
                  <input className="input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://.../image.jpg" />
                </div>
                <div>
                  <label className="small mb-2 block">Video URL</label>
                  <input className="input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://.../motion.mp4" />
                </div>
              </div>
              <p className="small mt-4 leading-relaxed">Kalau URL sudah diisi, aplikasi tidak akan upload file lokal. Pastikan URL bisa dibuka publik.</p>
            </div>
          </div>

          <div className="grid content-start gap-6">
            <div className="card p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3 text-yellow-200"><Wand2 size={22} /></div>
                <div>
                  <div className="label">Generate Settings</div>
                  <h2 className="text-2xl font-black">Motion Control</h2>
                </div>
              </div>

              <div className="grid gap-5">
                <div>
                  <label className="label mb-2">API Key</label>
                  <input
                    className="input"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Kosongkan jika MAGNIFIC_API_KEY sudah di Vercel"
                    type="password"
                    autoComplete="off"
                  />
                  <p className="small mt-2">API key tidak disimpan di browser. Untuk production, lebih aman isi di Environment Vercel.</p>
                </div>

                <div>
                  <label className="label mb-2">Model</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {MODELS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setModel(item.value)}
                        className={cx(
                          'rounded-2xl border p-4 text-left transition',
                          model === item.value ? 'border-yellow-300/60 bg-yellow-300/12' : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <b>{item.label}</b>
                          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-yellow-200">{item.tag}</span>
                        </div>
                        <p className="small">{item.value}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label mb-2">Prompt Optional</label>
                  <textarea
                    className="input min-h-[132px] resize-y"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    maxLength={2500}
                    placeholder="Contoh: cinematic camera motion, realistic face, smooth body movement, natural lighting..."
                  />
                  <div className="mt-2 flex justify-between gap-3"><p className="small">Tambahkan detail gerakan, lighting, cinematic style.</p><p className="small">{prompt.length}/2500</p></div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label mb-2">Character Orientation</label>
                    <select className="input" value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                      <option value="video">Video - ikuti video motion</option>
                      <option value="image">Image - ikuti image subject</option>
                    </select>
                  </div>
                  <div>
                    <label className="label mb-2">CFG Scale: {Number(cfgScale).toFixed(2)}</label>
                    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-5">
                      <input type="range" min="0" max="1" step="0.01" value={cfgScale} onChange={(e) => setCfgScale(e.target.value)} />
                      <div className="mt-2 flex justify-between text-xs text-zinc-500"><span>Flexible</span><span>Strict</span></div>
                    </div>
                  </div>
                </div>

                <button className="btn-primary flex items-center justify-center gap-2 text-base" onClick={generate} disabled={!canGenerate}>
                  {loading ? <Loader2 className="animate-spin" size={19} /> : <Zap size={19} />}
                  {loading ? 'Processing...' : 'Generate Video'}
                </button>
              </div>
            </div>

            <div className="card overflow-hidden p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="label">Output</div>
                  <h2 className="text-2xl font-black">Result Video</h2>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-zinc-300">
                  <input type="checkbox" checked={autoPoll} onChange={(e) => setAutoPoll(e.target.checked)} />
                  Auto check
                </label>
              </div>

              <div className="rounded-3xl border border-white/10 bg-black/28 p-4">
                <div className="mb-4 flex items-center gap-3">
                  {error ? <AlertTriangle className="text-rose-300" /> : resultVideo ? <CheckCircle2 className="text-green-300" /> : ['processing', 'uploading', 'creating'].includes(status) ? <Loader2 className="animate-spin text-yellow-200" /> : <Play className="text-zinc-400" />}
                  <div>
                    <p className="font-black capitalize">Status: {status}</p>
                    <p className="small">{uploadProgress || 'Belum ada proses generate.'}</p>
                  </div>
                </div>

                {taskId && (
                  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <code className="prose-code flex-1 text-xs text-yellow-100">{taskId}</code>
                    <button className="btn-ghost text-xs" onClick={() => copy(taskId)}><Copy size={14} className="inline" /> Copy</button>
                    <button className="btn-ghost text-xs" onClick={checkStatus}><RefreshCw size={14} className="inline" /> Cek</button>
                  </div>
                )}

                {error && <div className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">{error}</div>}

                {resultVideo ? (
                  <div>
                    <video className="aspect-video w-full rounded-2xl border border-yellow-300/20 bg-black object-contain" controls src={resultVideo} />
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <a className="btn-primary inline-flex flex-1 items-center justify-center gap-2 text-center" href={resultVideo} target="_blank" rel="noreferrer">
                        <ExternalLink size={17} /> Buka Video
                      </a>
                      <a className="btn-ghost inline-flex flex-1 items-center justify-center gap-2 text-center" href={resultVideo} download>
                        <Download size={17} /> Download
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-black/24 text-center">
                    <Play className="mb-3 text-zinc-500" size={38} />
                    <p className="font-black text-zinc-300">Video result akan tampil di sini</p>
                    <p className="small mt-1">Setelah task selesai, output akan muncul otomatis.</p>
                  </div>
                )}

                {raw && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-bold text-yellow-200">Raw Response</summary>
                    <pre className="mt-3 max-h-80 overflow-auto rounded-2xl bg-black/70 p-4 text-xs text-zinc-300">{JSON.stringify(raw, null, 2)}</pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="setup" className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="card p-5 sm:p-6 lg:col-span-2">
            <div className="label mb-2">Vercel Environment</div>
            <h2 className="text-2xl font-black">Setup yang wajib diisi</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">Untuk mengatasi batas video kecil, project ini tidak mengirim video ke server Vercel. Video diupload langsung dari browser ke Cloudinary, lalu URL publiknya dikirim ke API.</p>
            <pre className="prose-code mt-4 overflow-auto rounded-2xl border border-white/10 bg-black/65 p-4 text-xs leading-6 text-zinc-200">{`MAGNIFIC_API_KEY=sk-mag-xxxx
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset`}</pre>
          </div>
          <div className="card p-5 sm:p-6">
            <div className="label mb-2">Catatan penting</div>
            <ul className="space-y-3 text-sm leading-6 text-zinc-300">
              <li>• Cloudinary preset harus <b>Unsigned</b>.</li>
              <li>• Upload video maksimal di UI diset 250MB.</li>
              <li>• API key lebih aman disimpan di Vercel, bukan diketik user.</li>
              <li>• PWA aktif setelah build production.</li>
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
