"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createRoomAction } from "@/src/actions/rooms";

export function CreateRoomButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function createRoom() {
    startTransition(async () => {
      const result = await createRoomAction();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      router.push(`/host/${result.data.code}`);
    });
  }

  return (
    <Button onClick={createRoom} disabled={pending} className="w-full sm:w-auto">
      {pending ? "Creant sala..." : "Crear nova sala"}
    </Button>
  );
}
