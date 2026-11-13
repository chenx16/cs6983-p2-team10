"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../app-shell";
import { getCurrentUser, logout, type AuthUser } from "../auth-client";
import { AdminPage } from "../admin-page";

export default function AdministratorRoute() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void getCurrentUser().then((currentUser) => {
      if (!currentUser) {
        setLoaded(true);
        window.location.href = "/?view=sign-in";
        return;
      }
      setUser(currentUser);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  if (!loaded) return <main className="standalone-loading"><p role="status">Checking administrator access…</p></main>;
  return <AppShell
    onAuthNavigate={() => { window.location.href = "/"; }}
    onNavigate={(view) => { window.location.href = view === "arena" ? "/" : `/?view=${view}`; }}
    onSignOut={() => { void logout().then(() => { setUser(null); window.location.href = "/"; }); }}
    user={user}
    view="admin"
  ><AdminPage user={user} /></AppShell>;
}
