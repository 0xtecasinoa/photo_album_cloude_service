import type { Metadata } from 'next';
import { BlackboardEditor } from '@/components/blackboard/blackboard-editor';
import { requireSession } from '@/lib/auth/session';
import { listTemplates } from '@/lib/queries/blackboard-templates';

export const metadata: Metadata = { title: '電子小黒板 テンプレート設計' };

export default async function TemplatesPage() {
  const { organization, capabilities } = await requireSession();
  const templates = await listTemplates(organization.id);

  return (
    <BlackboardEditor
      templates={templates}
      canManage={capabilities.has('blackboard.template.manage')}
    />
  );
}
