import Image from 'next/image';
import { Camera, Cloud, MonitorDot, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 「現場から提出まで、一気通貫でサポート。」
 *
 * On lg the three products sit in a 3x3 grid around a central cloud, with the four
 * chevrons absolutely positioned in the diagonal gaps. Below lg the whole thing
 * collapses to a single column and the chevrons are hidden — they only make sense
 * when the pieces are actually arranged around a centre.
 */

type Product = {
  n: string;
  title: string;
  icon: typeof Camera;
  image: string;
  alt: string;
  points: string[];
};

const PRODUCTS: Product[] = [
  {
    n: '01',
    title: '撮影する',
    icon: Camera,
    image: '/brand/sys-capture.webp',
    alt: '作業員が現場でスマートフォンを使って撮影している様子',
    points: ['電子黒板に対応し、その場で情報を記録', '撮影と同時に案件へ自動整理', 'オフラインでも安心して利用可能'],
  },
  {
    n: '02',
    title: '共有・管理する',
    icon: Cloud,
    image: '/brand/sys-share.webp',
    alt: 'パソコンとスマートフォンで工事写真を一覧表示している様子',
    points: ['写真・図面を一元管理', '案件ごと・権限ごとに共有', 'どこからでもアクセス可能'],
  },
  {
    n: '03',
    title: '整理・作成する',
    icon: MonitorDot,
    image: '/brand/sys-create.webp',
    alt: '事務所でタブレットを使い写真台帳を作成している様子',
    points: ['写真を選ぶだけで台帳を自動作成', 'AIが説明文の下書きをサポート', '電子納品基準にも対応'],
  },
];

/** The four captions that sit in the corners, describing the flow between products. */
const FLOW = [
  { title: '自動アップロード', body: '撮影した写真をすぐにクラウドへ', align: 'text-right' },
  { title: 'クラウドで共有', body: 'チームや協力会社とリアルタイムで共有', align: 'text-left' },
  { title: '台帳を出力・提出', body: '電子納品データの出力までスムーズに完結', align: 'text-right' },
  { title: 'データを活用', body: 'クラウドの写真をそのまま台帳作成に活用', align: 'text-left' },
] as const;

const OUTCOMES = [
  { title: '作業時間を大幅削減', body: '撮影から提出までの作業がスムーズに。' },
  { title: 'ミス・手戻りを防止', body: 'データがつながることで転記ミスを削減。' },
  { title: 'チームの連携を強化', body: 'クラウドで情報共有がリアルタイムに。' },
];

function PointList({ points }: { points: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {points.map((p) => (
        <li key={p} className="flex items-start gap-2">
          <span className="bg-brand-ring mt-[3px] grid size-[14px] shrink-0 place-items-center rounded-full text-white">
            <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
          </span>
          <span className="text-[11px] leading-[1.7] text-ink">{p}</span>
        </li>
      ))}
    </ul>
  );
}

function ProductHeading({ product }: { product: Product }) {
  const Icon = product.icon;
  return (
    <h3 className="flex items-center gap-2.5">
      <Icon className="text-brand-link size-[26px] shrink-0" strokeWidth={2} aria-hidden />
      <span className="text-[19px] font-bold text-ink">{product.title}</span>
    </h3>
  );
}

function FlowCaption({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-brand-link text-[17px] font-bold">{title}</p>
      <p className="text-ink-muted mt-2 text-[14px] leading-[1.85]">{body}</p>
    </div>
  );
}

export function ConnectedSystem() {
  return (
    <section className="bg-surface-muted">
      <div className="mx-auto max-w-[1240px] px-6 py-24 lg:px-10">
        <span className="border-brand-ring/40 text-brand mx-auto mb-6 block w-fit rounded-[30px] border bg-white px-6 py-2 text-[12px] font-medium">
          すべてがつながる、ひとつのシステム
        </span>

        <h2 className="jp-phrase text-brand text-center text-[24px] leading-[1.5] font-bold sm:text-[30px]">
          現場から提出まで、<span className="text-brand-link">一気通貫</span>でサポート。
        </h2>
        <p className="text-ink-muted mt-6 text-center text-[13px]">
          3つのプロダクトがシームレスに連携し、工事写真業務をもっと簡単にします。
        </p>

        {/* ---------- diagram ---------- */}
        <div className="relative mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)_minmax(0,1fr)] lg:items-center lg:gap-x-14 lg:gap-y-12">
          {/* row 1 */}
          <FlowCaption {...FLOW[0]} className="hidden text-right lg:block" />
          <Image
            src="/brand/sys-cloud.webp"
            alt=""
            width={214}
            height={214}
            aria-hidden
            className="mx-auto size-[150px] lg:size-[170px]"
          />
          <FlowCaption {...FLOW[1]} className="hidden text-left lg:block" />

          {/* row 2 */}
          <article className="relative rounded-[14px] bg-white p-3 shadow-[0_4px_20px_rgba(11,24,73,0.08)]">
            <div className="relative">
              <Image
                src={PRODUCTS[0]!.image}
                alt={PRODUCTS[0]!.alt}
                width={278}
                height={169}
                sizes="(max-width: 1024px) 90vw, 300px"
                className="aspect-[278/169] w-full rounded-[10px] object-cover"
              />
              <span className="bg-brand-soft absolute right-3 -bottom-4 grid size-[46px] place-items-center rounded-full text-[17px] font-bold text-white">
                {PRODUCTS[0]!.n}
              </span>
            </div>
            <div className="px-2 pt-5 pb-2">
              <ProductHeading product={PRODUCTS[0]!} />
              <PointList points={PRODUCTS[0]!.points} />
            </div>
          </article>

          <div className="text-center">
            <h3 className="text-brand text-[19px] font-bold">工事写真台帳サービス</h3>
            <Image
              src="/brand/logo.png"
              alt=""
              width={180}
              height={143}
              aria-hidden
              className="mx-auto mt-4 h-[72px] w-auto"
            />
            <p className="text-ink-muted mt-4 text-[14px] leading-[1.95]">
              すべてのデータがつながり、
              <br className="hidden lg:block" />
              業務をもっとスマートに。
            </p>
          </div>

          <article className="relative rounded-[14px] bg-white p-3 shadow-[0_4px_20px_rgba(11,24,73,0.08)]">
            <div className="relative">
              <Image
                src={PRODUCTS[1]!.image}
                alt={PRODUCTS[1]!.alt}
                width={278}
                height={169}
                sizes="(max-width: 1024px) 90vw, 300px"
                className="aspect-[278/169] w-full rounded-[10px] object-cover"
              />
              <span className="bg-brand-soft absolute right-3 -bottom-4 grid size-[46px] place-items-center rounded-full text-[17px] font-bold text-white">
                {PRODUCTS[1]!.n}
              </span>
            </div>
            <div className="px-2 pt-5 pb-2">
              <ProductHeading product={PRODUCTS[1]!} />
              <PointList points={PRODUCTS[1]!.points} />
            </div>
          </article>

          {/* row 3 */}
          <FlowCaption {...FLOW[2]} className="hidden text-right lg:block" />

          <article className="relative rounded-[14px] bg-white p-3 shadow-[0_4px_20px_rgba(11,24,73,0.08)] lg:-mx-10">
            <div className="flex gap-4">
              <div className="relative shrink-0">
                <Image
                  src={PRODUCTS[2]!.image}
                  alt={PRODUCTS[2]!.alt}
                  width={198}
                  height={249}
                  sizes="180px"
                  className="aspect-[198/249] w-[128px] rounded-[10px] object-cover sm:w-[150px]"
                />
                <span className="bg-brand-soft absolute -top-2 -right-4 grid size-[46px] place-items-center rounded-full text-[17px] font-bold text-white">
                  {PRODUCTS[2]!.n}
                </span>
              </div>
              <div className="min-w-0 flex-1 pt-5 pr-1 sm:pt-7">
                <ProductHeading product={PRODUCTS[2]!} />
                <PointList points={PRODUCTS[2]!.points} />
              </div>
            </div>
          </article>

          <FlowCaption {...FLOW[3]} className="hidden text-left lg:block" />

          {/* ---------- connectors ---------- */}
          {[
            { src: '/brand/sys-arrow-tl.webp', pos: 'left-[27%] top-[20%]' },
            { src: '/brand/sys-arrow-tr.webp', pos: 'right-[27%] top-[20%]' },
            { src: '/brand/sys-arrow-bl.webp', pos: 'left-[27%] bottom-[22%]' },
            { src: '/brand/sys-arrow-br.webp', pos: 'right-[27%] bottom-[22%]' },
          ].map(({ src, pos }) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={103}
              height={104}
              aria-hidden
              className={cn('pointer-events-none absolute hidden h-[76px] w-auto lg:block', pos)}
            />
          ))}
        </div>

        {/*
          The four captions above are positioned around the diagram, which only exists
          on lg. Rather than drop that content on a phone, repeat it here as a plain
          grid — hidden on lg so it is never shown twice.
        */}
        <ul className="mt-12 grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:hidden">
          {FLOW.map(({ title, body }) => (
            <li key={title}>
              <p className="text-brand-link text-[17px] font-bold">{title}</p>
              <p className="text-ink-muted mt-2 text-[14px] leading-[1.85]">{body}</p>
            </li>
          ))}
        </ul>

        {/* ---------- outcomes ---------- */}
        <h3 className="text-brand mt-20 text-center text-[20px] font-bold sm:text-[22px]">
          一つにつながるからこんなに変わる！
        </h3>
        <ul className="mt-10 grid gap-7 sm:grid-cols-3">
          {OUTCOMES.map(({ title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="bg-accent mt-0.5 grid size-6 shrink-0 place-items-center rounded-[5px] text-white">
                <Check className="size-4" strokeWidth={3} aria-hidden />
              </span>
              <div>
                <p className="text-[16px] font-bold text-ink">{title}</p>
                <p className="text-ink-muted mt-1.5 text-[13.5px] leading-[1.85]">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
