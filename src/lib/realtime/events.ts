export type PlayerQuestionPayload = {
  id: string;
  index: number;
  text: string;
  options: string[];
  time: number;
  startedAt: number;
};

export type StudentJoinedPayload = {
  studentId: string;
  nickname: string;
};

export type AnswerSubmittedPayload = {
  studentId: string;
  nickname: string;
  questionIndex: number;
  optionIndex: number;
  sentAt: number;
};

export type AnswerResultPayload = {
  studentId: string;
  questionIndex: number;
  correct: boolean;
  points: number;
  correctOptionIndex?: number;
};

export type RankingEntry = {
  studentId: string;
  nickname: string;
  score: number;
  answers: number;
};

export type RankingPayload = {
  entries: RankingEntry[];
};

export type RoomStatePayload = {
  status: "waiting" | "running" | "ended";
  title?: string;
  question?: PlayerQuestionPayload;
  ranking?: RankingEntry[];
};

export const realtimeEvents = {
  studentJoin: "student:join",
  studentRejected: "student:rejected",
  questionStarted: "question:started",
  answerSubmitted: "answer:submitted",
  answerResult: "answer:result",
  rankingUpdated: "ranking:updated",
  roomStateRequested: "room:state-requested",
  roomState: "room:state",
  quizEnded: "quiz:ended"
} as const;
