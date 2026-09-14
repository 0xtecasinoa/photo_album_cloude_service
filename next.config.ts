import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /*
   * tesseract.js は実行時に自分のワーカースクリプトのパスを組み立てる。
   * バンドルするとそのパスが書き換わり、
   * 「Cannot find module '/ROOT/node_modules/tesseract.js/...'」で落ちる。
   * sharp も同様にネイティブバイナリを読むため、まとめて外に出す。
   */
  serverExternalPackages: ['tesseract.js', 'sharp'],
};

export default nextConfig;
