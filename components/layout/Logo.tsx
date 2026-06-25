import Image from 'next/image';
import Link from 'next/link';
import type { ComponentProps } from 'react';

export function Logo({
  href = '/',
}: {
  href?: ComponentProps<typeof Link>['href'];
}) {
  return (
    <Link
      href={href}
      className="focus-ring inline-flex items-center gap-3 rounded-2xl"
    >
      <Image
        src="/livequiz-logo-small.webp"
        alt="LiveQuiz by CodeDomus"
        width={180}
        height={64}
        priority
        className="h-12 w-auto object-contain"
      />
    </Link>
  );
}
