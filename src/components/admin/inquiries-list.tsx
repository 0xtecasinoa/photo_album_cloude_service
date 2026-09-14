'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2, Mail, Phone, Building2 } from 'lucide-react';
import { setInquiryStatusAction, type AdminActionState } from '@/app/admin/actions';
import type { AdminInquiry } from '@/lib/queries/admin';
import { formatShotAt } from '@/lib/utils';
import { isPlanKey, PLANS } from '@/lib/plans';

const STATUS_LABELS: Record<string, string> = {
  new: '未対応',
  in_progress: '対応中',
  closed: '完了',
};

const FILTERS = [
  { key: 'all', label: 'すべて' },
  { key: 'new', label: '未対応' },
  { key: 'in_progress', label: '対応中' },
  { key: 'closed', label: '完了' },
];

function StatusButton({
  status,
  label,
  current,
}: {
  status: string;
  label: string;
  current: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending || current}
      className={
        current
          ? 'rounded-[6px] bg-white/20 px-3 py-1.5 text-[12px] font-bold text-white'
          : 'rounded-[6px] border border-white/20 px-3 py-1.5 text-[12px] text-white/70 transition-colors hover:bg-white/10 disabled:opacity-40'
      }
    >
      {pending && !current ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : label}
    </button>
  );
}

function InquiryCard({ inquiry }: { inquiry: AdminInquiry }) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(setInquiryStatusAction, {});

  return (
    <li className="rounded-[12px] border border-white/10 bg-white/[0.04] px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2.5 text-[15px] font-bold text-white">
            <Building2 className="size-4 shrink-0 text-white/40" aria-hidden />
            {inquiry.company}
            <span className="text-[13px] font-normal text-white/60">{inquiry.name} 様</span>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-white/60">
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" aria-hidden />
              <a href={`mailto:${inquiry.email}`} className="break-all hover:underline">{inquiry.email}</a>
            </span>
            {inquiry.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" aria-hidden />
                <a href={`tel:${inquiry.phone}`} className="hover:underline">{inquiry.phone}</a>
              </span>
            )}
            <span className="tabular">{formatShotAt(inquiry.createdAt)}</span>
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-[4px] bg-white/10 px-2.5 py-1 text-[11px] whitespace-nowrap text-white/70">
            {inquiry.topic}
          </span>
          {inquiry.planInterest && isPlanKey(inquiry.planInterest) && (
            <span className="rounded-[4px] bg-[#F0AE1E]/20 px-2.5 py-1 text-[11px] whitespace-nowrap text-[#F0AE1E]">
              {PLANS[inquiry.planInterest].name}
            </span>
          )}
          {inquiry.organizationName && (
            <span className="rounded-[4px] bg-[#2E7E61]/25 px-2.5 py-1 text-[11px] whitespace-nowrap text-[#8EFF9F]">
              既存: {inquiry.organizationName}
            </span>
          )}
        </div>
      </div>

      {inquiry.message && (
        <p className="mt-4 rounded-[8px] bg-black/25 px-4 py-3 text-[13px] leading-[1.9] whitespace-pre-wrap text-white/80">
          {inquiry.message}
        </p>
      )}

      <form action={formAction} className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="inquiryId" value={inquiry.id} />
        <span className="mr-1 text-[12px] text-white/50">対応状況</span>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <StatusButton
            key={key}
            status={key}
            label={label}
            current={inquiry.status === key}
          />
        ))}
        {state.error && <p role="alert" className="text-[12px] text-[#FF9C93]">{state.error}</p>}
      </form>
    </li>
  );
}

export function InquiriesList({
  inquiries,
  activeStatus,
}: {
  inquiries: AdminInquiry[];
  activeStatus: string;
}) {
  return (
    <>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="対応状況で絞り込み">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/admin/inquiries' : `/admin/inquiries?status=${f.key}`}
            aria-current={activeStatus === f.key ? 'page' : undefined}
            className={
              activeStatus === f.key
                ? 'rounded-[30px] bg-white px-4 py-2 text-[13px] font-bold text-[#0E1729]'
                : 'rounded-[30px] border border-white/20 px-4 py-2 text-[13px] text-white/70 transition-colors hover:bg-white/10'
            }
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {inquiries.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-white/15 px-6 py-16 text-center text-[13px] text-white/40">
          該当するお問い合わせはありません。
        </p>
      ) : (
        <ul className="space-y-4">
          {inquiries.map((q) => (
            <InquiryCard key={q.id} inquiry={q} />
          ))}
        </ul>
      )}
    </>
  );
}
