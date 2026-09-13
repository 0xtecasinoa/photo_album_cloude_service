import { Sidebar } from '@/components/app/sidebar';
import { Topbar } from '@/components/app/topbar';
import { demoOrg, demoUser } from '@/lib/demo-data';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* The sidebar is fixed-width by design; it drops away below lg where the
          layout switches to a single column. */}
      <div className="hidden lg:flex">
        <Sidebar
          storageUsedBytes={demoOrg.storageUsedBytes}
          storageQuotaBytes={demoOrg.storageQuotaBytes}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={demoUser.name}
          roleLabel={demoUser.roleLabel}
          avatarUrl={demoUser.avatarUrl}
          notificationCount={3}
        />
        <main className="min-w-0 flex-1 pb-16">{children}</main>
      </div>
    </div>
  );
}
