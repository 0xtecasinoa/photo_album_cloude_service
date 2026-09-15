'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Eye, Users, Building2, Globe, Search, Monitor, Clock } from 'lucide-react';
import { formatShotAt } from '@/lib/utils';
import type { AccessSummary, UserActivity, AccessLogRow } from '@/lib/queries/access-logs';

const RANGES = [
  { days: 1, label: '24時間' },
  { days: 7, label: '7日間' },
  { days: 30, label: '30日間' },
  { days: 90, label: '90日間' },
];

function Tile({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string;
  value: number;
  unit: string;
  icon: typeof Eye;
}) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-white/[0.04] px-6 py-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-white/60">{label}</p>
        <Icon className="size-[18px] text-white/40" strokeWidth={1.7} aria-hidden />
      </div>
      <p className="tabular mt-3 text-[28px] leading-none font-bold text-white">
        {value.toLocaleString('ja-JP')}
        <span className="ml-1 text-[13px] font-normal text-white/50">{unit}</span>
      </p>
    </div>
  );
}

/** 横棒。件数の多寡を目で追えるようにする。 */
function Bars({ rows }: { rows: { value: string | null; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {rows.length === 0 && <li className="text-[12px] text-white/40">記録がありません。</li>}
      {rows.map((r) => (
        <li key={r.value ?? '—'}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[12px]">
            <span className="min-w-0 truncate text-white/80">{r.value ?? '（不明）'}</span>
            <span className="tabular shrink-0 text-white/50">{r.count.toLocaleString('ja-JP')}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#8FB8FF]" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AccessLogView({
  days,
  summary,
  sections,
  paths,
  devices,
  users,
  hourly,
  logs,
}: {
  days: number;
  summary: AccessSummary;
  sections: { value: string | null; count: number }[];
  paths: { value: string; count: number }[];
  devices: { value: string | null; count: number }[];
  users: UserActivity[];
  hourly: { hour: number; count: number }[];
  logs: AccessLogRow[];
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get('q') ?? '');

  const withParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    return `${pathname}${next.toString() ? `?${next}` : ''}`;
  };

  const maxHour = Math.max(1, ...hourly.map((h) => h.count));

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <nav className="flex flex-wrap gap-2" aria-label="表示期間">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={withParam('days', String(r.days))}
              aria-current={days === r.days ? 'page' : undefined}
              className={
                days === r.days
                  ? 'rounded-[30px] bg-white px-4 py-2 text-[13px] font-bold text-[#0E1729]'
                  : 'rounded-[30px] border border-white/20 px-4 py-2 text-[13px] text-white/70 transition-colors hover:bg-white/10'
              }
            >
              {r.label}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(withParam('q', query.trim() || null));
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="メール・会社名・画面・IPで検索"
            aria-label="メール・会社名・画面・IPで検索"
            className="h-10 w-[320px] max-w-full rounded-[30px] border border-white/15 bg-white/[0.04] pr-4 pl-10 text-[13px] text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="閲覧数" value={summary.views} unit="回" icon={Eye} />
        <Tile label="利用者" value={summary.users} unit="名" icon={Users} />
        <Tile label="会社" value={summary.organizations} unit="社" icon={Building2} />
        <Tile label="未ログインの閲覧" value={summary.anonymousViews} unit="回" icon={Globe} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-[12px] border border-white/10 bg-white/[0.04] px-6 py-5">
          <h2 className="mb-4 text-[14px] font-bold text-white">よく見られている機能</h2>
          <Bars rows={sections} />
        </section>

        <section className="rounded-[12px] border border-white/10 bg-white/[0.04] px-6 py-5">
          <h2 className="mb-4 text-[14px] font-bold text-white">よく開かれている画面</h2>
          <Bars rows={paths} />
        </section>

        <section className="rounded-[12px] border border-white/10 bg-white/[0.04] px-6 py-5">
          <h2 className="mb-4 flex items-center gap-2 text-[14px] font-bold text-white">
            <Monitor className="size-4 text-white/40" aria-hidden />
            端末
          </h2>
          <Bars rows={devices} />

          <h2 className="mt-7 mb-3 flex items-center gap-2 text-[14px] font-bold text-white">
            <Clock className="size-4 text-white/40" aria-hidden />
            時間帯（日本時間）
          </h2>
          <div className="flex h-[70px] items-end gap-[3px]">
            {hourly.map((h) => (
              <div
                key={h.hour}
                title={`${h.hour}時台 ${h.count}回`}
                className="flex-1 rounded-t-[2px] bg-[#8FB8FF]"
                style={{ height: `${Math.max(2, (h.count / maxHour) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-white/35">
            <span>0時</span><span>12時</span><span>23時</span>
          </div>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-[17px] font-bold text-white">利用者ごとの動き（{users.length}名）</h2>
        <div className="overflow-x-auto rounded-[12px] border border-white/10">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="bg-white/[0.06] text-[12px] text-white/60">
                <th scope="col" className="px-5 py-4 font-medium">利用者</th>
                <th scope="col" className="px-5 py-4 font-medium">会社</th>
                <th scope="col" className="px-5 py-4 font-medium">閲覧数</th>
                <th scope="col" className="px-5 py-4 font-medium">使った機能</th>
                <th scope="col" className="px-5 py-4 font-medium">端末</th>
                <th scope="col" className="px-5 py-4 font-medium">最終アクセス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-[13px] text-white/40">記録がありません。</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.userId ?? u.userEmail ?? '—'}>
                  <td className="px-5 py-4">
                    <Link href={withParam('userId', u.userId)} className="text-[13px] font-bold text-white hover:underline">
                      {u.userName ?? '（名称未設定）'}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-white/40">{u.userEmail}</p>
                  </td>
                  <td className="px-5 py-4 text-[13px] text-white/80">{u.organizationName ?? '—'}</td>
                  <td className="tabular px-5 py-4 text-[13px] text-white/80">{u.views.toLocaleString('ja-JP')}</td>
                  <td className="tabular px-5 py-4 text-[13px] text-white/80">{u.sections}</td>
                  <td className="px-5 py-4 text-[12px] text-white/60">{u.devices ?? '—'}</td>
                  <td className="tabular px-5 py-4 text-[12px] text-white/60">
                    {u.lastSeen ? formatShotAt(u.lastSeen) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold text-white">アクセスの記録（直近{logs.length}件）</h2>
          {params.get('userId') && (
            <Link href={withParam('userId', null)} className="text-[13px] text-[#8FB8FF] hover:underline">
              利用者の絞り込みを外す
            </Link>
          )}
        </div>
        <div className="overflow-x-auto rounded-[12px] border border-white/10">
          <table className="w-full min-w-[980px] border-collapse text-left">
            <thead>
              <tr className="bg-white/[0.06] text-[12px] text-white/60">
                <th scope="col" className="px-5 py-3.5 font-medium">日時</th>
                <th scope="col" className="px-5 py-3.5 font-medium">利用者</th>
                <th scope="col" className="px-5 py-3.5 font-medium">会社</th>
                <th scope="col" className="px-5 py-3.5 font-medium">機能</th>
                <th scope="col" className="px-5 py-3.5 font-medium">画面</th>
                <th scope="col" className="px-5 py-3.5 font-medium">端末</th>
                <th scope="col" className="px-5 py-3.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {logs.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[13px] text-white/40">記録がありません。</td></tr>
              )}
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="tabular px-5 py-3 text-[12px] text-white/60">{formatShotAt(l.createdAt)}</td>
                  <td className="px-5 py-3 text-[12px] text-white/80">
                    {l.userName ?? <span className="text-white/40">未ログイン</span>}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-white/60">{l.organizationName ?? '—'}</td>
                  <td className="px-5 py-3 text-[12px] text-white/80">{l.section ?? '—'}</td>
                  <td className="px-5 py-3 font-mono text-[11px] text-white/60">{l.path}</td>
                  <td className="px-5 py-3 text-[12px] text-white/60">{l.device ?? '—'}</td>
                  <td className="tabular px-5 py-3 text-[11px] text-white/50">{l.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
