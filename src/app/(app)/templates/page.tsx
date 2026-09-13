import type { Metadata } from 'next';
import { BlackboardEditor } from '@/components/blackboard/blackboard-editor';

export const metadata: Metadata = { title: '電子小黒板 テンプレート設計' };

export default function TemplatesPage() {
  return <BlackboardEditor />;
}
