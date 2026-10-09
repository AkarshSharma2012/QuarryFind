"use client";

import { useEffect, useState } from "react";
import { localData } from "./local";
import type { DataLayer, User } from "./types";

export * from "./types";

// The Supabase implementation is swapped in by replica-backend
// (NEXT_PUBLIC_BACKEND=supabase). Screens only ever import `data`.
export const data: DataLayer = localData;

/** undefined while loading, null when signed out. */
export function useUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    data.getUser().then((u) => live && setUser(u));
    const off = data.onAuthChange((u) => setUser(u));
    return () => { live = false; off(); };
  }, []);
  return user;
}
