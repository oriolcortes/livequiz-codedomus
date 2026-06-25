import { Logo } from "@/components/layout/Logo";
import { createClient } from "@/src/lib/supabase/server";
import { HeaderNav } from "@/components/layout/HeaderNav";

export async function Header() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
      <Logo />
      <HeaderNav isSignedIn={Boolean(user)} />
    </header>
  );
}
