import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VIBE 365 | Performance & Habits OS',
  description: 'Precision daily habit tracking, dual consistency matrix, multi-horizon objectives, and progressive overload fitness engine with drop sets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-[#07080c] text-slate-100 min-h-screen antialiased selection:bg-emerald-500 selection:text-black font-sans">
        {children}
      </body>
    </html>
  );
}
