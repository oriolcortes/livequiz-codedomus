"use client";

import { ConnectedStudentsCard, HostControlCard, HostLogCard, QuizLoaderCard, RoomSummaryCard } from "@/components/game/HostRoomPanels";
import { RankingList } from "@/components/game/RankingList";
import { useHostRoomController } from "@/components/game/useHostRoomController";
import type { Room } from "@/src/lib/supabase/types";

export function HostRoom({ room }: { room: Room }) {
  const {
    quiz,
    students,
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
  } = useHostRoomController(room);

  return (
    <div className="grid gap-6 py-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="grid gap-6">
        <RoomSummaryCard code={room.code} status={status} />
        <QuizLoaderCard quiz={quiz} onFileSelected={(file) => void loadQuizFile(file)} />
        <ConnectedStudentsCard students={students} maxStudents={room.max_students} />
      </section>

      <section className="grid gap-6">
        <HostControlCard
          quiz={quiz}
          currentQuestion={currentQuestion}
          currentQuestionIndex={currentQuestionIndex}
          remainingSeconds={remainingSeconds}
          pending={pending}
          status={status}
          onEndQuiz={endQuiz}
          onCloseRoom={closeRoom}
          onStartQuestion={startQuestion}
        />
        <RankingList entries={ranking} />
        <HostLogCard log={log} />
      </section>
    </div>
  );
}
