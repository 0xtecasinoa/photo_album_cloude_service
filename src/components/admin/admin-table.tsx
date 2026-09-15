'use client';

import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Search, Loader2, Ban, RotateCcw, KeyRound, Copy, Check, X } from 'lucide-react';
import {
  setOrganizationActiveAction,
  setUserActiveAction,
  issuePasswordResetAction,
  type AdminActionState,
  type ResetLinkState,
} from '@/app/admin/actions';
import type { AdminOrganization, AdminUser } from '@/lib/queries/admin';
import { formatBytes, formatShotAt } from '@/lib/utils';
import { planName } from '@/lib/plans';

function Pill({ tone, children }: { tone: 'ok' | 'stop' | 'muted' | 'warn'; children: React.ReactNode }) {
  const styles = {
    ok: 'bg-[#2E7E61]/25 text-[#8EFF9F]',
    stop: 'bg-[#D93025]/25 text-[#FF9C93]',
    warn: 'bg-[#F0AE1E]/20 text-[#F0AE1E]',
    muted: 'bg-white/10 text-white/60',
  }[tone];
  return <span className={`rounded-[4px] px-2 py-0.5 text-[11px] whitespace-nowrap ${styles}`}>{children}</span>;
}

/*
 * 送信ボタンは form の「子」として置く必要がある。
 * useFormStatus は親の form を見るため、form を描く側で呼んでも
 * pending が常に false になり、押しても無反応に見える。
 */
function ToggleSubmit({ next, label }: { next: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={next ? `${label} を再開` : `${label} を停止`}
      title={next ? '再開する' : '停止する'}
      className={
        next
          ? 'grid size-9 place-items-center rounded-[6px] text-[#8EFF9F] transition-colors hover:bg-white/10 disabled:opacity-50'
          : 'grid size-9 place-items-center rounded-[6px] text-[#FF9C93] transition-colors hover:bg-white/10 disabled:opacity-50'
      }
    >
      {pending ? (
        <Loader2 className="size-[18px] animate-spin" aria-hidden />
      ) : next ? (
        <RotateCcw className="size-[18px]" aria-hidden />
      ) : (
        <Ban className="size-[18px]" aria-hidden />
      )}
    </button>
  );
}

function ToggleButton({
  action,
  idName,
  idValue,
  isActive,
  label,
  confirmText,
}: {
  action: (state: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  idName: string;
  idValue: string;
  isActive: boolean;
  label: string;
  confirmText: string;
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(action, {});
  const next = !isActive;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!next && !confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name={idName} value={idValue} />
      <input type="hidden" name="isActive" value={String(next)} />
      <ToggleSubmit next={next} label={label} />
      {state.error && <p role="alert" className="mt-1 max-w-[180px] text-[11px] text-[#FF9C93]">{state.error}</p>}
    </form>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/40" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-[300px] max-w-full rounded-[30px] border border-white/15 bg-white/[0.04] pr-4 pl-10 text-[13px] text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
      />
    </div>
  );
}

export function OrganizationsTable({ organizations }: { organizations: AdminOrganization[] }) {
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return organizations;
    return organizations.filter((o) =>
      [o.name, o.slug, o.plan].some((v) => v?.toLowerCase().includes(needle)),
    );
  }, [organizations, q]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] text-white/50">全 {rows.length} 社</p>
        <SearchBox value={q} onChange={setQ} placeholder="会社名で検索" />
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-white/10">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="bg-white/[0.06] text-[12px] text-white/60">
              <th scope="col" className="px-5 py-4 font-medium">会社</th>
              <th scope="col" className="px-5 py-4 font-medium">プラン</th>
              <th scope="col" className="px-5 py-4 font-medium">人数</th>
              <th scope="col" className="px-5 py-4 font-medium">現場 / 写真</th>
              <th scope="col" className="px-5 py-4 font-medium">保存容量</th>
              <th scope="col" className="px-5 py-4 font-medium">登録日</th>
              <th scope="col" className="px-5 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-white/40">
                  該当する会社がありません。
                </td>
              </tr>
            )}
            {rows.map((o) => (
              <tr key={o.id} className={o.isActive ? '' : 'bg-[#D93025]/[0.07]'}>
                <td className="px-5 py-4">
                  <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-white">
                    {o.name}
                    {!o.isActive && <Pill tone="stop">停止中</Pill>}
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">{o.slug}</p>
                </td>
                <td className="px-5 py-4">
                  <Pill tone={o.plan === 'trial' ? 'warn' : 'muted'}>{planName(o.plan)}</Pill>
                </td>
                <td className="tabular px-5 py-4 text-[13px] text-white/80">
                  {o.memberCount} / {o.seatLimit}
                </td>
                <td className="tabular px-5 py-4 text-[13px] text-white/80">
                  {o.projectCount} / {o.photoCount.toLocaleString('ja-JP')}
                </td>
                <td className="tabular px-5 py-4 text-[13px] text-white/80">
                  {formatBytes(o.storageUsedBytes)}
                  <span className="text-white/40"> / {formatBytes(o.storageQuotaBytes)}</span>
                </td>
                <td className="tabular px-5 py-4 text-[12px] text-white/60">{formatShotAt(o.createdAt)}</td>
                <td className="px-5 py-4">
                  <ToggleButton
                    action={setOrganizationActiveAction}
                    idName="organizationId"
                    idValue={o.id}
                    isActive={o.isActive}
                    label={o.name}
                    confirmText={`「${o.name}」を停止します。所属するユーザーはログインできなくなります。よろしいですか？`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * パスワード再設定リンクの発行。
 *
 * 運営が新しいパスワードを決めて伝える形にはしていません。他人のパスワードを
 * 知っている状態を作らないため、本人が設定する導線を渡します。
 */
function ResetSubmit({ label, onPress }: { label: string; onPress: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`${label} のパスワード再設定リンクを発行`}
      title="パスワード再設定リンクを発行"
      onClick={onPress}
      className="grid size-9 place-items-center rounded-[6px] text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-[18px] animate-spin" aria-hidden />
      ) : (
        <KeyRound className="size-[18px]" aria-hidden />
      )}
    </button>
  );
}

function ResetPasswordButton({ user }: { user: AdminUser }) {
  const [state, formAction] = useActionState<ResetLinkState, FormData>(issuePasswordResetAction, {});
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const showLink = state.resetUrl && !dismissed;

  return (
    <>
      <form action={formAction}>
        <input type="hidden" name="userId" value={user.id} />
        <ResetSubmit label={user.name ?? user.email} onPress={() => setDismissed(false)} />
      </form>

      {state.error && <p role="alert" className="mt-1 max-w-[200px] text-[11px] text-[#FF9C93]">{state.error}</p>}

      {showLink && (
        <div className="mt-2 w-[280px] rounded-[8px] border border-white/20 bg-black/40 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] text-white/60">
              {state.resetEmail} 宛の再設定リンク（24時間有効）
            </p>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="閉じる"
              className="text-white/40 hover:text-white"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
          <input
            readOnly
            value={state.resetUrl}
            aria-label="パスワード再設定リンク"
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 w-full rounded-[6px] border border-white/15 bg-white/[0.06] px-2 py-1.5 text-[11px] text-white"
          />
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(state.resetUrl!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
            className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8FB8FF] hover:underline"
          >
            {copied ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
            {copied ? 'コピーしました' : 'リンクをコピー'}
          </button>
        </div>
      )}
    </>
  );
}

export function UsersTable({ users, currentAdminId }: { users: AdminUser[]; currentAdminId: string }) {
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((u) =>
      [u.name, u.email, u.organizationName, u.roleName].some((v) => v?.toLowerCase().includes(needle)),
    );
  }, [users, q]);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[13px] text-white/50">全 {rows.length} 名</p>
        <SearchBox value={q} onChange={setQ} placeholder="氏名・メール・会社名で検索" />
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-white/10">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="bg-white/[0.06] text-[12px] text-white/60">
              <th scope="col" className="px-5 py-4 font-medium">ユーザー</th>
              <th scope="col" className="px-5 py-4 font-medium">所属会社</th>
              <th scope="col" className="px-5 py-4 font-medium">権限</th>
              <th scope="col" className="px-5 py-4 font-medium">最終ログイン</th>
              <th scope="col" className="px-5 py-4 font-medium">登録日</th>
              <th scope="col" className="px-5 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[13px] text-white/40">
                  該当するユーザーがいません。
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className={u.isActive ? '' : 'bg-[#D93025]/[0.07]'}>
                <td className="px-5 py-4">
                  <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-white">
                    {u.name ?? u.email}
                    {u.id === currentAdminId && <Pill tone="ok">自分</Pill>}
                    {u.isPlatformAdmin && <Pill tone="warn">運営</Pill>}
                    {!u.isActive && <Pill tone="stop">停止中</Pill>}
                  </p>
                  <p className="mt-1 text-[11px] text-white/40">{u.email}</p>
                </td>
                <td className="px-5 py-4 text-[13px] text-white/80">{u.organizationName}</td>
                <td className="px-5 py-4 text-[13px] text-white/80">{u.roleName ?? '—'}</td>
                <td className="tabular px-5 py-4 text-[12px] text-white/60">
                  {u.lastLoginAt ? formatShotAt(u.lastLoginAt) : '—'}
                </td>
                <td className="tabular px-5 py-4 text-[12px] text-white/60">{formatShotAt(u.createdAt)}</td>
                <td className="px-5 py-4">
                  {u.isPlatformAdmin ? (
                    <span className="text-[11px] text-white/30">運営管理者は変更不可</span>
                  ) : (
                    <div className="flex items-start gap-1">
                      <ResetPasswordButton user={u} />
                      <ToggleButton
                        action={setUserActiveAction}
                        idName="userId"
                        idValue={u.id}
                        isActive={u.isActive}
                        label={u.name ?? u.email}
                        confirmText={`${u.name ?? u.email} のアクセスを停止します。よろしいですか？`}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
