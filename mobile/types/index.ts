export interface Note {
  _id: string;
  title: string;
  transcript: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  completed_items: number[];
  tags: string[];
  duration_seconds: number;
  word_count: number;
  created_at: string;
  status: "processing" | "done" | "error";
}

export type ProcessingStep = "idle" | "recording" | "transcribing" | "summarising" | "done";
