"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/browser";

const linkBaseClass = "focus-ring rounded-xl border px-3 py-2 transition";
const activeLinkClass = "border-brand-200 bg-white text-brand-700";
const inactiveLinkClass = "border-transparent hover:border-slate-200 hover:bg-white/70";

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(pathname: string, href: string) {
  return `${linkBaseClass} ${isActivePath(pathname, href) ? activeLinkClass : inactiveLinkClass}`;
}

export function HeaderNav({ isSignedIn }: { isSignedIn: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <nav className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <Link className={navLinkClass(pathname, "/quiz-builder")} href="/quiz-builder">Editor JSON</Link>
      <Link className={navLinkClass(pathname, "/join")} href="/join">Unir-se</Link>
      {isSignedIn ? (
        <>
          <Link className={navLinkClass(pathname, "/dashboard")} href="/dashboard">Dashboard</Link>
          <button className={`${linkBaseClass} ${inactiveLinkClass} cursor-pointer text-slate-700`} onClick={signOut} type="button">
            Sortir
          </button>
        </>
      ) : (
        <Link className={navLinkClass(pathname, "/login")} href="/login">Entrar</Link>
      )}
    </nav>
  );
}
