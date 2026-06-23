export const ROLE_LIMITS = {
  free: {
    quizzesPerDay: 2,
    quizzesPerMonth: 5,
    maxStudentsPerRoom: 30,
    maxQuestionsPerQuiz: 15,
    maxActiveRooms: 1,
    roomTtlMinutes: 45
  },
  trusted: {
    quizzesPerDay: 5,
    quizzesPerMonth: 20,
    maxStudentsPerRoom: 40,
    maxQuestionsPerQuiz: 20,
    maxActiveRooms: 2,
    roomTtlMinutes: 60
  },
  owner: {
    quizzesPerDay: 50,
    quizzesPerMonth: 300,
    maxStudentsPerRoom: 40,
    maxQuestionsPerQuiz: 40,
    maxActiveRooms: 5,
    roomTtlMinutes: 120
  }
} as const;

export const GLOBAL_LIMITS = {
  maxActiveRoomsPublic: 3,
  maxActiveRoomsIncludingOwner: 6,
  maxConcurrentConnectionsSoftCap: 120,
  maxQuizzesPerDay: 50,
  maxQuizzesPerMonth: 300,
  estimatedRealtimeMessagesPerMonthBudget: 1_200_000,
  stopCreatingRoomsAtBudgetRatio: 0.75,
  roomCodeLength: 6,
  staleRoomCleanupMinutes: 10
} as const;

export type UserRole = keyof typeof ROLE_LIMITS;

export const DEFAULT_ROLE: UserRole = "free";

export function getRoleLimits(role: string | null | undefined) {
  if (role === "trusted" || role === "owner") return ROLE_LIMITS[role];
  return ROLE_LIMITS.free;
}

export function estimateRoomMessages(maxStudents: number, maxQuestions: number) {
  const joinsAndPresence = maxStudents * 4;
  const questionBroadcasts = maxQuestions * 4;
  const answers = maxStudents * maxQuestions;
  const rankingUpdates = maxQuestions * Math.ceil(maxStudents / 4);
  const safetyMargin = 250;

  return joinsAndPresence + questionBroadcasts + answers + rankingUpdates + safetyMargin;
}
