import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** Role and status pills — 管理者 / 編集者 / 閲覧者, AI解析済み, 自アプリ. */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        admin: 'bg-brand-ring/20 text-brand',
        editor: 'bg-success-tint text-success',
        viewer: 'bg-[#F7D9EC] text-[#B4358A]',
        neutral: 'bg-surface-sunken text-ink-muted',
        success: 'bg-success-tint text-success',
        danger: 'bg-danger-tint text-danger',
        brand: 'bg-brand text-white',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
