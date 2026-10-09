"use client";

import { useEffect, useState } from "react";
import { localData } from "./local";
import { supabaseData } from "./supabase";
import type { DataLayer, User } from "./types";

export * from "./types";

// NEXT_PUBLIC_BACKEND=supabase uses Supabase (Auth, RLS, Realtime, Edge
// Functions); anything else uses the local dev API. Screens only import `data`.
export const data: DataLayer = process.env.NEXT_PUBLIC_BACKEND === "supabase" ? supabaseData : localData;

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
