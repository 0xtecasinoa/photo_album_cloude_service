import type { Metadata } from 'next';
import { ShieldAlert } from 'lucide-react';
import { requireAccessLogViewer, ACCESS_LOG_VIEWER_EMAIL } from '@/lib/access-log/viewer';
import {
  getAccessSummary,
  getTopSections,
  getTopPaths,
  getDeviceBreakdown,
  getUserActivity,
  getHourlyPattern,
  listAccessLogs,
} from '@/lib/queries/access-logs';
import { AccessLogView } from '@/components/admin/access-log-view';

export const metadata: Metadata = { title: 'アクセスログ — 運営管理' };
export const dynamic = 'force-dynamic';

export default async function AccessLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; q?: string; section?: string; userId?: string }>;
}) {
  // このアドレス以外は 404。運営管理者であっても見られない。
  await requireAccessLogViewer();

  const sp = await searchParams;
  const days = Number(sp.days) > 0 ? Math.min(Number(sp.days), 365) : 7;
  const filters = { days, query: sp.q, section: sp.section, userId: sp.userId };

  const [summary, sections, paths, devices, users, hourly, logs] = await Promise.all([
    getAccessSummary(filters),
    getTopSections(filters),
    getTopPaths(filters),
    getDeviceBreakdown(filters),
    getUserActivity(filters),
    getHourlyPattern(filters),
    listAccessLogs(filters),
  ]);

  return (
    <>
      <h1 className="text-[24px] font-bold text-white">アクセスログ</h1>
      <p className="mt-2 text-[13px] text-white/50">
        利用者がどの画面を見たかの記録です。全社を横断して表示しています。
      </p>

      <p className="mt-5 flex items-start gap-2.5 rounded-[10px] border border-[#F0AE1E]/40 bg-[#F0AE1E]/10 px-5 py-4 text-[12px] leading-[1.9] text-white/80">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#F0AE1E]" aria-hidden />
        <span>
          この画面は <span className="font-bold text-white">{ACCESS_LOG_VIEWER_EMAIL}</span> だけが開けます。
          他の運営管理者には存在しない画面として扱われます。
          個人の行動が分かる記録のため、取り扱いにご注意ください。
        </span>
      </p>

      <AccessLogView
        days={days}
        summary={summary}
        sections={sections}
        paths={paths}
        devices={devices}
        users={users}
        hourly={hourly}
        logs={logs}
      />
    </>
  );
}
