import { cn } from '@/lib/utils';

/**
 * Page title row. In the design the title sits at 36px bold navy with the primary
 * actions right-aligned on the same baseline, above a full-bleed hairline.
 */
export function PageHeader({
  title,
  actions,
  className,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-border-subtle border-b', className)}>
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 pb-[26px] xl:px-[31px]">
        <h1 className="text-brand text-[28px] leading-tight font-bold xl:text-[36px]">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
