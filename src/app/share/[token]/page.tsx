import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Image from 'next/image';
import { Download, Lock, ShieldAlert } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import {
  resolveShareLink,
  loadSharedProject,
  countShareView,
  type ShareLinkState,
} from '@/lib/queries/share-links';
import { shareCookieName, shareCookieMatches } from '@/lib/share/auth';
import { formatShotAt } from '@/lib/utils';
import { SharePasswordForm } from './password-form';

export const metadata: Metadata = { title: '共有された工事写真' };
// 共有リンクは閲覧数の上限や取り消しが即座に効く必要があるため、都度確認する。
export const dynamic = 'force-dynamic';

const UNAVAILABLE: Record<Exclude<ShareLinkState['status'], 'ok'>, string> = {
  not_found: 'この共有リンクは見つかりませんでした。URL をご確認ください。',
  revoked: 'この共有リンクは共有元によって取り消されました。',
  expired: 'この共有リンクは有効期限が切れています。共有元に再発行をご依頼ください。',
  exhausted: 'この共有リンクは閲覧できる回数の上限に達しました。',
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-muted min-h-dvh">
      <header className="border-border-subtle border-b bg-white px-6 py-4">
        <BrandLogo />
      </header>
      <main className="mx-auto w-full max-w-[1180px] px-6 py-12">{children}</main>
    </div>
  );
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await resolveShareLink(token);

  if (link.status !== 'ok') {
    return (
      <Shell>
        <div className="border-border-subtle mx-auto max-w-[520px] rounded-[14px] border bg-white px-8 py-12 text-center">
          <ShieldAlert className="text-ink-muted mx-auto size-10" strokeWidth={1.4} aria-hidden />
          <h1 className="text-brand mt-5 text-[20px] font-bold">閲覧できません</h1>
          <p className="text-ink-muted mt-3 text-[13px] leading-7">{UNAVAILABLE[link.status]}</p>
        </div>
      </Shell>
    );
  }

  if (link.requiresPassword) {
    const store = await cookies();
    const ok = shareCookieMatches(
      store.get(shareCookieName(link.id))?.value,
      link.id,
      link.passwordHash!,
    );
    if (!ok) {
      return (
        <Shell>
          <div className="border-border-subtle mx-auto max-w-[460px] rounded-[14px] border bg-white px-8 py-10">
            <Lock className="text-brand mx-auto size-9" strokeWidth={1.5} aria-hidden />
            <h1 className="text-brand mt-4 text-center text-[20px] font-bold">
              パスワードが必要です
            </h1>
            <p className="text-ink-muted mt-3 text-center text-[13px] leading-7">
              共有元から伝えられたパスワードを入力してください。
            </p>
            <SharePasswordForm token={token} />
          </div>
        </Shell>
      );
    }
  }

  const data = await loadSharedProject(link.projectId);
  if (!data) {
    return (
      <Shell>
        <p className="text-ink-muted text-center text-[13px]">現場が見つかりませんでした。</p>
      </Shell>
    );
  }

  // 閲覧回数は、実際に中身を出す直前に数える。
  await countShareView(link.id);

  const { project, photos } = data;

  return (
    <Shell>
      <div className="border-border-subtle rounded-[14px] border bg-white px-8 py-7">
        <p className="text-ink-muted text-[12px]">共有された工事写真</p>
        <h1 className="text-brand mt-1.5 text-[24px] font-bold">{project.name}</h1>
        <dl className="text-ink-muted mt-4 grid gap-x-8 gap-y-1.5 text-[13px] sm:grid-cols-2">
          {project.code && (
            <div className="flex gap-2"><dt>工事番号</dt><dd className="text-ink">{project.code}</dd></div>
          )}
          {project.clientName && (
            <div className="flex gap-2"><dt>発注者</dt><dd className="text-ink">{project.clientName}</dd></div>
          )}
          {project.contractorName && (
            <div className="flex gap-2"><dt>請負者</dt><dd className="text-ink">{project.contractorName}</dd></div>
          )}
          {project.location && (
            <div className="flex gap-2"><dt>施工場所</dt><dd className="text-ink">{project.location}</dd></div>
          )}
        </dl>
        <p className="text-ink-muted mt-5 text-[12px]">
          全 {photos.length} 枚
          {!link.allowDownload && '　/　ダウンロードは許可されていません'}
        </p>
      </div>

      {photos.length === 0 ? (
        <p className="text-ink-muted mt-10 text-center text-[13px]">写真がまだ登録されていません。</p>
      ) : (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.id} className="border-border-subtle overflow-hidden rounded-[12px] border bg-white">
              <Image
                src={`/api/share/${token}/photos/${photo.id}?v=display`}
                alt={photo.title ?? '工事写真'}
                width={640}
                height={480}
                unoptimized
                className="bg-surface-sunken aspect-[4/3] w-full object-cover"
              />
              <div className="px-5 py-4">
                <p className="text-[14px] font-bold text-ink">{photo.title ?? '無題の写真'}</p>
                <p className="text-ink-muted tabular mt-1 text-[12px]">{formatShotAt(photo.takenAt)}</p>
                <p className="text-ink-muted mt-2 text-[12px]">
                  {[photo.category, photo.workType, photo.shootingLocation].filter(Boolean).join('　/　')}
                </p>
                {photo.contractorNote && (
                  <p className="mt-2 text-[12px] text-ink">{photo.contractorNote}</p>
                )}
                {link.allowDownload && (
                  <a
                    href={`/api/share/${token}/photos/${photo.id}?v=original&download=1`}
                    className="text-brand-link mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold hover:underline"
                  >
                    <Download className="size-3.5" aria-hidden />
                    元のサイズでダウンロード
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
