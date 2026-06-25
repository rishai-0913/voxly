import { Note } from "../types";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8020";

let _authToken: string | null = null;

export function setAuthToken(token: string | null) {
  _authToken = token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (_authToken) headers["Authorization"] = `Bearer ${_authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  // 204 No Content — don't try to parse an empty body
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export type CheckPhoneResult = { exists: boolean };
export type AuthResult = { token: string; user: { id: string; phone: string } };

export const checkPhone = (phone: string) =>
  request<{ exists: boolean }>("/auth/check-phone", { method: "POST", body: JSON.stringify({ phone }) });

export const sendOtp = (phone: string) =>
  request<void>("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) });

export type VerifyOtpResult = { verified: boolean; exists: boolean };

export const verifyOtp = (phone: string, code: string) =>
  request<VerifyOtpResult>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });

export const resetPassword = (phone: string, password: string) =>
  request<AuthResult>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });

// ── Profile ───────────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  phone: string;
  name: string;
  summary_style: "concise" | "detailed" | "action_focused";
};

export const getMe = () => request<UserProfile>("/me");

export const updateMe = (data: Partial<Pick<UserProfile, "name" | "summary_style">>) =>
  request<UserProfile>("/me", { method: "PATCH", body: JSON.stringify(data) });

export const loginWithPassword = (phone: string, password: string) =>
  request<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });

export const registerWithPassword = (phone: string, password: string) =>
  request<AuthResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });

export async function uploadAudio(uri: string, mimeType: string): Promise<Note> {
  const form = new FormData();
  form.append("file", { uri, type: mimeType, name: "recording.m4a" } as any);
  const headers: Record<string, string> = {};
  if (_authToken) headers["Authorization"] = `Bearer ${_authToken}`;
  const res = await fetch(`${BASE_URL}/transcribe`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export const getNotes = () => request<Note[]>("/notes");

export const getNote = (id: string) => request<Note>(`/notes/${id}`);

export const updateNote = (id: string, data: { completed_items: number[] }) =>
  request<Note>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteNote = (id: string) =>
  request<void>(`/notes/${id}`, { method: "DELETE" });

export const searchNotes = (q: string) =>
  request<Note[]>(`/notes/search?q=${encodeURIComponent(q)}`);
