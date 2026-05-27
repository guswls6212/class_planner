import { supabase } from "@/utils/supabaseClient";

export type TourSegment = "core" | "login";

export interface TourState {
  coreAt: string | null;
  loginAt: string | null;
}

const COLUMN_BY_SEGMENT: Record<TourSegment, string> = {
  core: "tour_core_completed_at",
  login: "tour_login_completed_at",
};

export async function fetchTourState(userId: string): Promise<TourState> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("tour_core_completed_at, tour_login_completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { coreAt: null, loginAt: null };
  }

  return {
    coreAt: data.tour_core_completed_at,
    loginAt: data.tour_login_completed_at,
  };
}

export async function upsertTourCompletion(
  userId: string,
  segment: TourSegment,
  timestamp: string,
): Promise<boolean> {
  const column = COLUMN_BY_SEGMENT[segment];
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        [column]: timestamp,
      },
      { onConflict: "user_id" },
    );

  return !error;
}
