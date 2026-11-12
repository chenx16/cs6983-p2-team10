type AuthCredentials = {
  email: string;
  password: string;
};

type Registration = AuthCredentials & {
  username: string;
};

type AuthResponse = {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    balance: number;
  };
};

const requestAuth = async <T extends object>(path: string, body: object): Promise<T> => {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify(body),
  });
  const payload = await response.json() as T | { error?: { message?: string } };
  if (!response.ok) {
    const message = "error" in payload && payload.error?.message
      ? payload.error.message
      : "Authentication request failed.";
    throw new Error(message);
  }
  return payload as T;
};

export const register = (input: Registration) =>
  requestAuth<AuthResponse>("/api/v1/auth/register", input);

export const login = (input: AuthCredentials) =>
  requestAuth<AuthResponse>("/api/v1/auth/login", input);

export const logout = async () => {
  const response = await fetch("/api/v1/auth/logout", {
    credentials: "include",
    method: "POST",
  });
  if (!response.ok) throw new Error("Unable to sign out.");
};
