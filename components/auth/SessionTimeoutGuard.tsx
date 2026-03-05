"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SESSION_STARTED_AT_KEY, SESSION_TTL_MS } from "@/lib/auth/session";
import {
  clearSessionMarker,
  getSessionStartFromCookie,
  parseSessionStart,
  setSessionMarker,
} from "@/lib/auth/session-client";

export default function SessionTimeoutGuard() {
  useEffect(() => {
    const supabase = createClient();

    const checkSessionAge = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        clearSessionMarker();
        return;
      }

      const startedAt =
        parseSessionStart(localStorage.getItem(SESSION_STARTED_AT_KEY)) ??
        getSessionStartFromCookie() ??
        Date.now();

      setSessionMarker(startedAt);

      if (Date.now() - startedAt > SESSION_TTL_MS) {
        await supabase.auth.signOut();
        clearSessionMarker();
        window.location.href = "/login?expired=1";
      }
    };

    checkSessionAge();
    const timer = window.setInterval(checkSessionAge, 60 * 1000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setSessionMarker(Date.now());
      }
      if (event === "SIGNED_OUT") {
        clearSessionMarker();
      }
    });

    return () => {
      window.clearInterval(timer);
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
