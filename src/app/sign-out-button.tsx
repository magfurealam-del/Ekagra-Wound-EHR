"use client";
import { createBrowserClient } from "@/lib/supabase/browser";
export function SignOutButton() { async function signOut() { const client = createBrowserClient(); if (client) { await client.auth.signOut(); window.location.href = "/auth/staff/login"; } } return <button className="text-link" onClick={signOut}>Sign out</button>; }
