# Motion Control AI Studio — Professional PWA

Project Next.js siap deploy untuk generator video motion control menggunakan API Magnific / Freepik.

## Fitur

- UI professional responsive desktop + mobile
- PWA support (`manifest.json`, service worker, icon)
- Upload image/video langsung dari browser ke Cloudinary
- Batas UI video 250MB, tidak lewat server Vercel
- Generate task API
- Auto polling status setiap 10 detik
- Raw response viewer untuk debugging
- Support model Kling 2.6 dan Kling 3 motion control

## Environment Variables di Vercel

Isi ini di Vercel → Project → Settings → Environment Variables:

```env
MAGNIFIC_API_KEY=sk-mag-xxxx
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

Opsional jika endpoint berubah:

```env
MAGNIFIC_API_BASE_URL=https://api.freepik.com
MAGNIFIC_STATUS_BASE_URL=https://api.magnific.com
```

## Cara pakai di lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Cara upload ke GitHub

Jika ingin mengganti repo lama:

```bash
git add .
git commit -m "Replace with professional PWA motion control app"
git push
```

Vercel akan auto deploy dari branch yang terhubung.

## Catatan Cloudinary

Agar upload lokal bisa jalan:

1. Buat unsigned upload preset di Cloudinary.
2. Pastikan preset menerima image dan video.
3. Isi `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` dan `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

Jika tidak mau pakai Cloudinary, aplikasi tetap bisa digunakan dengan memasukkan Image URL dan Video URL publik langsung.
