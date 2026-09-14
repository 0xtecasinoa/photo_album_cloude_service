'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/db';
import { contactInquiries } from '@/db/schema';
import { getSessionContext } from '@/lib/auth/session';

export type ContactFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'company' | 'name' | 'email' | 'phone' | 'topic' | 'message', string>>;
  sent?: boolean;
};

const schema = z.object({
  company: z.string().trim().min(1, '会社名を入力してください。').max(200),
  name: z.string().trim().min(1, 'お名前を入力してください。').max(120),
  email: z.string().trim().toLowerCase().email('メールアドレスの形式が正しくありません。'),
  phone: z.string().trim().max(40).nullable(),
  topic: z.string().trim().min(1, 'お問い合わせ内容の種類をお選びください。').max(120),
  message: z.string().trim().max(4000).nullable(),
  planInterest: z.string().trim().max(40).nullable(),
});

export async function submitContactAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = schema.safeParse({
    company: formData.get('company'),
    name: formData.get('name'),
    email: formData.get('email'),
    phone: (formData.get('phone') as string) || null,
    topic: formData.get('topic'),
    message: (formData.get('message') as string) || null,
    planInterest: (formData.get('planInterest') as string) || null,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? '');
      if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { fieldErrors };
  }

  try {
    // ログイン中なら、どの組織からの問い合わせかを控える。
    // 未ログインの見込み客からも届くため、必須にはしない。
    const ctx = await getSessionContext();
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');

    await db.insert(contactInquiries).values({
      ...parsed.data,
      organizationId: ctx?.organization.id ?? null,
      userId: ctx?.user.id ?? null,
      ipAddress: forwarded ? forwarded.split(',')[0]!.trim() : h.get('x-real-ip'),
      userAgent: h.get('user-agent'),
    });
  } catch (error) {
    console.error('[contact] failed to store inquiry', error);
    return { error: '送信に失敗しました。時間をおいて再度お試しください。' };
  }

  return { sent: true };
}
