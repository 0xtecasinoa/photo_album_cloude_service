'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Share2, X, Loader2, Copy, Check, Link2Off } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select } from '@/components/ui/input';
import {
  createShareLinkAction,
  revokeShareLinkAction,
  type ShareFormState,
} from '@/app/(app)/projects/[projectId]/share-actions';
import type { ShareLinkListItem } from '@/lib/queries/share-links';
import { formatShotAt } from '@/lib/utils';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? '発行中…' : '共有リンクを発行'}
    </Button>
  );
}

function CopyField({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border-success/40 bg-success-tint rounded-[10px] border px-5 py-4">
      <p className="text-success text-[13px] font-bold">共有リンクを発行しました</p>
      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="共有リンク"
          onFocus={(e) => e.currentTarget.select()}
          className="border-border h-10 min-w-0 flex-1 rounded-[8px] border bg-white px-3 text-[12px]"
        />
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? 'コピーしました' : 'コピー'}
        </Button>
      </div>
      <p className="text-ink-muted mt-2 text-[11px]">
        パスワードを設定した場合は、リンクとは別の手段でお伝えください。
      </p>
    </div>
  );
}

function linkStatus(link: ShareLinkListItem): { label: string; variant: 'success' | 'danger' | 'neutral' } {
  if (link.revokedAt) return { label: '取り消し済み', variant: 'danger' };
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return { label: '期限切れ', variant: 'neutral' };
  if (link.maxViews !== null && link.viewCount >= link.maxViews) return { label: '上限到達', variant: 'neutral' };
  return { label: '有効', variant: 'success' };
}

export function ShareDialog({
  projectId,
  links,
  canShare,
  canRevoke,
}: {
  projectId: string;
  links: ShareLinkListItem[];
  canShare: boolean;
  canRevoke: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [createState, createAction] = useActionState<ShareFormState, FormData>(createShareLinkAction, {});
  const [revokeState, revokeAction] = useActionState<ShareFormState, FormData>(revokeShareLinkAction, {});
  const dialogRef = useRef<HTMLDivElement>(null);

  const latest = (revokeState.at ?? 0) > (createState.at ?? 0) ? revokeState : createState;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!canShare && links.length === 0) return null;

  const active = links.filter((l) => linkStatus(l).label === '有効').length;

  return (
    <>
      <Button variant="outline" size="lg" onClick={() => setOpen(true)}>
        <Share2 className="size-4" aria-hidden />
        共有{active > 0 && `（${active}）`}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#0B1849]/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-title"
          onMouseDown={(e) => {
            if (!dialogRef.current?.contains(e.target as Node)) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto rounded-[14px] bg-white p-7 shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id="share-title" className="text-brand text-[20px] font-bold">現場を共有</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="text-ink-muted hover:bg-surface-sunken grid size-9 place-items-center rounded-full"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {latest.error && (
              <p role="alert" className="border-danger/40 bg-danger-tint text-danger mb-5 rounded-[8px] border px-4 py-3 text-[13px]">
                {latest.error}
              </p>
            )}
            {latest.message && (
              <p role="status" className="border-success/40 bg-success-tint text-success mb-5 rounded-[8px] border px-4 py-3 text-[13px]">
                {latest.message}
              </p>
            )}
            {createState.shareUrl && <div className="mb-6"><CopyField url={createState.shareUrl} /></div>}

            {canShare && (
              <form action={createAction} className="space-y-5" noValidate>
                <input type="hidden" name="projectId" value={projectId} />

                <div>
                  <Label htmlFor="sh-name">リンク名（社内管理用）</Label>
                  <Input id="sh-name" name="name" className="mt-2" placeholder="発注者提出用" />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="sh-password">パスワード</Label>
                    <Input id="sh-password" name="password" type="text" className="mt-2"
                      placeholder="未設定ならURLだけで閲覧可" autoComplete="off" />
                  </div>
                  <div>
                    <Label htmlFor="sh-expires">有効期限</Label>
                    <Select id="sh-expires" name="expiresInDays" className="mt-2" defaultValue="14">
                      <option value="7">7日間</option>
                      <option value="14">14日間</option>
                      <option value="30">30日間</option>
                      <option value="90">90日間</option>
                      <option value="">無期限</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="sh-maxviews">閲覧回数の上限</Label>
                  <Input id="sh-maxviews" name="maxViews" type="number" min={1} className="mt-2"
                    placeholder="未入力なら無制限" />
                </div>

                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" name="allowDownload" className="accent-accent mt-1 size-[15px] shrink-0" />
                  <span className="text-[13px] text-ink">
                    元のサイズでのダウンロードを許可する
                    <span className="text-ink-muted mt-0.5 block text-[11px]">
                      許可する場合はパスワードが必須です。原本を配れるリンクが
                      URL だけで開けると、転送された時点で誰でも持ち出せてしまいます。
                    </span>
                  </span>
                </label>

                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>
                    閉じる
                  </Button>
                  <SubmitButton />
                </div>
              </form>
            )}

            {links.length > 0 && (
              <section className="mt-8">
                <h3 className="text-[14px] font-bold text-ink">発行済みのリンク（{links.length}件）</h3>
                <ul className="border-border-subtle divide-border-subtle mt-3 divide-y overflow-hidden rounded-[10px] border">
                  {links.map((link) => {
                    const status = linkStatus(link);
                    return (
                      <li key={link.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-ink">
                            {link.name ?? '名称未設定'}
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {link.hasPassword && <Badge variant="neutral">パスワードあり</Badge>}
                            {link.allowDownload && <Badge variant="admin">DL可</Badge>}
                          </p>
                          <p className="text-ink-muted mt-1 text-[11px]">
                            {link.expiresAt ? `期限 ${formatShotAt(link.expiresAt)}` : '無期限'}
                            　/　閲覧 {link.viewCount}
                            {link.maxViews !== null && ` / ${link.maxViews}`} 回
                          </p>
                        </div>
                        {canRevoke && !link.revokedAt && (
                          <form
                            action={revokeAction}
                            onSubmit={(e) => {
                              if (!confirm('この共有リンクを取り消します。開けなくなります。よろしいですか？')) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <input type="hidden" name="projectId" value={projectId} />
                            <input type="hidden" name="shareLinkId" value={link.id} />
                            <button
                              type="submit"
                              aria-label={`${link.name ?? '共有リンク'} を取り消す`}
                              title="取り消す"
                              className="text-danger hover:bg-danger-tint grid size-9 place-items-center rounded-[6px] transition-colors"
                            >
                              <Link2Off className="size-[18px]" aria-hidden />
                            </button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
