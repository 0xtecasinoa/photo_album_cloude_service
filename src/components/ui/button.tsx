import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap transition-colors ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ring ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        /** Navy fill — 一括取り込み, アカウントを作成, 続ける */
        primary: 'bg-brand text-white hover:bg-brand-hover',
        /** White fill, navy hairline — 写真を追加, ヘルプページを見る */
        outline: 'bg-white text-brand border border-brand hover:bg-brand-tint',
        /** Gold fill — 14日間無料トライアル, B(太字) */
        accent: 'bg-accent text-white hover:bg-accent-hover',
        /** Gold hairline on navy — プランを確認する (sidebar) */
        accentOutline: 'bg-transparent text-accent border border-accent hover:bg-accent/10',
        ghost: 'bg-transparent text-brand hover:bg-brand-tint',
        danger: 'bg-transparent text-danger hover:bg-danger-tint',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-[6px]',
        md: 'h-10 px-4 text-sm rounded-[8px]',
        lg: 'h-[50px] px-6 text-[15px] rounded-[10px]',
        pill: 'h-[43px] px-5 text-sm rounded-[30px]',
        icon: 'h-10 w-10 rounded-[8px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
