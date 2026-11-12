import { describe, expect, it, vi } from "vitest";
import { login, register } from "./auth-client.js";

describe("same-origin authentication client", () => {
  it("posts registration through the Next rewrite", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ user: { username: "new-user" } }), { status: 201 }),
    );

    await register({
      username: "new-user",
      email: "new@example.com",
      password: "correct horse battery staple",
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
      email: "existing@example.com",
      password: "correct horse battery staple",
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/login", expect.objectContaining({
      credentials: "include",
      method: "POST",
    }));
    fetchMock.mockRestore();
  });
});
