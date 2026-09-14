import Image from 'next/image';
import Link from 'next/link';

/**
 * Split auth layout: hero photograph on the left with the product mark overlaid,
 * form on the right. The hero collapses away below lg so the form owns the
 * viewport on a phone.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <div className="relative hidden w-1/2 shrink-0 lg:block">
        <Image
          src="/brand/auth-hero.webp"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-[35%_center]"
        />
        {/* Soft fade into the form column, as in the design. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/85" />
        <Link href="/" className="absolute top-10 left-9 block">
          <Image
            src="/brand/logo.png"
            alt="らくらく写真台帳"
            width={180}
            height={143}
            className="size-[148px] rounded-[26px] object-contain drop-shadow-lg"
          />
        </Link>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center bg-white px-6 py-14">
        <div className="w-full max-w-[461px]">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Image
              src="/brand/logo.png"
              alt="らくらく写真台帳"
              width={180}
              height={143}
              className="size-[92px] rounded-[18px] object-contain"
            />
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
