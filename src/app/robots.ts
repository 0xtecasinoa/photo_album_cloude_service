import type { MetadataRoute } from 'next';

/**
 * 検索結果に載せない指定。
 *
 * 行儀の良いクローラーにしか効きません。無視して接続してくる調査ボットは
 * 止められないため、こちらは「検索結果に出さない」ためのものと考えてください。
 * 一般公開の段階で、紹介ページだけを許可する形に変えてください。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
  };
}
