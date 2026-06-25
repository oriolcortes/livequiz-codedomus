"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlayerHeaderCard, PlayerJoinCard, PlayerQuestionCard } from "@/components/game/PlayerRoomPanels";
import { RankingList } from "@/components/game/RankingList";
import { createClient } from "@/src/lib/supabase/browser";
import { realtimeEvents, type AnswerResultPayload, type PlayerQuestionPayload, type RankingEntry, type RoomStatePayload } from "@/src/lib/realtime/events";
import type { Room } from "@/src/lib/supabase/types";

function createStudentId() {
  const existing = sessionStorage.getItem("livequiz:studentId");
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem("livequiz:studentId", id);
  return id;
}

export function PlayerRoom({ room }: { room: Pick<Room, "code" | "max_students" | "expires_at"> }) {
  const supabase = useMemo(() => createClient(), []);
  const [studentId, setStudentId] = useState<string>("");
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const [question, setQuestion] = useState<PlayerQuestionPayload | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("Espera que el professor iniciï la partida.");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [channelReady, setChannelReady] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    setStudentId(createStudentId());
    setNickname(sessionStorage.getItem(`livequiz:${room.code}:nickname`) ?? "");
  }, [room.code]);

  useEffect(() => {
    if (!studentId) return;

    const channel = supabase.channel(`room:${room.code}`, {
      config: {
        broadcast: { self: false, ack: true },
        presence: { key: `student:${studentId}` }
      }
    });

    channel
      .on("broadcast", { event: realtimeEvents.studentRejected }, ({ payload }) => {
        const data = payload as { studentId: string; reason: string };
        if (data.studentId === studentId) {
          setJoined(false);
          setMessage(data.reason);
        }
      })
      .on("broadcast", { event: realtimeEvents.questionStarted }, ({ payload }) => {
        setQuestion(payload as PlayerQuestionPayload);
        setSelected(null);
        setMessage("Respon abans que acabi el temps.");
      })
      .on("broadcast", { event: realtimeEvents.answerResult }, ({ payload }) => {
        const data = payload as AnswerResultPayload;
        if (data.studentId !== studentId) return;
        setScore((current) => current + data.points);
        setMessage(data.correct ? `Correcte! +${data.points} punts` : "Incorrecte o fora de temps");
      })
      .on("broadcast", { event: realtimeEvents.rankingUpdated }, ({ payload }) => {
        const entries = (payload as { entries: RankingEntry[] }).entries ?? [];
        setRanking(entries);
        setScore(entries.find((entry) => entry.studentId === studentId)?.score ?? 0);
      })
      .on("broadcast", { event: realtimeEvents.roomState }, ({ payload }) => {
        const data = payload as RoomStatePayload & { targetStudentId?: string };
        if (data.targetStudentId && data.targetStudentId !== studentId) return;
        if (data.question) setQuestion(data.question);
        if (data.ranking) {
          setRanking(data.ranking);
          setScore(data.ranking.find((entry) => entry.studentId === studentId)?.score ?? 0);
        }
        if (data.status === "ended") setMessage("Partida finalitzada.");
      })
      .on("broadcast", { event: realtimeEvents.quizEnded }, ({ payload }) => {
        setRanking((payload as { entries: RankingEntry[] }).entries ?? []);
        setQuestion(null);
        setMessage("Partida finalitzada.");
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setChannelReady(true);
          await channel.track({ role: "student", studentId, at: new Date().toISOString() });
          await channel.send({ type: "broadcast", event: realtimeEvents.roomStateRequested, payload: { studentId } });
        }
      });

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
      setChannelReady(false);
    };
  }, [room.code, studentId, supabase]);

  useEffect(() => {
    if (!question) {
      setRemainingSeconds(0);
      return;
    }

    const activeQuestion = question;

    function updateRemainingTime() {
      const endsAt = activeQuestion.startedAt + activeQuestion.time * 1000;
      const nextRemainingSeconds = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemainingSeconds);
      if (nextRemainingSeconds === 0 && selected === null) {
        setMessage("Temps esgotat.");
      }
    }

    updateRemainingTime();
    const interval = window.setInterval(updateRemainingTime, 250);
    return () => window.clearInterval(interval);
  }, [question, selected]);

  async function joinRoom() {
    const cleanNickname = nickname.trim().slice(0, 24);
    if (!cleanNickname || !channelRef.current) return;

    sessionStorage.setItem(`livequiz:${room.code}:nickname`, cleanNickname);
    setJoined(true);
    setMessage("Connectat. Espera la pregunta.");

    await channelRef.current.send({
      type: "broadcast",
      event: realtimeEvents.studentJoin,
      payload: { studentId, nickname: cleanNickname }
    });
  }

  async function answer(optionIndex: number) {
    if (!question || !channelRef.current || selected !== null || remainingSeconds <= 0) return;
    setSelected(optionIndex);
    setMessage("Resposta enviada.");

    await channelRef.current.send({
      type: "broadcast",
      event: realtimeEvents.answerSubmitted,
      payload: {
        studentId,
        nickname,
        questionIndex: question.index,
        optionIndex,
        sentAt: Date.now()
      }
    });
  }

  if (!joined) {
    return (
      <PlayerJoinCard
        code={room.code}
        nickname={nickname}
        message={message}
        channelReady={channelReady}
        onNicknameChange={setNickname}
        onJoin={() => void joinRoom()}
      />
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6 py-8">
      <PlayerHeaderCard code={room.code} nickname={nickname} score={score} />
      <PlayerQuestionCard question={question} selected={selected} remainingSeconds={remainingSeconds} message={message} onAnswer={(optionIndex) => void answer(optionIndex)} />
      <RankingList entries={ranking} limit={8} />
    </div>
  );
}
