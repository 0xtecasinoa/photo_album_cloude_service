import type { Metadata, Viewport } from 'next';
import { Zen_Kaku_Gothic_New, Klee_One } from 'next/font/google';
import './globals.css';

/** The typeface used throughout the Figma file. */
const zenKaku = Zen_Kaku_Gothic_New({
  variable: '--font-zen-kaku',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: false, // the Japanese subset is large; fetch on demand
});

/** 小黒板の「手書き風」書体。テンプレート編集でのみ使います。 */
const kleeOne = Klee_One({
  variable: '--font-klee',
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: 'らくらく写真台帳',
    template: '%s | らくらく写真台帳',
  },
  description:
    '現場で撮った瞬間から、電子小黒板つきでクラウドへ。工事写真台帳の作成、権限管理、電子納品までをひとつに。',
  robots: { index: false, follow: false }, // flip on at launch
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1E3A8B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${zenKaku.variable} ${kleeOne.variable} h-full`}>
      <body className="bg-surface text-ink min-h-full font-sans">{children}</body>
    </html>
  );
}
