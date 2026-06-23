import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { createClient } from "@/src/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";

export async function Header() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
      <Logo />
      <nav className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Link className="focus-ring rounded-xl px-3 py-2 hover:bg-white/70" href="/quiz-builder">Editor JSON</Link>
        <Link className="focus-ring rounded-xl px-3 py-2 hover:bg-white/70" href="/join">Unir-se</Link>
        {user ? (
          <>
            <Link className="focus-ring rounded-xl px-3 py-2 hover:bg-white/70" href="/dashboard">Dashboard</Link>
            <SignOutButton />
          </>
        ) : (
          <Link className="focus-ring rounded-xl bg-brand-600 px-4 py-2 text-white hover:bg-brand-700" href="/login">Entrar</Link>
        )}
      </nav>
    </header>
  );
}
