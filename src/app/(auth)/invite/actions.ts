'use server';

import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { acceptInvite, findInvite } from '@/lib/queries/members';

export type InviteAcceptState = {
  error?: string;
  fieldErrors?: Partial<Record<'password' | 'confirm', string>>;
};

const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'パスワードは8文字以上で入力してください。').max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'パスワードが一致しません。',
  });

export async function acceptInviteAction(
  _prev: InviteAcceptState,
  formData: FormData,
): Promise<InviteAcceptState> {
  const parsed = schema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? '');
      if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
    }
    if (!Object.keys(fieldErrors).length) return { error: '入力内容を確認してください。' };
    return { fieldErrors };
  }

  try {
    // 期限切れの確認は acceptInvite 側でも行うが、先に見て文言を分けておく。
    const invite = await findInvite(parsed.data.token);
    if (!invite) {
      return { error: 'この招待リンクは無効です。招待した担当者に再発行を依頼してください。' };
    }

    const hash = await bcrypt.hash(parsed.data.password, 12);
    const ok = await acceptInvite(parsed.data.token, hash);
    if (!ok) {
      return { error: 'この招待リンクは無効です。招待した担当者に再発行を依頼してください。' };
    }
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error('[invite.accept] failed', error);
    return { error: '設定に失敗しました。時間をおいて再度お試しください。' };
  }

  // パスワード設定後は改めてログインしてもらう。ここで自動ログインすると、
  // リンクを転送された第三者がそのまま入れてしまう。
  redirect('/login?invited=1');
}
