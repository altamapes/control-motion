"use client";

import { useEffect, useMemo, useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertTriangle, Copy } from "lucide-react";

const models = [
  { label: "Kling 2.6 Standard", value: "kling-v2-6-motion-control-std" },
  { label: "Kling 2.6 Pro", value: "kling-v2-6-motion-control-pro" },
  { label: "Kling 3 Standard", value: "kling-v3-motion-control-std" },
  { label: "Kling 3 Pro", value: "kling-v3-motion-control-pro" },
];

function FileBox({ title, hint, accept, file, onFile }) {
  return (
    <label className="card block p-4">
      <div className="label mb-2">
        {title} <span className="small normal-case">{hint}</span>
      </div>
      <div className="drop flex min-h-[138px] cursor-pointer flex-col items-center justify-center gap-3 text-center">
        <Upload size={28} color="#ffd21a" />
        <div className="small">
          {file ? file.name : "Click atau drag file ke sini"}
        </div>
      </div>
      <input
        className="hidden"
        type="file"
        accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />
    </label>
  );
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [model, setModel] = useState("kling-v2-6-motion-control-std");
  const [prompt, setPrompt] = useState("");
  const [orientation, setOrientation] = useState("video");
  const [cfgScale, setCfgScale] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState("");
  const [status, setStatus] = useState("");
  const [resultVideo, setResultVideo] = useState("");
  const [error, setError] = useState("");
  const [raw, setRaw] = useState(null);

  const canGenerate = useMemo(() => {
    return (imageFile || imageUrl) && (videoFile || videoUrl) && !loading;
  }, [imageFile, imageUrl, videoFile, videoUrl, loading]);

  async function upload(file) {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload gagal");
    return data.url;
  }

  async function generate() {
    setLoading(true);
    setError("");
    setTaskId("");
    setStatus("uploading");
    setResultVideo("");
    setRaw(null);

    try {
      let finalImageUrl = imageUrl.trim();
      let finalVideoUrl = videoUrl.trim();

      if (!finalImageUrl && imageFile) {
        finalImageUrl = await upload(imageFile);
        setImageUrl(finalImageUrl);
      }

      if (!finalVideoUrl && videoFile) {
        finalVideoUrl = await upload(videoFile);
        setVideoUrl(finalVideoUrl);
      }

      setStatus("creating task");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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

      const data = await res.json();
      setRaw(data);

      if (!res.ok) throw new Error(data.error || "Generate gagal");

      const id = data.task_id;
      if (!id) {
        throw new Error("Task ID tidak ditemukan dari response API. Cek Raw Response.");
      }

      setTaskId(id);
      setStatus("processing");
    } catch (err) {
      setError(err.message);
      setStatus("failed");
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    if (!taskId) return;

    setError("");

    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model,
          taskId,
        }),
      });

      const data = await res.json();
      setRaw(data);

      if (!res.ok) throw new Error(data.error || "Gagal cek status");

      const normalizedStatus = data?.normalized?.status || "unknown";
      setStatus(normalizedStatus);

      if (data?.normalized?.videoUrl) {
        setResultVideo(data.normalized.videoUrl);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!taskId || resultVideo) return;

    const timer = setInterval(() => {
      checkStatus();
    }, 10000);

    return () => clearInterval(timer);
  }, [taskId, resultVideo, apiKey, model]);

  async function copyTask() {
    await navigator.clipboard.writeText(taskId);
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Magnific Kling Motion Control</h1>
        <p className="small mt-2">
          Upload reference image + reference video, lalu generate video AI. API key tidak disimpan.
        </p>
      </div>

      <div className="grid gap-5">
        <section className="card p-5">
          <div className="label mb-2">API KEY <span className="small normal-case">Magnific / Freepik API key — tidak disimpan</span></div>
          <input
            className="input"
            type="password"
            placeholder="sk-mag-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="small mt-2">
            Bisa juga kosongkan form ini jika sudah mengisi MAGNIFIC_API_KEY di Vercel.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <FileBox
            title="REFERENCE IMAGE"
            hint="JPG, PNG, WebP · max 10 MB"
            accept="image/jpeg,image/png,image/webp"
            file={imageFile}
            onFile={setImageFile}
          />
          <FileBox
            title="REFERENCE VIDEO"
            hint="MP4, MOV, WebM · 3-30 detik"
            accept="video/mp4,video/quicktime,video/webm"
            file={videoFile}
            onFile={setVideoFile}
          />
        </section>

        <section className="card p-5">
          <div className="label mb-2">Atau pakai URL publik</div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="input"
              placeholder="Image URL publik"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <input
              className="input"
              placeholder="Video URL publik"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>
          <p className="small mt-2">
            Jika upload lokal gagal, isi URL publik dari Cloudinary, Google Drive direct, atau hosting lain.
          </p>
        </section>

        <section className="card p-5">
          <div className="label mb-2">MODEL</div>
          <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </section>

        <section className="card p-5">
          <div className="label mb-2">PROMPT <span className="small normal-case">Optional</span></div>
          <textarea
            className="input min-h-[120px]"
            placeholder="e.g. The character walks forward slowly..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2500}
          />
          <div className="small mt-2">{prompt.length}/2500</div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="card p-5">
            <div className="label mb-2">CHARACTER ORIENTATION</div>
            <select className="input" value={orientation} onChange={(e) => setOrientation(e.target.value)}>
              <option value="video">Video (default)</option>
              <option value="image">Image</option>
            </select>
          </div>

          <div className="card p-5">
            <div className="label mb-2">CFG SCALE <span className="small normal-case">0.50 · 0 = free, 1 = strict</span></div>
            <div className="flex items-center gap-3">
              <span className="small">0</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={cfgScale}
                onChange={(e) => setCfgScale(e.target.value)}
              />
              <span className="small">1</span>
              <span className="w-10 text-right text-sm font-bold">{Number(cfgScale).toFixed(2)}</span>
            </div>
          </div>
        </section>

        <button className="btn flex items-center justify-center gap-2" onClick={generate} disabled={!canGenerate}>
          {loading ? <Loader2 className="animate-spin" size={18} /> : null}
          {loading ? "Processing..." : "Generate Video"}
        </button>

        {(taskId || status || error || resultVideo) && (
          <section className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              {error ? <AlertTriangle color="#ff5c5c" /> : resultVideo ? <CheckCircle2 color="#49e17c" /> : <Loader2 className="animate-spin" color="#ffd21a" />}
              <h2 className="text-xl font-black">Result</h2>
            </div>

            {status && <p className="small mb-2">Status: <b className="text-white">{status}</b></p>}

            {taskId && (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-black px-3 py-2 text-xs text-yellow-200">{taskId}</code>
                <button type="button" onClick={copyTask} className="w-auto rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold text-white">
                  <Copy size={13} className="inline" /> Copy Task ID
                </button>
                <button type="button" onClick={checkStatus} className="w-auto rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold text-white">
                  Cek Status
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {resultVideo && (
              <div className="mt-4">
                <video className="w-full rounded-xl border border-yellow-500/20" controls src={resultVideo} />
                <a className="mt-3 inline-block text-yellow-300 underline" href={resultVideo} target="_blank">
                  Buka / download video
                </a>
              </div>
            )}

            {raw && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-yellow-300">Raw Response</summary>
                <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-black p-4 text-xs text-zinc-300">
                  {JSON.stringify(raw, null, 2)}
                </pre>
              </details>
            )}
          </section>
        )}

        <section className="card p-5">
          <h2 className="mb-2 text-xl font-black">Setup Upload Lokal</h2>
          <p className="small">
            Agar upload file dari komputer bisa menjadi URL publik, isi Environment Variable Vercel:
          </p>
          <pre className="mt-3 overflow-auto rounded-xl bg-black p-4 text-xs text-zinc-300">{`MAGNIFIC_API_KEY=sk-mag-xxxx
CLOUDINARY_CLOUD_NAME=nama_cloud
CLOUDINARY_UPLOAD_PRESET=unsigned_preset`}</pre>
          <p className="small mt-3">
            Tanpa Cloudinary, aplikasi tetap bisa generate jika kamu memasukkan Image URL dan Video URL publik langsung.
          </p>
        </section>
      </div>
    </main>
  );
}
