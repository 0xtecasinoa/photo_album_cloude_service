import Image from "next/image";
import Link from "next/link";
import { Camera, MonitorDot, Cloud, ShieldCheck } from "lucide-react";

const COLUMNS = [
  {
    title: "プロダクト",
    links: [
      "らくらくカメラ",
      "らくらくデスクトップ",
      "らくらくクラウド",
      "機能一覧",
      "動作環境",
      "アップデート情報",
    ],
  },
  {
    title: "サポート",
    links: [
      "ヘルプセンター",
      "よくあるご質問",
      "お問い合わせ",
      "導入サポート",
      "セミナー・動画",
      "お知らせ",
    ],
  },
];

const PILLARS = [
  { icon: Camera, title: "電子黒板付き", body: "で簡単撮影" },
  { icon: MonitorDot, title: "写真整理・台帳", body: "作成を効率化" },
  { icon: Cloud, title: "クラウドで共有・保存", body: "どこでもアクセス" },
];

export function SiteFooter() {
  return (
    <footer className="text-white">
      {/*
        Wave transition into the footer, inlined from Group 209.svg.
        Inline rather than a file: it is 669 bytes, so it costs less than the HTTP
        request would, stays sharp at any width, and its front wave uses the same
        #1E3A8B as bg-brand below — making the seam invisible.
        The viewBox is cropped to the crest; the source art continues as ~700px of
        flat navy that bg-brand already provides.
        -mb-px closes the hairline that subpixel rounding otherwise leaves.
      */}
      <svg
        viewBox="0 0 1440 130"
        className="-mb-px block h-auto w-full"
        aria-hidden
        focusable="false"
      >
        <path
          d="M1448.1 787.335L-8.79078 789.618L-2.49989 97.5531C315.992 64.7996 484.817 -26.5018 816.395 9.46438C1076.63 42.1782 1206.23 114.931 1439.5 91.5529L1448.1 787.335Z"
          fill="#A2C0E3"
        />
        <path
          d="M1448.1 815.335L-8.79078 817.618L-8.7908 99.0531C309.701 66.2996 484.817 1.49767 816.395 37.4639C1076.63 70.1777 1210.73 115.931 1444 92.5531L1448.1 815.335Z"
          fill="#60A5FA"
        />
        <path
          d="M1448.1 848.77L-8.79089 851.053L-8.79094 100.571C309.701 67.8178 484.817 34.9331 816.395 70.8993C1076.63 103.613 1214.84 117.035 1448.1 93.6568L1448.1 848.77Z"
          fill="#1E3A8B"
        />
      </svg>

      <div className="bg-brand">
        <div className="mx-auto max-w-[1240px] px-6 pt-6 pb-16 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
            <div>
              <Image
                src="/brand/logo.png"
                alt="らくらく写真台帳"
                width={180}
                height={143}
                className="size-[64px] rounded-[12px] object-contain"
              />
              <p className="mt-5 text-[13px] leading-[1.9] text-white/90">
                工事写真の撮影から台帳作成・共有まで、
                <br />
                現場の業務をもっと簡単に、もっとスマートに。
              </p>

              <ul className="mt-7 flex divide-x divide-white/25">
                {PILLARS.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="px-3.5 first:pl-0">
                    <span className="bg-brand-ring/45 mb-2 grid size-9 place-items-center rounded-full">
                      <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                    </span>
                    {/*
                      Each label is two short lines. Without keep-all the narrow column
                      splits them between any two characters — 「電子黒板付/き」 — which
                      reads as a typo. Each line is short enough to never need wrapping.
                    */}
                    <p className="text-[11px] leading-[1.6] whitespace-nowrap text-white/85">
                      {title}
                      <br />
                      {body}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-center gap-3 rounded-[10px] bg-white/10 px-4 py-3">
                <ShieldCheck
                  className="size-5 shrink-0"
                  strokeWidth={1.8}
                  aria-hidden
                />
                <p className="text-[11px] leading-relaxed text-white/90">
                  安心・安全のセキュリティ
                  <br />
                  大切なデータを強固に保護します。
                </p>
              </div>
            </div>

            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className="text-[15px] font-bold">{col.title}</h2>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l) => (
                    <li key={l}>
                      <Link
                        href="#"
                        className="text-[13px] text-white/85 hover:text-white hover:underline"
                      >
                        {l}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h2 className="text-[15px] font-bold">お問い合わせ</h2>
              <p className="mt-5 text-[13px] text-white/85">
                ご相談・ご質問はこちらから
              </p>
              <Link
                href="/contact"
                className="bg-accent hover:bg-accent-hover mt-5 inline-flex rounded-[8px] px-6 py-3.5 text-[14px] font-bold text-white transition-colors"
              >
                お問い合わせする →
              </Link>
              <p className="mt-6 text-[12px] leading-[1.9] text-white/75">
                営業時間：平日 9:00 - 18:00
                <br />
                （土日祝日を除く）
              </p>
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/20 pt-7">
            {/* TODO: replace with the real legal entity before launch. */}
            <p className="text-[12px] text-white/70">
              © {new Date().getFullYear()} 株式会社〇〇　ALL RIGHTS RESERVED.
            </p>
            <p className="text-[12px] text-white/70">公式SNS: 準備中</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
