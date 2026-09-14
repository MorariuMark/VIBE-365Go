import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VIBE 365 | Habit Tracker & IronForge Gym Logger',
  description: 'Professional habit tracking, consistency matrix, objectives, and progressive overload gym tracker with drop sets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-900 text-slate-100 min-h-screen antialiased selection:bg-brand-emerald selection:text-dark-900">
        {children}
      </body>
    </html>
  );
}
