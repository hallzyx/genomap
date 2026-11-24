import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./api.js";

const Session = createContext(null);

async function readWorkspace() {
  let me;
  try {
    me = await api("/api/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
  const { role } = me.profile;
  const [credentials, events, moderation] = await Promise.all([
    role === "moderator" ? null : api("/api/credentials"),
    role === "organizer" ? api("/api/events") : null,
    role === "moderator" ? api("/api/moderation") : null,
  ]);
  return {
    ...me,
    credentials: credentials?.credentials ?? [],
    events: events?.events ?? [],
    requests: moderation?.requests ?? [],
  };
}

export function SessionProvider({ children }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  const reload = useCallback(async () => {
    try {
      const data = await readWorkspace();
      setState({ loading: false, data, error: null });
      return data;
    } catch (error) {
      setState((previous) => ({ ...previous, loading: false, error: error.code ?? "unknown" }));
      return null;
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const signOut = useCallback(async () => {
    await api("/api/auth/sign-out", { body: {} }).catch(() => {});
    setState({ loading: false, data: null, error: null });
  }, []);

  const value = useMemo(() => ({ ...state, reload, signOut }), [state, reload, signOut]);
  return <Session.Provider value={value}>{children}</Session.Provider>;
}

export const useSession = () => useContext(Session);
