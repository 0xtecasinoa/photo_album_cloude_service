import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Users, FolderOpen, Camera, HardDrive, Mail, ArrowRight } from 'lucide-react';
import { requirePlatformAdmin } from '@/lib/auth/admin';
import { getPlatformStats, listAllOrganizations, listInquiries } from '@/lib/queries/admin';
import { formatBytes, formatShotAt } from '@/lib/utils';
import { planName } from '@/lib/plans';

export const metadata: Metadata = { title: '運営管理' };

function Tile({
  label,
  value,
  sub,
  icon: Icon,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Users;
  alert?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-white/[0.04] px-6 py-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-white/60">{label}</p>
        <Icon className={alert ? 'size-[18px] text-[#F0AE1E]' : 'size-[18px] text-white/40'} strokeWidth={1.7} aria-hidden />
      </div>
      <p className="tabular mt-3 text-[28px] leading-none font-bold text-white">{value}</p>
      {sub && <p className="mt-2 text-[12px] text-white/50">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requirePlatformAdmin();

  const [stats, orgs, inquiries] = await Promise.all([
    getPlatformStats(),
    listAllOrganizations(),
    listInquiries('new'),
  ]);

  const recentOrgs = orgs.slice(0, 5);

  return (
    <>
      <h1 className="text-[24px] font-bold text-white">ダッシュボード</h1>
      <p className="mt-2 text-[13px] text-white/50">
        サービス全体の状況です。会社をまたいだ情報を表示しています。
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Tile
          label="契約会社"
          value={stats.organizations.toLocaleString('ja-JP')}
          sub={`稼働中 ${stats.activeOrganizations} 社`}
          icon={Building2}
        />
        <Tile
          label="ユーザー"
          value={stats.users.toLocaleString('ja-JP')}
          sub={`有効 ${stats.activeUsers} 名`}
          icon={Users}
        />
        <Tile label="現場" value={stats.projects.toLocaleString('ja-JP')} icon={FolderOpen} />
        <Tile label="写真" value={stats.photos.toLocaleString('ja-JP')} sub="枚" icon={Camera} />
        <Tile label="保存容量" value={formatBytes(stats.storageUsedBytes)} sub="全社合計" icon={HardDrive} />
        <Tile
          label="未対応のお問い合わせ"
          value={stats.newInquiries.toLocaleString('ja-JP')}
          sub="件"
          icon={Mail}
          alert={stats.newInquiries > 0}
        />
      </div>

      {inquiries.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-white">未対応のお問い合わせ</h2>
            <Link href="/admin/inquiries" className="flex items-center gap-1 text-[13px] text-[#8FB8FF] hover:underline">
              すべて見る
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="divide-y divide-white/10 overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.04]">
            {inquiries.slice(0, 5).map((q) => (
              <li key={q.id} className="px-6 py-4">
                <p className="text-[14px] font-bold text-white">
                  {q.company}
                  <span className="ml-2 text-[12px] font-normal text-white/50">{q.name}</span>
                </p>
                <p className="mt-1 text-[12px] text-white/50">
                  {q.topic}　/　{q.email}　/　{formatShotAt(q.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-white">最近の会社</h2>
          <Link href="/admin/organizations" className="flex items-center gap-1 text-[13px] text-[#8FB8FF] hover:underline">
            すべて見る
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <ul className="divide-y divide-white/10 overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.04]">
          {recentOrgs.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-white">
                  {o.name}
                  {!o.isActive && (
                    <span className="bg-danger/25 text-danger ml-2 rounded-[4px] px-2 py-0.5 text-[11px]">停止中</span>
                  )}
                </p>
                <p className="mt-1 text-[12px] text-white/50">
                  {planName(o.plan)}　/　{o.memberCount} 名　/　{o.projectCount} 現場　/　{o.photoCount} 枚
                </p>
              </div>
              <p className="tabular shrink-0 text-[12px] text-white/40">{formatShotAt(o.createdAt)}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
