import { Sidebar } from '@/components/app/sidebar';
import { unreadNoticeCount } from '@/lib/queries/notifications';
import { Topbar } from '@/components/app/topbar';
import { requireSession } from '@/lib/auth/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The proxy already blocks anonymous requests; this also gives every page the
  // signed-in user and their organisation without a second query.
  const { user, organization } = await requireSession();
  const unread = await unreadNoticeCount(organization.id, user.id);

  return (
    <div className="flex min-h-dvh">
      {/* The sidebar is fixed-width by design; it drops away below lg where the
          layout switches to a single column. */}
      <div className="hidden lg:flex">
        <Sidebar
          storageUsedBytes={organization.storageUsedBytes}
          storageQuotaBytes={organization.storageQuotaBytes}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={user.name}
          roleLabel={user.roleLabel}
          avatarUrl={user.image}
          notificationCount={unread}
        />
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
