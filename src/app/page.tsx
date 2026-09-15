import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HardHat, Check, ShieldCheck, Share2, Clock, Building, Landmark } from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { ChalkBoard } from '@/components/marketing/chalk-board';
import { Faq } from '@/components/marketing/faq';
import { ConnectedSystem } from '@/components/marketing/connected-system';
import { Reveal, RevealSection } from '@/components/marketing/reveal';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: '写真を撮るだけ。あとの1分は、台帳が自動で仕上げます。',
  description:
    '現場で撮ってボタンひとつ。黒板の内容をAIが読み取り、工事写真台帳のフォーマットへ自動で流し込みます。電子小黒板・権限共有・電子納品まで、ひとつのクラウドで完結。',
};

/**
 * Gold marker-pen highlight used behind key phrases throughout the design.
 *
 * Both colour stops sit at the same position, which is what gives the hard edge of a
 * highlighter rather than a fade. The first stop must be transparent — setting both to
 * the accent colour fills the whole line height and reads as a solid label instead.
 */
function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-b from-transparent from-[56%] to-accent/85 to-[56%] px-1">
      {children}
    </span>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="border-brand-ring/40 text-brand mx-auto mb-6 block w-fit rounded-[30px] border bg-white px-6 py-2 text-[12px] font-medium">
      {children}
    </span>
  );
}

const BENEFITS = [
  { icon: '/brand/icon-mobile.webp', title: '1分で自動作成', body: '撮影後、その場ですぐに台帳が完成' },
  { icon: '/brand/icon-prioritization.webp', title: '残業・人件費を削減', body: '事務所に戻っての台帳作業が不要に' },
  { icon: '/brand/icon-agree.webp', title: '現場管理に時間を', body: '浮いた時間を安全・品質確認へ' },
];

const STEPS = [
  {
    n: '01',
    title: '現場で写真を撮る',
    body: 'いつも通りアプリで撮影するだけ。黒板の情報もそのまま読み取ります。',
    image: '/brand/step-01.webp',
    alt: '白いヘルメットと作業着姿の作業員が、配筋をスマートフォンで撮影している様子',
  },
  {
    n: '02',
    title: 'ボタンを押すだけ',
    body: 'フォーマットの選択や項目入力は不要。ワンタップで自動生成が始まります。',
    image: '/brand/step-02.webp',
    alt: '事務所でタブレットを操作し、写真台帳を確認している様子',
  },
  {
    n: '03',
    title: '約1分で台帳が完成',
    body: 'そのまま社内共有・提出用フォーマットとして書き出せます。',
    image: '/brand/step-03.webp',
    alt: '図面に変更箇所が書き込まれたタブレットと、現場写真を表示したスマートフォン',
  },
];

const SHARING = [
  {
    icon: '/brand/share-office.webp',
    title: '事務所で確認・管理',
    body: '整理・台帳作成の権限（管理者／台帳担当）',
  },
  {
    icon: '/brand/share-partner.webp',
    title: '協力会社とも共有',
    body: '6桁コードで一時参加。権限は撮影のみなど絞られます',
  },
  {
    icon: '/brand/share-viewer.webp',
    title: '関係者もすぐに確認',
    body: '写真・データを見るだけの権限で参加',
  },
];

const WORKFLOW = [
  {
    n: '01', title: '撮影', body: '電子黒板付きで現場写真を撮影',
    image: '/brand/wf-01.webp',
    alt: 'スマートフォンの撮影画面に電子黒板が重ねて表示されている様子',
  },
  {
    n: '02', title: 'クラウド同期', body: '撮影した写真をクラウドへ自動同期',
    image: '/brand/wf-02.webp',
    alt: '撮影した現場写真がクラウドへアップロードされている様子',
  },
  {
    n: '03', title: 'AI解析', body: 'AIが電子黒板の文字を自動認識',
    image: '/brand/wf-03.webp',
    alt: '工事名・工種・測点などが記入された電子黒板',
  },
  {
    n: '04', title: '台帳作成', body: '写真台帳を自動で作成',
    image: '/brand/wf-04.webp',
    alt: '自動作成された工事写真台帳',
  },
  {
    n: '05', title: '帳票出力', body: 'PDF・EXCEL形式で簡単出力',
    image: '/brand/wf-05.webp',
    alt: 'PDF・EXCEL・WORD 形式での出力と電子納品対応の表示',
  },
];

const PROMISES = [
  { icon: ShieldCheck, label: '安全・安心' },
  { icon: Share2, label: 'リアルタイム共有' },
  { icon: Clock, label: '作業時間を削減' },
  { icon: HardHat, label: '建設業向け設計' },
];

const AUDIENCES = [
  {
    icon: HardHat,
    tone: 'bg-brand-ring/15 text-brand',
    // Each card carries its own accent; the check marks follow it.
    check: 'bg-brand-ring',
    image: '/brand/aud-genba.webp',
    alt: 'スマートフォンと現場用タブレットに電子黒板つきの写真が表示されている様子',
    lead: '現場監督の方へ,',
    title: '現場での撮影・記録をもっと簡単に',
    points: [
      '電子黒板付きでその場で正確に記録',
      'オフラインでも使えるから、圏外の現場でも安心',
      '撮影した写真は自動で整理され、事務作業を削減',
    ],
    recommend: ['現場での撮影・記録を効率化したい', '事務作業の時間を減らしたい'],
  },
  {
    icon: Building,
    tone: 'bg-success-tint text-success',
    check: 'bg-success',
    image: '/brand/aud-sme.webp',
    alt: 'ノートパソコンで工事写真台帳を編集している画面',
    lead: '中小建設会社向け,',
    title: '少人数でも効率的に、確実な業務管理を',
    points: [
      'クラウドで情報を一元管理、共有もスムーズ',
      '台帳作成を自動化し、少人数でも業務が回る',
      '導入しやすく、コストパフォーマンスも抜群',
    ],
    recommend: ['人手不足でも業務を効率化したい', 'コストを抑えながらデジタル化を進めたい'],
  },
  {
    icon: Landmark,
    tone: 'bg-accent/15 text-accent',
    check: 'bg-accent',
    image: '/brand/aud-enterprise.webp',
    alt: '都市部に立ち並ぶオフィスビル群',
    lead: '大手企業の導入にも対応,',
    title: '大規模プロジェクトの厳しい要件にも対応',
    points: [
      '大規模案件のデータ管理・権限設定に対応',
      '電子納品基準に準拠し、セキュリティも万全',
      '導入支援・運用サポートも充実',
    ],
    recommend: ['大規模プロジェクトの管理を効率化したい', 'セキュリティやコンプライアンスを重視したい'],
  },
];

const BOARD_ROWS = [
  { label: '工事名', value: '〇〇ビル新築工事' },
  { label: '工種', value: '鉄筋工事' },
  { label: '測点', value: 'R階 X3-Y5' },
  { label: '内容', value: '配筋状況' },
  { label: '日付', value: '2026/07/28' },
];

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ---------- Hero ---------- */}
        <section className="relative isolate overflow-hidden">
          <Image
            src="/brand/hero-bg.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover object-center"
          />
          {/*
            The background already carries a navy gradient down its left edge, so this
            overlay only has to deepen it enough for white text to stay legible where
            the sky is brightest. Stacking a second full-strength gradient muddies it.
          */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0B1849]/80 via-[#0B1849]/55 to-[#0B1849]/25 lg:bg-gradient-to-r lg:from-[#0B1849]/72 lg:via-[#0B1849]/28 lg:to-transparent" />

          <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-6 pt-[140px] pb-20 lg:grid-cols-[minmax(0,600px)_minmax(0,1fr)] lg:gap-10 lg:px-10 lg:pt-[180px] lg:pb-28">
            <div>
              <h1 className="jp-phrase text-[34px] leading-[1.35] font-bold text-white sm:text-[44px] lg:text-[52px]">
                写真を撮るだけ。
                <br />
                あとの<span className="text-accent text-[1.25em]">1</span>分は、台帳が自動
                <br className="hidden sm:inline" />
                で仕上げます。
              </h1>

              <p className="mt-8 max-w-[540px] text-[14px] leading-[2] text-white/95 sm:text-[15px]">
                現場で撮ってボタンひとつ。黒板の内容を読み取り、工事写真台帳のフォーマットに自動で流し込みます。書類作成の時間を、現場の安全管理・品質管理にまわしましょう。
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/signup"
                  className="bg-accent hover:bg-accent-hover rounded-[8px] px-8 py-4 text-[15px] font-bold text-white transition-colors"
                >
                  無料デモを試してみる　→
                </Link>
                <a
                  href="#how"
                  className="bg-accent hover:bg-accent-hover rounded-[8px] px-8 py-4 text-[15px] font-bold text-white transition-colors"
                >
                  3ステップを見る　→
                </a>
              </div>
            </div>

            <Image
              src="/brand/hero-product.webp"
              alt="スマートフォンの電子小黒板とパソコンの工事写真台帳が、クラウドで連携している様子"
              width={768}
              height={512}
              priority
              sizes="(max-width: 1024px) 92vw, 640px"
              className="h-auto w-full max-w-[768px] justify-self-center lg:justify-self-end"
            />
          </div>
        </section>

        {/* ---------- Why ---------- */}
        <RevealSection id="issues" className="bg-brand text-white">
          <div className="mx-auto max-w-[1240px] px-6 py-20 lg:px-10">
            <p className="mb-6 text-[13px] text-white/75">選ばれる理由</p>
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
              <h2 className="jp-phrase text-[26px] leading-[1.6] font-bold sm:text-[32px]">
                撮るから出すまで、ひとつの
                <br />
                クラ<span className="text-accent">ウドで完結する</span>から。
              </h2>
              <p className="text-[14px] leading-[2.1] text-white/90">
                台帳ソフトはすでにある。けれど、日時が抜ける、手書きは結局手入力、クラウドと台帳が別扱い——そんな「痒い所」が積み重なっていた。本サービスは、そこに正面から手を入れた工事写真台帳クラウドです。
              </p>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="bg-surface-muted">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-16 md:grid-cols-3 md:divide-x md:divide-border-subtle lg:px-10">
            {BENEFITS.map(({ icon, title, body }, i) => (
              <Reveal as="div" delay={i * 90} key={title} className="md:px-8 md:first:pl-0 md:last:pr-0">
                <h3 className="text-brand flex items-center gap-3 text-[19px] font-bold">
                  {/* Decorative: the heading beside it already carries the meaning. */}
                  {/*
                    Rendered larger than the line icons these replaced: they are filled
                    illustrations, and below ~36px the interior detail turns to mush.
                  */}
                  <Image
                    src={icon}
                    alt=""
                    width={85}
                    height={85}
                    quality={95}
                    aria-hidden
                    className="size-9 shrink-0 object-contain"
                  />
                  {title}
                </h3>
                <p className="text-ink-muted mt-4 text-[13px] leading-[2]">{body}</p>
              </Reveal>
            ))}
          </div>
        </RevealSection>

        {/* ---------- 3 steps ---------- */}
        <RevealSection id="how" className="bg-white">
          <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10">
            <h2 className="jp-phrase text-center text-[24px] leading-[1.5] font-bold text-ink sm:text-[30px]">
              撮影から台帳化まで、<span className="text-brand-link text-[1.6em]">3</span>
              <Mark>つの工程で完結</Mark>
            </h2>

            <ol className="mt-16 grid gap-6 lg:grid-cols-3 lg:gap-x-12">
              {STEPS.map((step, i) => (
                <Reveal as="li" delay={i * 110} key={step.n} className="relative">
                  <div className="border-border-subtle h-full rounded-[14px] border bg-white p-3 shadow-[0_2px_16px_rgba(11,24,73,0.06)]">
                    {/*
                      Each photo carries a notch cut out of its bottom-right corner in the
                      alpha channel — that is where the step number sits. The card stays
                      white behind it, so the notch reads as a gap around the badge.
                    */}
                    <div className="relative">
                      <Image
                        src={step.image}
                        alt={step.alt}
                        width={358}
                        height={284}
                        sizes="(max-width: 1024px) 92vw, 360px"
                        className="aspect-[358/284] w-full rounded-[12px] object-cover"
                      />
                      <span className="bg-brand-soft absolute right-[4%] bottom-[0%] grid size-[46px] place-items-center rounded-full text-[15px] font-bold text-white">
                        {step.n}
                      </span>
                    </div>

                    <div className="px-3 pt-5 pb-4">
                      <h3 className="jp-phrase text-brand inline-block text-[16px] font-bold">
                        <Mark>{step.title}</Mark>
                      </h3>
                      <p className="text-ink-muted mt-4 text-[12px] leading-[2]">{step.body}</p>
                    </div>
                  </div>

                  {i < STEPS.length - 1 && (
                    <Image
                      src="/brand/step-arrow.webp"
                      alt=""
                      width={92}
                      height={106}
                      aria-hidden
                      className="absolute top-[26%] -right-10 hidden h-[44px] w-auto lg:block"
                    />
                  )}
                </Reveal>
              ))}
            </ol>
          </div>
        </RevealSection>

        {/* ---------- Sharing / permissions ---------- */}
        <RevealSection id="features" className="bg-surface-muted">
          <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10">
            <h2 className="jp-phrase text-brand text-center text-[26px] leading-[1.6] font-bold sm:text-[32px]">
              {/*
                The Figma layout breaks after 「メン」 because its text box is a fixed
                width. Kept at the word boundary instead: the original split 「メンバー」
                across both the line break AND the navy/gold colour change.
              */}
              同じプロジェクトの
              <br className="hidden sm:block" />
              <span className="text-accent">メンバーと、すぐに共有</span>
            </h2>

            <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="text-[14px] leading-[2.1] text-ink">
                  クラウド上で写真を一元管理。案件ごとにアクセス権限を設定でき、事務所・協力会社・閲覧のみのメンバーまで、必要な範囲だけ共有できます。
                </p>

                <ul className="mt-10 space-y-7">
                  {SHARING.map(({ icon, title, body }) => (
                    <li key={title} className="flex items-center gap-4">
                      {/* The artwork already contains the blue disc, so no wrapper here. */}
                      <Image
                        src={icon}
                        alt=""
                        width={105}
                        height={105}
                        aria-hidden
                        className="size-[50px] shrink-0"
                      />
                      <div>
                        <h3 className="text-[14px] font-bold text-ink">{title}</h3>
                        <p className="text-ink-muted mt-1 text-[12px] leading-[1.9]">{body}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/*
                  Two separate gold shapes, as in the design — but one <Link>, so screen
                  readers and keyboard users get a single target rather than two links
                  pointing at the same page.
                */}
                <Link href="/signup" className="group mt-10 inline-flex items-center gap-3">
                  <span className="bg-accent group-hover:bg-accent-hover rounded-[30px] px-7 py-3.5 text-[13px] font-bold text-white transition-colors">
                    権限・共有設定について
                  </span>
                  <span
                    className="bg-accent group-hover:bg-accent-hover grid size-[46px] shrink-0 place-items-center rounded-full text-[15px] text-white transition-colors"
                    aria-hidden
                  >
                    ↗
                  </span>
                </Link>
              </div>

              {/* Same photograph as the sign-up screen; deliberately shared rather than duplicated. */}
              <Image
                src="/brand/auth-hero.webp"
                alt="タブレットを持って現場を確認している現場監督"
                width={1432}
                height={1966}
                sizes="(max-width: 1024px) 92vw, 560px"
                /*
                  The source is a tall portrait (1432x1966). A wide, short box crops it
                  so hard that the tablet falls outside the frame; a near-square box
                  keeps both the helmet and the tablet, as in the design.
                */
                className="aspect-[11/10] w-full rounded-[14px] object-cover object-[center_28%]"
              />
            </div>
          </div>
        </RevealSection>

        {/* ---------- AI OCR ---------- */}
        <RevealSection id="editor" className="bg-surface-muted">
          <div className="mx-auto max-w-[1240px] px-6 pb-24 lg:px-10">
            <h2 className="jp-phrase text-brand text-center text-[26px] leading-[1.6] font-bold sm:text-[32px]">
              AIが黒板・手書き看板の文字も
              <br className="hidden sm:block" />
              <Mark>自動で読み取り</Mark>
            </h2>

            <div className="mt-14 grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
              <div>
                <p className="border-brand text-ink-muted mx-auto mb-5 w-fit rounded-[30px] border border-dotted bg-white px-6 py-2 text-[12px]">
                  手書き看板の例
                </p>
                <ChalkBoard rows={BOARD_ROWS} handwritten />
              </div>

              <Image
                src="/brand/ocr-arrow.webp"
                alt=""
                width={44}
                height={98}
                aria-hidden
                className="mx-auto h-[62px] w-auto rotate-90 lg:h-[96px] lg:rotate-0"
              />

              <div>
                <p className="border-border-subtle text-ink-muted mx-auto mb-5 w-fit rounded-[30px] border bg-white px-6 py-2 text-[12px]">
                  読み取り結果（例）
                </p>
                <ChalkBoard rows={BOARD_ROWS} />
              </div>
            </div>

            <ul className="mt-10 grid gap-4 sm:grid-cols-3">
              {['黒板・手書き看板の文字をAIが自動認識', '写真ごとにデータを自動で整理・分類', '台帳の作成まで自動で完了'].map(
                (t) => (
                  <li key={t} className="flex items-center gap-3">
                    <span className="bg-accent grid size-5 shrink-0 place-items-center rounded-[4px] text-white">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    <span className="text-[12px] text-ink">{t}</span>
                  </li>
                ),
              )}
            </ul>

            <p className="text-ink-muted mx-auto mt-9 max-w-[720px] text-center text-[12px] leading-[2]">
              ※
              手書き文字の判別精度は、文字の大きさ・書き方・撮影環境などにより異なる場合があります。読み取り結果は下書きとして扱われ、内容は確認・修正のうえご利用ください。
            </p>
          </div>
        </RevealSection>

        {/* ---------- Workflow ---------- */}
        <RevealSection className="bg-white">
          <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10">
            <SectionTag>シンプルなワークフロー</SectionTag>
            <h2 className="jp-phrase text-center text-[24px] leading-[1.5] font-bold text-ink sm:text-[30px]">
              現場撮影から報告書作成まで、
              <Mark>
                <span className="text-brand-link">すべてをひとつに</span>
              </Mark>
              。
            </h2>
            <p className="text-ink-muted mt-6 text-center text-[13px]">
              現場で撮影した写真をAIが整理し、写真台帳の作成から帳票出力まで効率化します。
            </p>

            {/*
              Six columns so each card can span two: 01-02-03 fill the first row, and
              04-05 start one column in, which centres them under the row above.
            */}
            <ol className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:gap-x-12">
              {WORKFLOW.map((step, i) => (
                <li
                  key={step.n}
                  className={cn(
                    // No outline — the cards are separated by the soft drop shadow alone.
                    'relative rounded-[14px] bg-white p-6 shadow-[0_2px_16px_rgba(11,24,73,0.06)]',
                    'lg:col-span-2',
                    i === 3 && 'lg:col-start-2',
                  )}
                >
                  <h3 className="flex items-center gap-3">
                    {/* Disc grows with the numeral so it does not look cramped. */}
                    <span className="bg-brand-ring grid size-[44px] shrink-0 place-items-center rounded-full text-[24px] font-bold text-white">
                      {step.n}
                    </span>
                    <span className="text-brand-link text-[18px] font-bold">{step.title}</span>
                  </h3>
                  <p className="text-ink-muted mt-4 text-[13px] leading-[1.9]">{step.body}</p>

                  <Image
                    src={step.image}
                    alt={step.alt}
                    width={306}
                    height={239}
                    sizes="(max-width: 640px) 88vw, (max-width: 1024px) 44vw, 310px"
                    className="mt-6 aspect-[306/239] w-full rounded-[10px] object-contain"
                  />

                  {/* Arrows sit between cards within a row, never across the row break. */}
                  {i !== 2 && i !== WORKFLOW.length - 1 && (
                    <Image
                      src="/brand/ocr-arrow.webp"
                      alt=""
                      width={44}
                      height={98}
                      aria-hidden
                      className="absolute top-1/2 -right-11 hidden h-[62px] w-auto -translate-y-1/2 lg:block"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </RevealSection>

        {/* ---------- Promise band ---------- */}
        <RevealSection className="bg-brand">
          <div className="mx-auto max-w-[1240px] px-6 py-14 lg:px-10">
            <ul className="flex flex-wrap justify-center gap-4">
              {PROMISES.map(({ icon: Icon, label }, i) => (
                <Reveal as="li" delay={i * 60}
                  key={label}
                  className="flex items-center gap-2.5 rounded-[30px] bg-white/12 px-6 py-3 text-white"
                >
                  <Icon className="text-accent size-4" strokeWidth={2} aria-hidden />
                  <span className="text-[13px] font-medium">{label}</span>
                </Reveal>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap justify-center gap-5">
              <Link
                href="/signup"
                className="bg-accent hover:bg-accent-hover rounded-[8px] px-10 py-4 text-[15px] font-bold text-white transition-colors"
              >
                無料で試してみる　→
              </Link>
              <Link
                href="/contact"
                className="bg-accent hover:bg-accent-hover rounded-[8px] px-10 py-4 text-[15px] font-bold text-white transition-colors"
              >
                デモを予約する　→
              </Link>
            </div>
          </div>
        </RevealSection>

        {/* ---------- One connected system ---------- */}
        <ConnectedSystem />

        {/* ---------- Audiences ---------- */}
        <RevealSection id="delivery" className="bg-surface-muted">
          <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10">
            <h2 className="jp-phrase text-center text-[24px] leading-[1.6] font-bold text-ink sm:text-[30px]">
              現場から事務所、大規模プロジェクトまで。
              <br />
              <span className="text-brand-link">すべての建設業務にフィット。</span>
            </h2>

            <div className="mt-16 space-y-7">
              {AUDIENCES.map((a, i) => (
                <Reveal as="article" delay={i * 110}
                  key={a.lead}
                  className="border-border-subtle rounded-[14px] border bg-white p-7 shadow-[0_2px_16px_rgba(11,24,73,0.05)] lg:p-9"
                >
                  <div className="grid gap-8 lg:grid-cols-[auto_1fr_minmax(0,380px)]">
                    <span className={`grid size-[58px] shrink-0 place-items-center rounded-[12px] ${a.tone}`}>
                      <a.icon className="size-7" strokeWidth={1.7} aria-hidden />
                    </span>

                    <div className="min-w-0">
                      <h3 className="text-[17px] font-bold sm:text-[19px]">
                        <span className="text-brand-link">{a.lead}</span>{' '}
                        <span className="text-ink">{a.title}</span>
                      </h3>

                      <ul className="mt-6 space-y-3.5">
                        {a.points.map((p) => (
                          <li key={p} className="flex items-start gap-3">
                            <span
                              className={cn(
                                'mt-0.5 grid size-[20px] shrink-0 place-items-center rounded-full text-white',
                                a.check,
                              )}
                            >
                              <Check className="size-3" strokeWidth={3.5} aria-hidden />
                            </span>
                            <span className="text-[13px] leading-[1.8] text-ink">{p}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="border-accent bg-accent/8 mt-7 border-l-[3px] px-5 py-4">
                        <p className="text-brand text-[12px] font-bold">こんな方におすすめ</p>
                        <ul className="text-ink-muted mt-2 space-y-1 text-[12px]">
                          {a.recommend.map((r) => (
                            <li key={r}>・{r}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <Image
                      src={a.image}
                      alt={a.alt}
                      width={494}
                      height={329}
                      sizes="(max-width: 1024px) 0px, 380px"
                      className="hidden h-full max-h-[230px] w-full rounded-[10px] object-contain lg:block"
                    />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ---------- FAQ ---------- */}
        <RevealSection className="bg-white">
          <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10">
            <SectionTag>FAQ</SectionTag>
            <h2 className="text-center text-[26px] font-bold text-ink sm:text-[32px]">
              <Mark>よくあるご質問</Mark>
            </h2>
            <p className="text-ink-muted mt-6 text-center text-[13px]">
              導入前によくいただくご質問にお答えします。
            </p>
            <Faq />
          </div>
        </RevealSection>

        {/* ---------- Closing CTA ---------- */}
        <RevealSection className="bg-white pb-24">
          <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
            <div className="relative isolate overflow-hidden rounded-[16px] px-6 py-20 text-center">
              <Image
                src="/brand/cta-band.webp"
                alt=""
                fill
                sizes="(max-width: 1240px) 100vw, 1240px"
                className="-z-10 object-cover"
              />
              {/*
                The artwork already carries its own navy tint. The old flat /85 overlay
                is gone — stacked on top it turned the building to mud. This is only a
                slight left-side deepening so the centred text keeps its contrast.
              */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0B1849]/35 via-transparent to-[#0B1849]/20" />

              <h2 className="jp-phrase text-[24px] leading-[1.6] font-bold text-white sm:text-[32px]">
                書類作成の時間を、
                <br />
                現場の<span className="text-accent">安全管理・品質管理</span>に。
              </h2>

              <Link
                href="/signup"
                className="bg-accent hover:bg-accent-hover mt-10 inline-flex rounded-[8px] px-10 py-4 text-[15px] font-bold text-white transition-colors"
              >
                無料デモを試してみる　→
              </Link>

              <p className="mt-6 text-[12px] text-white/85">
                ※無料でお試しいただけます。お気軽にご利用ください。
              </p>
            </div>
          </div>
        </RevealSection>
      </main>

      <SiteFooter />
    </>
  );
}
