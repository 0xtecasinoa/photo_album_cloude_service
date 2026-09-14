'use server';

import { z } from 'zod';
import { AuthError } from 'next-auth';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { signIn } from '@/auth';
import { signUp, EmailTakenError } from '@/lib/auth/provision';

export type AuthFormState = {
  error?: string;
  /** 項目ごとのエラー。入力欄の下に出します。 */
  fieldErrors?: Partial<Record<'name' | 'email' | 'password' | 'companyName', string>>;
};

const signUpSchema = z.object({
  name: z.string().trim().min(1, 'お名前を入力してください。').max(80),
  companyName: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().email('メールアドレスの形式が正しくありません。'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください。')
    .max(200, 'パスワードが長すぎます。'),
});

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('メールアドレスの形式が正しくありません。'),
  password: z.string().min(1, 'パスワードを入力してください。'),
});

function collectFieldErrors(issues: z.core.$ZodIssue[]): AuthFormState['fieldErrors'] {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? '');
    if (key && !out[key]) out[key] = i.message;
  }
  return out;
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    companyName: formData.get('companyName') || undefined,
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return { fieldErrors: collectFieldErrors(parsed.error.issues) };

  if (formData.get('terms') !== 'on') {
    return { error: '利用規約およびプライバシーポリシーへの同意が必要です。' };
  }

  try {
    await signUp(parsed.data);
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return { fieldErrors: { email: error.message } };
    }
    console.error('[signup] failed', error);
    return { error: '登録に失敗しました。時間をおいて再度お試しください。' };
  }

  // 登録できたらそのままログインさせる。
  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    // signIn は成功時にリダイレクト用の例外を投げる。握りつぶすと遷移しない。
    if (isRedirectError(error)) throw error;
    return { error: 'アカウントは作成されました。ログイン画面からサインインしてください。' };
  }

  return {};
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return { fieldErrors: collectFieldErrors(parsed.error.issues) };

  const callbackUrl = String(formData.get('callbackUrl') || '/dashboard');

  try {
    await signIn('credentials', { ...parsed.data, redirectTo: callbackUrl });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      // 理由は区別しない。どのアドレスが登録済みかを推測させないため。
      return { error: 'メールアドレスまたはパスワードが正しくありません。' };
    }
    console.error('[signin] failed', error);
    return { error: 'ログインに失敗しました。時間をおいて再度お試しください。' };
  }

  return {};
}

/** Google など外部プロバイダでのログイン。 */
export async function oauthSignInAction(formData: FormData): Promise<void> {
  const provider = String(formData.get('provider') || 'google');
  const callbackUrl = String(formData.get('callbackUrl') || '/dashboard');
  await signIn(provider, { redirectTo: callbackUrl });
}
