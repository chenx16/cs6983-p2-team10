import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminPage } from "./admin-page.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const administrator = {
  id: "admin-1",
  username: "admin",
  email: "admin@example.com",
  role: "ADMINISTRATOR" as const,
  balance: 1000,
};

describe("administrator page", () => {
  it("shows a forbidden state for authenticated non-administrators", () => {
    render(createElement(AdminPage, { user: { ...administrator, role: "USER" } }));
    expect(screen.getByRole("heading", { name: "Access denied" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save role" })).toBeNull();
  });

  it("loads admin data and validates a role-change reason", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const path = String(input);
      if (path.endsWith("/users")) {
        return new Response(JSON.stringify({ users: [{ ...administrator, isActive: true }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ questions: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(createElement(AdminPage, { user: administrator }));

    await screen.findByText("Manage roles");
    const role = screen.getByLabelText("Role for admin");
    await userEvent.setup().selectOptions(role, "ORGANIZER");
    await userEvent.setup().click(screen.getByRole("button", { name: "Save role" }));

    expect(await screen.findByText("Enter a reason for this role change.")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("submits a role change through the server endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const path = String(input);
      if (path.endsWith("/users")) {
        return new Response(JSON.stringify({ users: [{ ...administrator, isActive: true }] }), { status: 200 });
      }
      if (path.endsWith("/questions")) return new Response(JSON.stringify({ questions: [] }), { status: 200 });
      return new Response(JSON.stringify({ user: { ...administrator, role: "ORGANIZER" } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const interaction = userEvent.setup();
    render(createElement(AdminPage, { user: administrator }));

    await screen.findByText("Manage roles");
    await interaction.selectOptions(screen.getByLabelText("Role for admin"), "ORGANIZER");
    await interaction.type(screen.getByLabelText("Reason for admin"), "Approved organizer");
    await interaction.click(screen.getByRole("button", { name: "Save role" }));

    expect(await screen.findByText("Role updated.")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([, request]) => request?.method === "PATCH")).toBe(true);
  });
});
