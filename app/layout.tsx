import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'ByeBye System',
  description: 'VINYL/CD 業務管理',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-gray-900">
        <header className="border-b">
          <div className="mx-auto max-w-5xl p-4 font-semibold">ByeBye System</div>
        </header>
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}

