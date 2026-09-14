'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Input, Label, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { submitContactAction, type ContactFormState } from './actions';

const TOPICS = [
  '導入のご相談',
  'お見積りのご依頼',
  'デモのご予約',
  '電子納品・CALS/EC について',
  'その他',
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? '送信中…' : '送信する'}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="text-danger mt-1.5 text-[12px]">{message}</p>;
}

export function ContactForm({
  planInterest,
  defaultTopic,
  defaults,
}: {
  planInterest: string | null;
  defaultTopic: string;
  defaults: { company: string; name: string; email: string };
}) {
  const [state, formAction] = useActionState<ContactFormState, FormData>(submitContactAction, {});

  if (state.sent) {
    return (
      <div className="border-border-subtle rounded-[14px] border bg-white p-8 text-center lg:p-10">
        <CheckCircle2 className="text-success mx-auto size-12" strokeWidth={1.5} aria-hidden />
        <h2 className="text-brand mt-5 text-[22px] font-bold">お問い合わせを受け付けました</h2>
        <p className="text-ink-muted mt-4 text-[14px] leading-[2]">
          ご記入いただいた内容を承りました。
          <br />
          担当者より営業時間内（平日 9:00 - 18:00）にご連絡いたします。
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="border-border-subtle space-y-7 rounded-[14px] border bg-white p-8 lg:p-10" noValidate>
      {planInterest && <input type="hidden" name="planInterest" value={planInterest} />}

      {state.error && (
        <p role="alert" className="border-danger/40 bg-danger-tint text-danger rounded-[8px] border px-4 py-3 text-[13px]">
          {state.error}
        </p>
      )}

      <div>
        <Label htmlFor="company">会社名</Label>
        <Input id="company" name="company" required placeholder="株式会社〇〇建設" className="mt-2"
          defaultValue={defaults.company} />
        <FieldError message={state.fieldErrors?.company} />
      </div>

      <div className="grid gap-7 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">お名前</Label>
          <Input id="name" name="name" required placeholder="山田 太郎" className="mt-2"
            defaultValue={defaults.name} />
          <FieldError message={state.fieldErrors?.name} />
        </div>
        <div>
          <Label htmlFor="phone">電話番号（任意）</Label>
          <Input id="phone" name="phone" type="tel" placeholder="03-0000-0000" className="mt-2" />
          <FieldError message={state.fieldErrors?.phone} />
        </div>
      </div>

      <div>
        <Label htmlFor="email">メールアドレス</Label>
        <Input id="email" name="email" type="email" required placeholder="taro@example.co.jp" className="mt-2"
          defaultValue={defaults.email} />
        <FieldError message={state.fieldErrors?.email} />
      </div>

      <div>
        <Label htmlFor="topic">お問い合わせ内容</Label>
        <Select id="topic" name="topic" className="mt-2" defaultValue={defaultTopic}>
          <option value="" disabled>
            選択してください
          </option>
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <FieldError message={state.fieldErrors?.topic} />
      </div>

      <div>
        <Label htmlFor="message">ご相談内容</Label>
        <textarea
          id="message"
          name="message"
          rows={6}
          className="border-border focus:border-brand focus:outline-brand-ring/40 mt-2 w-full rounded-[8px] border px-4 py-3 text-sm focus:outline-2"
          placeholder="現場数・利用人数・ご検討の背景などをご記入ください。"
        />
        <FieldError message={state.fieldErrors?.message} />
      </div>

      <SubmitButton />

      <p className="text-ink-muted text-center text-[12px] leading-[1.9]">
        ご入力いただいた情報は、お問い合わせへの回答のみに利用します。
      </p>
    </form>
  );
}
