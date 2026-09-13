import { cn } from '@/lib/utils';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-[52px] w-full rounded-[8px] border border-border bg-white px-4 text-sm text-ink',
        'placeholder:text-ink-faint',
        'focus:border-brand focus:outline-2 focus:outline-offset-0 focus:outline-brand-ring/40',
        'disabled:bg-surface-muted disabled:text-ink-muted',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('block text-sm font-medium text-ink', className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-[52px] w-full appearance-none rounded-[8px] border border-border bg-white px-4 pr-10 text-sm text-ink',
        'focus:border-brand focus:outline-2 focus:outline-offset-0 focus:outline-brand-ring/40',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='none' stroke='%231E3A8B' stroke-width='1.5' d='M1 1l5 5 5-5'/%3E%3C/svg%3E\")] bg-[length:12px_8px] bg-[right_1rem_center] bg-no-repeat",
        className,
      )}
      {...props}
    />
  );
}
