"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../app-shell";
import { getCurrentUser, logout, type AuthUser } from "../auth-client";
import { OrganizerPage } from "../organizer-page";

export default function OrganizerRoute() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { void getCurrentUser().then((currentUser) => { if (!currentUser) { window.location.href = "/?view=sign-in"; return; } setUser(currentUser); setLoaded(true); }).catch(() => setLoaded(true)); }, []);
  if (!loaded) return <main className="standalone-loading"><p role="status">Checking organizer access…</p></main>;
  return <AppShell onAuthNavigate={() => { window.location.href = "/"; }} onNavigate={(view) => { window.location.href = view === "arena" ? "/" : `/?view=${view}`; }} onSignOut={() => { void logout().then(() => { setUser(null); window.location.href = "/"; }); }} user={user} view="organizer"><OrganizerPage user={user} /></AppShell>;
}
