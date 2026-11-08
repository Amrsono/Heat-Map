import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SurgePilot AI - Rideshare Driver Profit Optimization',
  description: 'Real-time PostGIS + Uber H3 Resolution 8 spatial heatmap and multi-platform surge demand radar for drivers.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
