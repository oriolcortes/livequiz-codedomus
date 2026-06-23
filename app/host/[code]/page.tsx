import { notFound, redirect } from "next/navigation";
import { HostRoom } from "@/components/game/HostRoom";
import { createClient } from "@/src/lib/supabase/server";

export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) redirect("/login");

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("host_id", userData.user.id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!room) notFound();

  return <HostRoom room={room} />;
}
