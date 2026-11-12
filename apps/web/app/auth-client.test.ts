import { describe, expect, it, vi } from "vitest";
import { getCurrentUser, login, logout, register } from "./auth-client.js";

describe("same-origin authentication client", () => {
  it("posts registration through the Next rewrite", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ user: { username: "new-user" } }), { status: 201 }),
    );

    await register({
      username: "new-user",
      email: "new@example.com",
      password: "CorrectHorse1",
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/register", expect.objectContaining({
      credentials: "include",
      method: "POST",
    }));
    fetchMock.mockRestore();
  });

  it("posts login through the Next rewrite and includes cookies", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ user: { username: "existing-user" } }), { status: 200 }),
    );

    await login({
      identifier: "existing@example.com",
      password: "CorrectHorse1",
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/login", expect.objectContaining({
      credentials: "include",
      method: "POST",
    }));
    fetchMock.mockRestore();
  });

  it("loads the current session through the same-origin /me endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ user: { username: "existing-user" } }), { status: 200 }),
    );

    await getCurrentUser();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/private/me", expect.objectContaining({
      credentials: "include",
      method: "GET",
    }));
    fetchMock.mockRestore();
  });

  it("signs out through the same-origin logout endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    await logout();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/logout", expect.objectContaining({
      credentials: "include",
      method: "POST",
    }));
    fetchMock.mockRestore();
  });
});
