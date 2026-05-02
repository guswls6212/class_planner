import { supabase } from "@/utils/supabaseClient";
import { clearUserClassPlannerData, clearActiveAcademy } from "@/lib/localStorageCrud";

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } finally {
    const userId = localStorage.getItem("supabase_user_id");
    if (userId) {
      clearUserClassPlannerData(userId);
      clearActiveAcademy(userId);
    }
    localStorage.removeItem("supabase_user_id");
    document.cookie = "onboarded=; Path=/; Max-Age=0";
    document.cookie = "user_role=; Path=/; Max-Age=0";
    document.cookie = "active_academy_id=; Path=/; Max-Age=0";
    window.location.reload();
  }
}
