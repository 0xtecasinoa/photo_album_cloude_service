import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { Input, Label, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: '導入のご相談・お見積り・デモのご予約はこちらから承ります。',
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />

      <main>
        <section className="bg-brand pt-[150px] pb-20">
          <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
            <h1 className="text-[30px] font-bold text-white sm:text-[38px]">お問い合わせ</h1>
            <p className="mt-5 text-[14px] leading-[2] text-white/90">
              導入のご相談・お見積り・デモのご予約を承っております。
              <br />
              営業時間：平日 9:00 - 18:00（土日祝日を除く）
            </p>
          </div>
        </section>

        <section className="bg-surface-muted py-20">
          <div className="mx-auto max-w-[720px] px-6">
            <form className="border-border-subtle space-y-7 rounded-[14px] border bg-white p-8 lg:p-10">
              <div>
                <Label htmlFor="company">会社名</Label>
                <Input id="company" name="company" required placeholder="株式会社〇〇建設" className="mt-2" />
              </div>

              <div className="grid gap-7 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">ご担当者名</Label>
                  <Input id="name" name="name" required placeholder="山田 太郎" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="phone">電話番号</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="03-0000-0000" className="mt-2" />
                </div>
              </div>

              <div>
                <Label htmlFor="email">メールアドレス</Label>
                <Input id="email" name="email" type="email" required placeholder="taro@example.co.jp" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="topic">お問い合わせ内容</Label>
                <Select id="topic" name="topic" className="mt-2" defaultValue="">
                  <option value="" disabled>
                    選択してください
                  </option>
                  <option>導入のご相談</option>
                  <option>お見積りのご依頼</option>
                  <option>デモのご予約</option>
                  <option>電子納品・CALS/EC について</option>
                  <option>その他</option>
                </Select>
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
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full">
                送信する
              </Button>

              <p className="text-ink-muted text-center text-[12px] leading-[1.9]">
                ご入力いただいた情報は、お問い合わせへの回答のみに利用します。
              </p>
            </form>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
