import { notFound } from "next/navigation";
import { PlayerRoom } from "@/components/game/PlayerRoom";
import { getRoomByCode } from "@/src/actions/rooms";

export default async function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const room = await getRoomByCode(code);

  if (!room) notFound();

  return <PlayerRoom room={{ code: room.code, max_students: room.max_students, expires_at: room.expires_at }} />;
}
