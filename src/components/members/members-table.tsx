'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Search, Loader2, UserMinus, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  changeMemberRoleAction,
  setMemberActiveAction,
  type MemberActionState,
} from '@/app/(app)/members/actions';
import type { MemberListItem, OrgRole } from '@/lib/queries/members';
import { formatShotAt } from '@/lib/utils';

const PER_PAGE = 10;

const ROLE_VARIANT: Record<string, 'admin' | 'editor' | 'viewer' | 'neutral' | 'brand'> = {
  owner: 'brand',
  admin: 'admin',
  manager: 'admin',
  editor: 'editor',
  photographer: 'editor',
  viewer: 'viewer',
  partner: 'neutral',
};

function RoleSelect({
  member,
  roles,
  disabled,
}: {
  member: MemberListItem;
  roles: OrgRole[];
  disabled: boolean;
}) {
  const [state, formAction] = useActionState<MemberActionState, FormData>(changeMemberRoleAction, {});
  const { pending } = useFormStatus();

  if (disabled) {
    return (
      <Badge variant={ROLE_VARIANT[member.roleSlug ?? ''] ?? 'neutral'} className="px-4 py-1.5">
        {member.roleName ?? '未設定'}
      </Badge>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={member.id} />
      <select
        name="roleId"
        defaultValue={member.roleId ?? ''}
        aria-label={`${member.name ?? member.email} の権限`}
        disabled={pending}
        // 変更即保存。「保存」ボタンを別に置くと押し忘れて権限が変わっていない、
        // という事故が起きやすいため。
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="border-border focus:border-brand focus:outline-brand-ring/40 h-9 rounded-[8px] border bg-white px-3 text-[13px] focus:outline-2 disabled:opacity-50"
      >
        {roles.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      {state.error && (
        <p role="alert" className="text-danger mt-1.5 max-w-[220px] text-[11px]">{state.error}</p>
      )}
    </form>
  );
}

function AccessButton({ member, disabled }: { member: MemberListItem; disabled: boolean }) {
  const [state, formAction] = useActionState<MemberActionState, FormData>(setMemberActiveAction, {});
  const { pending } = useFormStatus();
  const next = !member.isActive;

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        aria-label="自分自身は停止できません"
        title="自分自身は停止できません"
        className="text-ink-muted grid size-9 place-items-center rounded-[6px] opacity-30"
      >
        <UserMinus className="size-[18px]" aria-hidden />
      </button>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!next && !confirm(`${member.name ?? member.email} のアクセスを停止します。よろしいですか？`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={member.id} />
      <input type="hidden" name="isActive" value={String(next)} />
      <button
        type="submit"
        disabled={pending}
        aria-label={next ? `${member.name ?? member.email} のアクセスを再開` : `${member.name ?? member.email} のアクセスを停止`}
        title={next ? 'アクセスを再開' : 'アクセスを停止'}
        className={
          next
            ? 'text-success hover:bg-success-tint grid size-9 place-items-center rounded-[6px] transition-colors'
            : 'text-danger hover:bg-danger-tint grid size-9 place-items-center rounded-[6px] transition-colors'
        }
      >
        {pending ? (
          <Loader2 className="size-[18px] animate-spin" aria-hidden />
        ) : next ? (
          <UserCheck className="size-[18px]" aria-hidden />
        ) : (
          <UserMinus className="size-[18px]" aria-hidden />
        )}
      </button>
      {state.error && (
        <p role="alert" className="text-danger mt-1.5 max-w-[180px] text-[11px]">{state.error}</p>
      )}
    </form>
  );
}

export function MembersTable({
  members,
  roles,
  currentUserId,
  canManage,
  companyName,
}: {
  members: MemberListItem[];
  roles: OrgRole[];
  currentUserId: string;
  canManage: boolean;
  companyName: string;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.name, m.email, m.roleName, m.department].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [members, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const slice = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const from = filtered.length === 0 ? 0 : (current - 1) * PER_PAGE + 1;

  return (
    <>
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
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="メンバーを検索"
            aria-label="メンバーを検索"
            className="border-border focus:border-brand focus:outline-brand-ring/40 h-10 w-[278px] max-w-full rounded-[30px] border pr-4 pl-10 text-[13px] focus:outline-2"
          />
        </div>
      </div>

      <div className="px-8 pt-8 pb-16 xl:px-[31px]">
        <div className="border-border-subtle overflow-hidden rounded-[10px] border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
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
                {slice.length === 0 && (
                  <tr className="border-border-subtle border-t">
                    <td colSpan={6} className="text-ink-muted px-6 py-12 text-center text-[13px]">
                      該当するメンバーがいません。
                    </td>
                  </tr>
                )}
                {slice.map((m) => {
                  const isSelf = m.id === currentUserId;
                  return (
                    <tr key={m.id} className={`border-border-subtle border-t ${m.isActive ? '' : 'bg-surface-sunken/50'}`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element -- 外部プロバイダのアバター */}
                          <img
                            src={m.image || '/brand/avatar-placeholder.svg'}
                            alt=""
                            className="size-[52px] shrink-0 rounded-full object-cover"
                          />
                          <div>
                            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                              {m.name ?? m.email}
                              {isSelf && <Badge variant="brand">自分</Badge>}
                              {m.pending && <Badge variant="neutral">招待中</Badge>}
                              {!m.isActive && <Badge variant="danger">停止中</Badge>}
                            </p>
                            <p className="text-ink-muted text-xs">{m.jobTitle ?? m.roleName ?? 'メンバー'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-[13px] text-ink">{m.email}</td>
                      <td className="px-6 py-5">
                        <RoleSelect member={m} roles={roles} disabled={!canManage} />
                      </td>
                      <td className="px-6 py-5 text-[13px] text-ink">{m.department ?? companyName}</td>
                      <td className="tabular px-6 py-5 text-[13px] text-ink">
                        {m.lastLoginAt ? formatShotAt(m.lastLoginAt) : '—'}
                      </td>
                      <td className="px-6 py-5">
                        <AccessButton member={m} disabled={isSelf || !canManage} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-brand text-[15px] font-bold">
            全 {filtered.length} 件中 {from}-{Math.min(current * PER_PAGE, filtered.length)} 件を表示
          </p>
          <nav className="flex items-center gap-2" aria-label="ページ送り">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={current <= 1}
              className="bg-surface-sunken text-ink-muted grid size-10 place-items-center rounded-[8px] disabled:opacity-40"
              aria-label="前のページ"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-current={n === current ? 'page' : undefined}
                className={
                  n === current
                    ? 'bg-brand grid size-10 place-items-center rounded-[8px] text-sm font-bold text-white'
                    : 'bg-surface-sunken text-ink-muted grid size-10 place-items-center rounded-[8px] text-sm'
                }
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={current >= pageCount}
              className="bg-surface-sunken text-ink-muted grid size-10 place-items-center rounded-[8px] disabled:opacity-40"
              aria-label="次のページ"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </nav>
        </div>

        <section className="mt-12">
          <h3 className="text-sm font-bold text-ink">権限について</h3>
          <p className="text-ink-muted mt-2 text-[13px]">
            権限は現場ごとに上書きできます。ここでの設定は、現場側で個別指定がない場合の既定値です。
          </p>
          <ul className="border-border-subtle divide-border-subtle mt-4 divide-y overflow-hidden rounded-[10px] border bg-white">
            {roles.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14px] font-bold text-ink">
                    {r.name}
                    <Badge variant={ROLE_VARIANT[r.slug ?? ''] ?? 'neutral'}>
                      {r.capabilities.length} 権限
                    </Badge>
                  </p>
                  <p className="text-ink-muted mt-1 text-[12px]">{r.description ?? '—'}</p>
                </div>
                <p className="tabular text-ink-muted shrink-0 text-[13px]">{r.memberCount} 名</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
