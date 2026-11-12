import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthPage } from "./auth-page.js";

describe("authentication page", () => {
  it("renders accessible registration and sign-in controls", () => {
    const markup = renderToStaticMarkup(<AuthPage />);

    expect(markup).toContain("Create your account");
    expect(markup).toContain('name="username"');
    expect(markup).toContain('name="email"');
    expect(markup).toContain('name="password"');
    expect(markup).toContain("Sign in");
  });
});
