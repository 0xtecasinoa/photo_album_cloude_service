import { cn } from '@/lib/utils';

/**
 * Page title row. In the design the title sits at 36px bold navy with the primary
 * actions right-aligned on the same baseline, above a full-bleed hairline.
 */
export function PageHeader({
  title,
  /** 見出しの上に小さく出す補助。どの現場の画面かを示すのに使う。 */
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-border-subtle border-b', className)}>
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 pb-[26px] xl:px-[31px]">
        <div className="min-w-0">
          {subtitle && <p className="text-ink-muted mb-1.5 text-[13px]">{subtitle}</p>}
          <h1 className="text-brand text-[28px] leading-tight font-bold xl:text-[36px]">{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
