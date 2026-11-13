export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "USER" | "ORGANIZER" | "ADMINISTRATOR";
  isActive: boolean;
};

export type AdminQuestion = {
  id: string;
  title: string;
  status: string;
  predictionCount: number;
};

type ErrorPayload = { error?: { message?: string } };

const request = async <T extends object>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, { credentials: "include", ...init });
  const payload = await response.json() as T | ErrorPayload;
  if (!response.ok) {
    throw new Error(("error" in payload && payload.error?.message) || "Administrator request failed.");
  }
  return payload as T;
};

export const getAdminUsers = () => request<{ users: AdminUser[] }>("/api/v1/private/admin/users");
export const getAdminQuestions = () => request<{ questions: AdminQuestion[] }>("/api/v1/private/admin/questions");

export const updateUserRole = (userId: string, role: AdminUser["role"], reason: string) =>
  request<{ user: AdminUser }>(`/api/v1/private/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, reason }),
  });

export const cancelAdminQuestion = (questionId: string, reason: string) =>
  request<{ status: "CANCELLED"; refunded: number }>(`/api/v1/private/admin/questions/${questionId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
