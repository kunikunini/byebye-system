import './globals.css';
import type { ReactNode } from 'react';
import Image from 'next/image';

export const metadata = {
  title: 'ByeBye System',
  description: 'VINYL/CD 業務管理',
  icons: {
    icon: '/byebye-favicon.svg',
  },
};

import Link from 'next/link';
import HeaderMenu from './components/header-menu';

// ... (previous code)

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <header className="sticky top-0 z-50 border-b border-black/5 bg-gold-2 shadow-sm">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <Link href="/dashboard/items" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <Image
                src="/byebye-logo-mark.svg"
                alt="ByeBye System"
                width={32}
                height={32}
                className="h-8 w-auto drop-shadow-md"
              />
              <span className="font-semibold tracking-wide text-text-primary">ByeBye System</span>
            </Link>
            <HeaderMenu />
          </div>
        </header>
        <main className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}

