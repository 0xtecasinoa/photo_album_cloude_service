import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { InviteMemberDialog } from '@/components/members/invite-member-dialog';
import { MembersTable } from '@/components/members/members-table';
import { requireSession } from '@/lib/auth/session';
import { listMembers, listOrgRoles } from '@/lib/queries/members';

export const metadata: Metadata = { title: 'メンバー・権限' };

export default async function MembersPage() {
  const { user, organization, capabilities } = await requireSession();

  if (!capabilities.has('member.view')) {
    return (
      <>
        <PageHeader title="メンバー・権限" />
        <div className="px-8 pt-8 xl:px-[31px]">
          <p className="border-border-subtle text-ink-muted rounded-[10px] border bg-white px-6 py-10 text-center text-[13px]">
            メンバー情報を閲覧する権限がありません。
          </p>
        </div>
      </>
    );
  }

  const [members, roles] = await Promise.all([
    listMembers(organization.id),
    listOrgRoles(organization.id),
  ]);

  return (
    <>
      <PageHeader
        title="メンバー・権限"
        actions={
          <InviteMemberDialog roles={roles} canInvite={capabilities.has('member.invite')} />
        }
      />
      <MembersTable
        members={members}
        roles={roles}
        currentUserId={user.id}
        canManage={capabilities.has('member.manage')}
        companyName={organization.name}
      />
    </>
  );
}
