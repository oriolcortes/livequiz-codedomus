"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseQuiz, toPlayerQuestion, type Quiz } from "@/src/lib/quiz/schema";
import { realtimeEvents, type AnswerSubmittedPayload, type RankingEntry, type StudentJoinedPayload } from "@/src/lib/realtime/events";
import { createClient } from "@/src/lib/supabase/browser";
import { endRoomAction } from "@/src/actions/rooms";
import { calculateQuestionPoints } from "@/src/lib/quiz/scoring";
import type { Room } from "@/src/lib/supabase/types";

type StudentState = {
  studentId: string;
  nickname: string;
  score: number;
  answers: number;
  questionPoints: Record<number, number>;
  answeredCurrentQuestion?: number;
};

export function useHostRoomController(room: Room) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [students, setStudents] = useState<Record<string, StudentState>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
  const [status, setStatus] = useState<"waiting" | "running" | "ended">("waiting");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const questionStartedAtRef = useRef<number>(0);
  const quizRef = useRef<Quiz | null>(null);
  const currentQuestionIndexRef = useRef<number>(-1);
  const statusRef = useRef<"waiting" | "running" | "ended">("waiting");
  const rankingRef = useRef<RankingEntry[]>([]);

  const ranking = useMemo<RankingEntry[]>(() => {
    return Object.values(students)
      .map(({ studentId, nickname, score, answers }) => ({ studentId, nickname, score, answers }))
      .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname));
  }, [students]);

  useEffect(() => {
    quizRef.current = quiz;
  }, [quiz]);

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    rankingRef.current = ranking;
  }, [ranking]);

  useEffect(() => {
    const channel = supabase.channel(`room:${room.code}`, {
      config: {
        broadcast: { self: false, ack: true },
        presence: { key: `host:${room.host_id}` }
      }
    });

    channel
      .on("broadcast", { event: realtimeEvents.studentJoin }, ({ payload }) => {
        const joined = payload as StudentJoinedPayload;
        setStudents((current) => {
          if (Object.keys(current).length >= room.max_students && !current[joined.studentId]) {
            void channel.send({
              type: "broadcast",
              event: realtimeEvents.studentRejected,
              payload: { studentId: joined.studentId, reason: "Sala plena" }
            });
            return current;
          }

          return {
            ...current,
            [joined.studentId]: current[joined.studentId] ?? {
              studentId: joined.studentId,
              nickname: joined.nickname,
              score: 0,
              answers: 0,
              questionPoints: {}
            }
          };
        });
      })
      .on("broadcast", { event: realtimeEvents.roomStateRequested }, ({ payload }) => {
        const targetStudentId = (payload as { studentId?: string }).studentId;
        const currentQuestion = quizRef.current?.questions[currentQuestionIndexRef.current];
        const playerQuestion = currentQuestion
          ? { ...toPlayerQuestion(currentQuestion, currentQuestionIndexRef.current), startedAt: questionStartedAtRef.current }
          : undefined;

        void channel.send({
          type: "broadcast",
          event: realtimeEvents.roomState,
          payload: {
            targetStudentId,
            status: statusRef.current,
            title: quizRef.current?.title,
            question: playerQuestion,
            ranking: rankingRef.current
          }
        });
      })
      .on("broadcast", { event: realtimeEvents.answerSubmitted }, ({ payload }) => {
        const answer = payload as AnswerSubmittedPayload;
        const currentQuestion = quizRef.current?.questions[answer.questionIndex];

        if (statusRef.current !== "running" || !currentQuestion || answer.questionIndex !== currentQuestionIndexRef.current) return;

        setStudents((current) => {
          const existingStudent = current[answer.studentId];
          if (!existingStudent && Object.keys(current).length >= room.max_students) return current;

          const student = existingStudent ?? {
            studentId: answer.studentId,
            nickname: answer.nickname,
            score: 0,
            answers: 0,
            questionPoints: {}
          };

          if (student.answeredCurrentQuestion === answer.questionIndex) return current;

          const elapsed = Math.max(0, answer.sentAt - questionStartedAtRef.current);
          const answeredInTime = elapsed <= currentQuestion.time * 1000;
          const correct = answeredInTime && currentQuestion.correct === answer.optionIndex;
          const previousPoints = student.questionPoints[answer.questionIndex] ?? 0;
          const points = calculateQuestionPoints(correct, elapsed, currentQuestion.time);

          void channel.send({
            type: "broadcast",
            event: realtimeEvents.answerResult,
            payload: {
              studentId: answer.studentId,
              questionIndex: answer.questionIndex,
              correct,
              points,
              correctOptionIndex: currentQuestion.correct
            }
          });

          return {
            ...current,
            [answer.studentId]: {
              ...student,
              score: student.score - previousPoints + points,
              answers: student.answers + 1,
              questionPoints: {
                ...student.questionPoints,
                [answer.questionIndex]: points
              },
              answeredCurrentQuestion: answer.questionIndex
            }
          };
        });
      })
      .subscribe(async (subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") {
          await channel.track({ role: "host", code: room.code, at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [room.code, room.host_id, room.max_students, supabase]);

  useEffect(() => {
    if (!channelRef.current) return;
    void channelRef.current.send({ type: "broadcast", event: realtimeEvents.rankingUpdated, payload: { entries: ranking } });
  }, [ranking]);

  useEffect(() => {
    const saved = localStorage.getItem(`livequiz:host:${room.code}:quiz`);
    if (!saved) return;
    const result = parseQuiz(JSON.parse(saved) as unknown);
    if (result.success) setQuiz(result.data);
  }, [room.code]);

  async function loadQuizFile(file: File) {
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as unknown;
      const result = parseQuiz(parsed);
      if (!result.success) {
        setLog((current) => [`JSON invàlid: ${result.error.issues[0]?.message ?? "format incorrecte"}`, ...current]);
        return;
      }
      if (result.data.questions.length > room.max_questions) {
        setLog((current) => [`Aquest rol permet màxim ${room.max_questions} preguntes per quiz.`, ...current]);
        return;
      }
      setQuiz(result.data);
      localStorage.setItem(`livequiz:host:${room.code}:quiz`, JSON.stringify(result.data));
      setLog((current) => [`Quiz carregat: ${result.data.title}`, ...current]);
    } catch {
      setLog((current) => ["No s'ha pogut llegir el JSON.", ...current]);
    }
  }

  function startQuestion(index: number) {
    if (!quiz || !channelRef.current) return;
    const question = quiz.questions[index];
    if (!question) return;

    const startedAt = Date.now();
    questionStartedAtRef.current = startedAt;
    currentQuestionIndexRef.current = index;
    statusRef.current = "running";
    setCurrentQuestionIndex(index);
    setStatus("running");
    setStudents((current) => {
      const next = { ...current };
      for (const key of Object.keys(next)) {
        const previousPoints = next[key].questionPoints[index] ?? 0;
        next[key] = {
          ...next[key],
          score: next[key].score - previousPoints,
          questionPoints: {
            ...next[key].questionPoints,
            [index]: 0
          },
          answeredCurrentQuestion: undefined
        };
      }
      return next;
    });

    void channelRef.current.send({
      type: "broadcast",
      event: realtimeEvents.questionStarted,
      payload: { ...toPlayerQuestion(question, index), startedAt }
    });
  }

  function endQuiz() {
    statusRef.current = "ended";
    setStatus("ended");
    channelRef.current?.send({ type: "broadcast", event: realtimeEvents.quizEnded, payload: { entries: rankingRef.current } });
    setLog((current) => ["Partida finalitzada. El rànquing queda visible fins que tanquis la sala.", ...current]);
  }

  function closeRoom() {
    startTransition(async () => {
      await endRoomAction(room.code);
      localStorage.removeItem(`livequiz:host:${room.code}:quiz`);
      router.push("/dashboard");
    });
  }

  useEffect(() => {
    function closeRoomOnPageHide() {
      const endpoint = `/api/rooms/${encodeURIComponent(room.code)}/end`;
      const body = JSON.stringify({ code: room.code });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
        return;
      }

      void fetch(endpoint, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true
      });
    }

    window.addEventListener("pagehide", closeRoomOnPageHide);
    return () => window.removeEventListener("pagehide", closeRoomOnPageHide);
  }, [room.code]);

  const currentQuestion = quiz?.questions[currentQuestionIndex];

  useEffect(() => {
    if (!currentQuestion || status !== "running") {
      setRemainingSeconds(0);
      return;
    }

    const activeQuestion = currentQuestion;

    function updateRemainingTime() {
      const endsAt = questionStartedAtRef.current + activeQuestion.time * 1000;
      setRemainingSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    }

    updateRemainingTime();
    const interval = window.setInterval(updateRemainingTime, 250);
    return () => window.clearInterval(interval);
  }, [currentQuestion, status]);

  return {
    quiz,
    students: Object.values(students),
    currentQuestion,
    currentQuestionIndex,
    status,
    remainingSeconds,
    log,
    pending,
    ranking,
    loadQuizFile,
    startQuestion,
    endQuiz,
    closeRoom
  };
}
