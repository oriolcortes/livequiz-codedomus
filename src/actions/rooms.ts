"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { GLOBAL_LIMITS, estimateRoomMessages, getRoleLimits, type UserRole } from "@/src/config/limits";
import type { Room } from "@/src/lib/supabase/types";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

function randomRoomCode(length = GLOBAL_LIMITS.roomCodeLength) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length)]).join("");
}

async function countRooms(filters: { hostId?: string; createdAfter?: string; activeOnly?: boolean; excludeOwnerHosts?: boolean }) {
  const supabase = await createClient();
  let query = supabase.from("rooms").select("id", { count: "exact", head: true });

  if (filters.hostId) query = query.eq("host_id", filters.hostId);
  if (filters.createdAfter) query = query.gte("created_at", filters.createdAfter);
  if (filters.activeOnly) query = query.eq("status", "active").gt("expires_at", new Date().toISOString());

  if (filters.excludeOwnerHosts) {
    // RLS keeps this safe; this is a soft global public cap, not security logic.
    query = query.not("host_id", "in", "(select id from public.profiles where role = 'owner')");
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function monthlyEstimatedMessages() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("estimated_messages")
    .gte("created_at", startOfMonth());

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + row.estimated_messages, 0);
}

export async function createRoomAction(): Promise<ActionResult<{ code: string }>> {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { ok: false, error: "Cal iniciar sessió per crear una sala." };
    }

    const user = authData.user;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) return { ok: false, error: profileError.message };

    const role = (profile?.role ?? "free") as UserRole;
    const limits = getRoleLimits(role);

    const [userActive, userDaily, userMonthly, globalActive, globalDaily, globalMonthly, estimatedMonthly] = await Promise.all([
      countRooms({ hostId: user.id, activeOnly: true }),
      countRooms({ hostId: user.id, createdAfter: startOfToday() }),
      countRooms({ hostId: user.id, createdAfter: startOfMonth() }),
      countRooms({ activeOnly: true }),
      countRooms({ createdAfter: startOfToday() }),
      countRooms({ createdAfter: startOfMonth() }),
      monthlyEstimatedMessages()
    ]);

    if (userActive >= limits.maxActiveRooms) {
      return { ok: false, error: `Ja tens ${userActive} sala/es activa/es. Límit del rol ${role}: ${limits.maxActiveRooms}.` };
    }

    if (userDaily >= limits.quizzesPerDay) {
      return { ok: false, error: `Has arribat al límit diari del rol ${role}: ${limits.quizzesPerDay} quiz/zos.` };
    }

    if (userMonthly >= limits.quizzesPerMonth) {
      return { ok: false, error: `Has arribat al límit mensual del rol ${role}: ${limits.quizzesPerMonth} quiz/zos.` };
    }

    const maxGlobalActive = role === "owner" ? GLOBAL_LIMITS.maxActiveRoomsIncludingOwner : GLOBAL_LIMITS.maxActiveRoomsPublic;

    if (globalActive >= maxGlobalActive) {
      return { ok: false, error: "S'ha arribat al límit global de sales actives. Torna-ho a provar més tard." };
    }

    if (globalDaily >= GLOBAL_LIMITS.maxQuizzesPerDay) {
      return { ok: false, error: "S'ha arribat al límit global diari de quizzes." };
    }

    if (globalMonthly >= GLOBAL_LIMITS.maxQuizzesPerMonth) {
      return { ok: false, error: "S'ha arribat al límit global mensual de quizzes." };
    }

    const estimatedMessages = estimateRoomMessages(limits.maxStudentsPerRoom, limits.maxQuestionsPerQuiz);
    const budgetLimit = Math.floor(
      GLOBAL_LIMITS.estimatedRealtimeMessagesPerMonthBudget * GLOBAL_LIMITS.stopCreatingRoomsAtBudgetRatio
    );

    if (estimatedMonthly + estimatedMessages > budgetLimit) {
      return { ok: false, error: "S'ha arribat al pressupost preventiu de missatges realtime del mes." };
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomRoomCode();
      const { error } = await supabase.from("rooms").insert({
        code,
        host_id: user.id,
        max_students: limits.maxStudentsPerRoom,
        max_questions: limits.maxQuestionsPerQuiz,
        estimated_messages: estimatedMessages,
        expires_at: addMinutes(limits.roomTtlMinutes)
      });

      if (!error) {
        revalidatePath("/dashboard");
        return { ok: true, data: { code } };
      }

      if (!error.message.toLowerCase().includes("duplicate")) {
        return { ok: false, error: error.message };
      }
    }

    return { ok: false, error: "No s'ha pogut generar un codi únic de sala." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error inesperat creant la sala." };
  }
}

export async function endRoomAction(code: string): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) return { ok: false, error: "Cal iniciar sessió." };

    const { error } = await supabase
      .from("rooms")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("code", code)
      .eq("host_id", authData.user.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Error inesperat finalitzant la sala." };
  }
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const supabase = await createClient();
  const normalizedCode = code.trim().toUpperCase();
  const { data } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", normalizedCode)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return data;
}
