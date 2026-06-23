import { Note } from "../types";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8020";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  // 204 No Content — don't try to parse an empty body
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function uploadAudio(uri: string, mimeType: string): Promise<Note> {
  const form = new FormData();
  form.append("file", { uri, type: mimeType, name: "recording.m4a" } as any);
  const res = await fetch(`${BASE_URL}/transcribe`, {
    method: "POST",
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
