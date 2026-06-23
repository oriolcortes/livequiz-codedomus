"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/src/lib/supabase/browser";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return <Button variant="ghost" onClick={signOut}>Sortir</Button>;
}
