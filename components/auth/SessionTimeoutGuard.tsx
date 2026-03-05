"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const SESSION_STARTED_AT_KEY = "yvhs_session_started_at";
const MAX_SESSION_MS = 8 * 60 * 60 * 1000; // 8시간

export default function SessionTimeoutGuard() {
  useEffect(() => {
    const supabase = createClient();

    const checkSessionAge = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        localStorage.removeItem(SESSION_STARTED_AT_KEY);
        return;
      }

      const saved = Number(localStorage.getItem(SESSION_STARTED_AT_KEY) ?? 0);
      const startedAt = saved > 0 ? saved : Date.now();
      if (!saved) localStorage.setItem(SESSION_STARTED_AT_KEY, String(startedAt));

      if (Date.now() - startedAt > MAX_SESSION_MS) {
        await supabase.auth.signOut();
        localStorage.removeItem(SESSION_STARTED_AT_KEY);
        window.location.href = "/login?expired=1";
      }
    };

    checkSessionAge();
    const timer = setInterval(checkSessionAge, 60 * 1000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
      }
      if (event === "SIGNED_OUT") {
        localStorage.removeItem(SESSION_STARTED_AT_KEY);
      }
    });

    return () => {
      clearInterval(timer);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
