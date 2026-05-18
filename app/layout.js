import './globals.css';

export const metadata = {
  title: 'Motion Control AI Studio',
  description: 'Professional AI motion control video generator with direct Cloudinary upload and PWA support.',
  manifest: '/manifest.json',
  themeColor: '#080611',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Motion Control',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
