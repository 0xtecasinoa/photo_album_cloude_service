import type { Metadata } from 'next';
import { UserPlus, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { demoMembers } from '@/lib/demo-data';

export const metadata: Metadata = { title: 'メンバー・権限' };

const ROLE_VARIANT = {
  admin: 'admin',
  editor: 'editor',
  viewer: 'viewer',
} as const;

export default function MembersPage() {
  return (
    <>
      <PageHeader
        title="メンバー・権限"
        actions={
          <Button variant="primary" size="lg">
            <UserPlus className="size-4" aria-hidden />
            メンバーを招待
          </Button>
        }
      />

      <div className="border-border-subtle flex flex-wrap items-center justify-between gap-4 border-b px-8 py-5 xl:px-[31px]">
        <div>
          <h2 className="text-[15px] font-bold text-ink">メンバー一覧</h2>
          <p className="text-ink-muted mt-1 text-[13px]">
            プロジェクトメンバーの管理や権限設定を行います。
          </p>
        </div>
        <div className="relative">
          <Search
            className="text-ink-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            placeholder="メンバーを検索"
            aria-label="メンバーを検索"
            className="border-border focus:border-brand focus:outline-brand-ring/40 h-10 w-[278px] max-w-full rounded-[30px] border pr-4 pl-10 text-[13px] focus:outline-2"
          />
        </div>
      </div>

      <div className="px-8 pt-8 xl:px-[31px]">
        <div className="border-border-subtle overflow-hidden rounded-[10px] border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="bg-brand-tint text-ink-muted text-[13px]">
                  <th scope="col" className="px-6 py-5 font-medium">メンバー</th>
                  <th scope="col" className="px-6 py-5 font-medium">メールアドレス</th>
                  <th scope="col" className="px-6 py-5 font-medium">権限</th>
                  <th scope="col" className="px-6 py-5 font-medium">所属会社</th>
                  <th scope="col" className="px-6 py-5 font-medium">最終ログイン</th>
                  <th scope="col" className="px-6 py-5 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {demoMembers.map((m) => (
                  <tr key={m.id} className="border-border-subtle border-t">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar */}
                        <img
                          src="/brand/avatar-placeholder.svg"
                          alt=""
                          className="size-[52px] shrink-0 rounded-full"
                        />
                        <div>
                          <p className="flex items-center gap-2 text-sm font-bold text-ink">
                            {m.name}
                            {m.isSelf && <Badge variant="brand">自分</Badge>}
                          </p>
                          <p className="text-ink-muted text-xs">{m.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-[13px] text-ink">{m.email}</td>
                    <td className="px-6 py-5">
                      <Badge variant={ROLE_VARIANT[m.roleKey]} className="px-4 py-1.5">
                        {m.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-[13px] text-ink">{m.company}</td>
                    <td className="tabular px-6 py-5 text-[13px] text-ink">{m.lastLogin}</td>
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        className="text-danger hover:bg-danger-tint grid size-9 place-items-center rounded-[6px] transition-colors disabled:opacity-30"
                        disabled={m.isSelf}
                        aria-label={`${m.name} を削除`}
                        title={m.isSelf ? '自分自身は削除できません' : `${m.name} を削除`}
                      >
                        <Trash2 className="size-[18px]" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-brand text-[15px] font-bold">
            全 {demoMembers.length} 件中 1-{demoMembers.length} 件を表示
          </p>
          <nav className="flex items-center gap-2" aria-label="ページ送り">
            <button
              type="button"
              className="bg-surface-sunken text-ink-muted grid size-10 place-items-center rounded-[8px] disabled:opacity-40"
              disabled
              aria-label="前のページ"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-current="page"
              className="bg-brand grid size-10 place-items-center rounded-[8px] text-sm font-bold text-white"
            >
              1
            </button>
            <button
              type="button"
              className="bg-surface-sunken text-ink-muted grid size-10 place-items-center rounded-[8px] disabled:opacity-40"
              disabled
              aria-label="次のページ"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </nav>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-ink">権限について</h3>
            <p className="text-ink-muted mt-2 text-[13px]">
              各権限の詳細については、ヘルプページをご確認ください。
            </p>
          </div>
          <Button variant="outline" size="lg">
            ヘルプページを見る
          </Button>
        </div>
      </div>
    </>
  );
}
