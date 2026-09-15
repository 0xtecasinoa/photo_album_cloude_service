import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /*
   * tesseract.js は実行時に自分のワーカースクリプトのパスを組み立てる。
   * バンドルするとそのパスが書き換わり、
   * 「Cannot find module '/ROOT/node_modules/tesseract.js/...'」で落ちる。
   * sharp も同様にネイティブバイナリを読むため、まとめて外に出す。
   */
  serverExternalPackages: ['tesseract.js', 'sharp'],

  /**
   * 全ページに付ける安全側の指定。
   *
   * 公開したサーバーには自動の探索が常時来ます。ここで塞げるのは
   * 「他サイトに埋め込まれる」「別の形式として解釈される」といった
   * 典型的な手口です。通信の暗号化（HTTPS）の代わりにはなりません。
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // 他サイトの枠内に埋め込ませない（操作をすり替えられるため）。
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // 宣言と違う形式として解釈させない。
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // 外部へ送る参照元は、どのサイトから来たかまでに留める。
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // 使わない機能は明示的に閉じる。
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
