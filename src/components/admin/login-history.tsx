'use client';

import { useMemo, useState } from 'react';
import { Search, CircleCheck, CircleX } from 'lucide-react';
import type { LoginEvent } from '@/lib/queries/admin';
import { formatShotAt } from '@/lib/utils';

/** 失敗の理由。利用者からの問い合わせに、そのまま言葉で答えられるようにする。 */
const REASONS: Record<string, string> = {
  bad_password: 'パスワード誤り',
  no_password: 'パスワード未設定（招待リンク未使用）',
  user_suspended: 'アカウント停止中',
  organization_suspended: '会社が停止中',
};

const FILTERS = [
  { key: 'all', label: 'すべて' },
  { key: 'auth.login', label: '成功のみ' },
  { key: 'auth.login_failed', label: '失敗のみ' },
];

export function LoginHistory({ events }: { events: LoginEvent[] }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return events.filter((e) => {
      if (filter !== 'all' && e.action !== filter) return false;
      if (!needle) return true;
      return [e.actorEmail, e.actorName, e.organizationName, e.ipAddress].some((v) =>
        v?.toLowerCase().includes(needle),
      );
    });
  }, [events, q, filter]);

  const failed = events.filter((e) => e.action === 'auth.login_failed').length;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={
                filter === f.key
                  ? 'rounded-[30px] bg-white px-4 py-2 text-[13px] font-bold text-[#0E1729]'
                  : 'rounded-[30px] border border-white/20 px-4 py-2 text-[13px] text-white/70 transition-colors hover:bg-white/10'
              }
            >
              {f.label}
            </button>
          ))}
          <span className="ml-2 text-[12px] text-white/40">
            {rows.length} 件（うち失敗 {failed} 件）
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="メール・会社名・IPで検索"
            aria-label="メール・会社名・IPで検索"
            className="h-10 w-[300px] max-w-full rounded-[30px] border border-white/15 bg-white/[0.04] pr-4 pl-10 text-[13px] text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-white/10">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="bg-white/[0.06] text-[12px] text-white/60">
              <th scope="col" className="px-5 py-4 font-medium">結果</th>
              <th scope="col" className="px-5 py-4 font-medium">ユーザー</th>
              <th scope="col" className="px-5 py-4 font-medium">会社</th>
              <th scope="col" className="px-5 py-4 font-medium">IPアドレス</th>
              <th scope="col" className="px-5 py-4 font-medium">日時</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-[13px] text-white/40">
                  該当する記録がありません。
                </td>
              </tr>
            )}
            {rows.map((e) => {
              const ok = e.action === 'auth.login';
              const reason = typeof e.metadata?.reason === 'string' ? e.metadata.reason : null;
              return (
                <tr key={e.id} className={ok ? '' : 'bg-[#D93025]/[0.07]'}>
                  <td className="px-5 py-4">
                    <span className={`flex items-center gap-2 text-[13px] ${ok ? 'text-[#8EFF9F]' : 'text-[#FF9C93]'}`}>
                      {ok ? <CircleCheck className="size-4" aria-hidden /> : <CircleX className="size-4" aria-hidden />}
                      {ok ? '成功' : '失敗'}
                    </span>
                    {!ok && reason && (
                      <span className="mt-1 block text-[11px] text-white/40">
                        {REASONS[reason] ?? reason}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-[13px] text-white">{e.actorName ?? '—'}</p>
                    <p className="mt-0.5 text-[11px] text-white/40">{e.actorEmail}</p>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-white/80">{e.organizationName}</td>
                  <td className="tabular px-5 py-4 text-[12px] text-white/60">{e.ipAddress ?? '—'}</td>
                  <td className="tabular px-5 py-4 text-[12px] text-white/60">{formatShotAt(e.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
