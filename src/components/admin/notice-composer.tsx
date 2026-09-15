'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Send, Trash2, TriangleAlert, ShieldAlert, Info } from 'lucide-react';
import { createNoticeAction, deleteNoticeAction, type AdminActionState } from '@/app/admin/actions';
import type { AdminNotice } from '@/lib/queries/notifications';
import { formatShotAt } from '@/lib/utils';

const LEVELS = [
  { key: 'info', label: 'お知らせ', icon: Info, tone: 'text-[#8FB8FF]' },
  { key: 'warning', label: '注意', icon: TriangleAlert, tone: 'text-[#F0AE1E]' },
  { key: 'critical', label: '重要', icon: ShieldAlert, tone: 'text-[#FF9C93]' },
] as const;

const field =
  'h-11 w-full rounded-[8px] border border-white/15 bg-white/[0.04] px-3.5 text-[13px] text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 items-center gap-2 rounded-[8px] bg-white px-6 text-[13px] font-bold text-[#0E1729] transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
      {pending ? '配信中…' : '配信する'}
    </button>
  );
}

export function NoticeComposer({
  notices,
  organizations,
}: {
  notices: AdminNotice[];
  organizations: { id: string; name: string }[];
}) {
  const [createState, createAction] = useActionState<AdminActionState, FormData>(createNoticeAction, {});
  const [deleteState, deleteAction] = useActionState<AdminActionState, FormData>(deleteNoticeAction, {});
  const [level, setLevel] = useState<string>('info');

  const latest = (deleteState.at ?? 0) > (createState.at ?? 0) ? deleteState : createState;

  return (
    <>
      {latest.error && (
        <p role="alert" className="mb-6 rounded-[8px] border border-[#FF9C93]/40 bg-[#D93025]/15 px-5 py-4 text-[13px] text-[#FF9C93]">
          {latest.error}
        </p>
      )}
      {latest.message && (
        <p role="status" className="mb-6 rounded-[8px] border border-[#8EFF9F]/40 bg-[#2E7E61]/20 px-5 py-4 text-[13px] text-[#8EFF9F]">
          {latest.message}
        </p>
      )}

      <form action={createAction} className="rounded-[12px] border border-white/10 bg-white/[0.04] px-6 py-6">
        <h2 className="text-[15px] font-bold text-white">新しいお知らせ</h2>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <label htmlFor="nt-org" className="mb-2 block text-[12px] text-white/60">宛先</label>
            <select id="nt-org" name="organizationId" className={field} defaultValue="">
              <option value="">全社（すべての会社）</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="mb-2 block text-[12px] text-white/60">種別</span>
            <div role="radiogroup" aria-label="種別" className="flex gap-2">
              {LEVELS.map(({ key, label, icon: Icon, tone }) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={level === key}
                  onClick={() => setLevel(key)}
                  className={
                    level === key
                      ? 'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-white/20 text-[13px] font-bold text-white'
                      : 'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-white/15 text-[13px] text-white/60 hover:bg-white/10'
                  }
                >
                  <Icon className={`size-4 ${tone}`} aria-hidden />
                  {label}
                </button>
              ))}
            </div>
            <input type="hidden" name="level" value={level} />
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="nt-title" className="mb-2 block text-[12px] text-white/60">件名 *</label>
          <input id="nt-title" name="title" required maxLength={200} className={field}
            placeholder="3月15日 深夜のメンテナンスのお知らせ" />
        </div>

        <div className="mt-5">
          <label htmlFor="nt-body" className="mb-2 block text-[12px] text-white/60">本文</label>
          <textarea
            id="nt-body"
            name="body"
            rows={4}
            maxLength={4000}
            className="w-full rounded-[8px] border border-white/15 bg-white/[0.04] px-3.5 py-3 text-[13px] text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
            placeholder="3月15日 2:00〜4:00 の間、システムを停止します。"
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <label htmlFor="nt-link" className="mb-2 block text-[12px] text-white/60">遷移先（任意）</label>
            <input id="nt-link" name="linkUrl" className={field} placeholder="/settings" />
            <p className="mt-1.5 text-[11px] text-white/35">
              同一サイトのパスのみ。外部サイトを指定しても既定の画面に戻ります。
            </p>
          </div>
          <div>
            <label htmlFor="nt-exp" className="mb-2 block text-[12px] text-white/60">掲示期間（任意）</label>
            <select id="nt-exp" name="expiresInDays" className={field} defaultValue="">
              <option value="">無期限（取り下げるまで）</option>
              <option value="3">3日間</option>
              <option value="7">7日間</option>
              <option value="14">14日間</option>
              <option value="30">30日間</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <SubmitButton />
        </div>
      </form>

      <section className="mt-10">
        <h2 className="mb-4 text-[17px] font-bold text-white">配信済み（{notices.length}件）</h2>
        {notices.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-white/15 px-6 py-12 text-center text-[13px] text-white/40">
            まだお知らせはありません。
          </p>
        ) : (
          <ul className="space-y-3">
            {notices.map((n) => {
              const meta = LEVELS.find((l) => l.key === n.level) ?? LEVELS[0];
              const Icon = meta.icon;
              return (
                <li key={n.id} className="flex flex-wrap items-start gap-4 rounded-[12px] border border-white/10 bg-white/[0.04] px-6 py-4">
                  <Icon className={`mt-0.5 size-5 shrink-0 ${meta.tone}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-white">
                      {n.title}
                      {n.expired && (
                        <span className="rounded-[4px] bg-white/10 px-2 py-0.5 text-[11px] text-white/50">掲示終了</span>
                      )}
                    </p>
                    {n.body && (
                      <p className="mt-1.5 text-[12px] leading-[1.9] whitespace-pre-wrap text-white/60">{n.body}</p>
                    )}
                    <p className="mt-2 text-[11px] text-white/40">
                      宛先: {n.organizationId ? '指定の会社' : '全社'}
                      　/　既読 {n.readCount} / {n.audienceSize} 名
                      　/　{formatShotAt(n.createdAt)}
                      {n.expiresAt && `　/　${formatShotAt(n.expiresAt)} まで`}
                    </p>
                  </div>
                  <form
                    action={deleteAction}
                    onSubmit={(e) => {
                      if (!confirm(`「${n.title}」を取り下げます。利用者には表示されなくなります。よろしいですか？`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="noticeId" value={n.id} />
                    <button
                      type="submit"
                      aria-label={`${n.title} を取り下げる`}
                      title="取り下げる"
                      className="grid size-9 place-items-center rounded-[6px] text-[#FF9C93] transition-colors hover:bg-white/10"
                    >
                      <Trash2 className="size-[18px]" aria-hidden />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
