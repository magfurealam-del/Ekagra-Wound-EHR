"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabase/browser";

export default function StaffLogin() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); setMessage(""); const client = createBrowserClient(); if (!client) { setMessage("Supabase environment variables are not configured."); setLoading(false); return; } const { error } = await client.auth.signInWithPassword({ email, password }); if (error) { setMessage(error.message); setLoading(false); return; } window.location.href = "/app"; }
  return <main className="portal-page"><section className="portal-card login-card"><div className="brand-mark"><span>EK</span><div><strong>Ekagra</strong><small>Wound Care EHR</small></div></div><p className="eyebrow">Staff access</p><h1>Sign in to the clinical workspace</h1><p>Use your Ekagra staff account. Your clinic role controls what you can view, edit, and confirm.</p><form onSubmit={submit} className="login-form"><label>Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{message && <p className="login-error">{message}</p>}<button className="primary-button" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form><Link className="text-link" href="/">← Back to Ekagra EHR</Link></section></main>;
}
