/**
 * Static 工事黒板 used in the marketing copy to show OCR input vs. output.
 * Presentational only — the real editor renders from a BlackboardLayout.
 */
export function ChalkBoard({
  rows,
  handwritten = false,
}: {
  rows: { label: string; value: string }[];
  handwritten?: boolean;
}) {
  return (
    <div
      className="bg-board border-board-border w-full rounded-[4px] border-[5px] px-5 py-5 sm:px-8 sm:py-7"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: '34px 34px',
      }}
    >
      <dl className="divide-y divide-white/45">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-4 py-3.5 sm:py-4">
            <dt className="text-board-label w-[72px] shrink-0 text-[12px] font-medium sm:text-[13px]">
              {r.label}
            </dt>
            <dd
              className="min-w-0 flex-1 truncate text-[13px] text-white sm:text-[15px]"
              style={handwritten ? { fontFamily: "'Yu Gothic', cursive", letterSpacing: '0.04em' } : undefined}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
