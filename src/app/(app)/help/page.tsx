import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, MessageCircleQuestion, Mail } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';

export const metadata: Metadata = { title: 'ヘルプ' };

const TOPICS = [
  { icon: BookOpen, title: '使い方ガイド', body: '撮影から台帳出力までの基本的な流れをご案内します。', href: '#' },
  { icon: MessageCircleQuestion, title: 'よくあるご質問', body: '権限設定・電子納品・オフライン撮影についてのご質問。', href: '/#faq' },
  { icon: Mail, title: 'お問い合わせ', body: '平日 9:00 - 18:00（土日祝日を除く）に対応しています。', href: '/contact' },
];

export default function HelpPage() {
  return (
    <>
      <PageHeader title="ヘルプ" />
      <div className="px-8 pt-8 xl:px-[31px]">
        <div className="grid gap-5 md:grid-cols-3">
          {TOPICS.map(({ icon: Icon, title, body, href }) => (
            <Link
              key={title}
              href={href}
              className="border-border-subtle hover:border-brand rounded-[10px] border bg-white px-6 py-7 transition-colors"
            >
              <Icon className="text-brand-link size-7" strokeWidth={1.6} aria-hidden />
              <h2 className="mt-4 text-[15px] font-bold text-ink">{title}</h2>
              <p className="text-ink-muted mt-2 text-[13px] leading-[1.9]">{body}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
