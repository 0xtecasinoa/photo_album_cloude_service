import Image from 'next/image';

export function GoogleButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="border-border hover:bg-surface-muted flex h-[57px] w-full items-center justify-center gap-3 rounded-[10px] border bg-white text-[15px] font-bold text-ink transition-colors"
    >
      <Image src="/brand/google.png" alt="" width={24} height={21} className="h-[21px] w-6" />
      {label}
    </button>
  );
}
