import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * The product mark.
 *
 * Defined once, so every page renders it at an identical size. Each call site used
 * to set its own width/height and they drifted apart — header 62px, footer 64px,
 * sidebar 100x76, login 112px. Change LOGO_HEIGHT here and it moves everywhere.
 *
 * The artwork is 180x143 and already carries its own rounded corners, so it is sized
 * by height with `w-auto` rather than squeezed into a square box (which would leave
 * any CSS border-radius misaligned with the art's own edges).
 */
/**
 * Matches what the login page rendered: a 112px square box with object-contain on
 * 180x143 art fits to the width, giving 112 wide x 89 tall. Sizing by height here
 * reproduces that exactly.
 */
const LOGO_HEIGHT = 89;

export function BrandLogo({
  className,
  decorative = false,
  priority = false,
}: {
  className?: string;
  /** True when a nearby heading already names the product. */
  decorative?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/logo.png"
      alt={decorative ? '' : 'らくらく写真台帳'}
      width={180}
      height={143}
      priority={priority}
      aria-hidden={decorative || undefined}
      className={cn('w-auto object-contain', className)}
      style={{ height: LOGO_HEIGHT }}
    />
  );
}
