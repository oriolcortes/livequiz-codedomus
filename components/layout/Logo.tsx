import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="focus-ring inline-flex items-center gap-3 rounded-2xl">
      <Image src="/livequiz-logo.png" alt="LiveQuiz by CodeDomus" width={180} height={64} priority className="h-12 w-auto object-contain" />
    </Link>
  );
}
