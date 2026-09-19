export type Organisation = {
  id: string;
  name: string;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  organisation_id: string | null;
  role: "admin" | "teacher";
  created_at: string;
};

export type Invitation = {
  id: string;
  organisation_id: string;
  email: string;
  role: "teacher";
  status: "pending" | "accepted" | "revoked";
  created_by: string | null;
  created_at: string;
};

import type { TemplateConfig } from "@/lib/template";

export type Template = {
  id: string;
  organisation_id: string;
  config: TemplateConfig;
  created_at: string;
  updated_at: string;
};

export type Exam = {
  id: string;
  organisation_id: string;
  teacher_id: string;
  title_block: Record<string, unknown>;
  status: "draft" | "finalized";
  created_at: string;
  updated_at: string;
};

export type ExamPage = {
  id: string;
  exam_id: string;
  page_number: number;
  storage_path: string;
  created_at: string;
};

export type Question = {
  id: string;
  exam_id: string;
  text: string;
  marks: number | null;
  options: string[];
  order: number;
  page_number: number | null;
  created_at: string;
};

export type EditableQuestion = {
  id: string;
  text: string;
  marks: number | null;
  options: string[];
  order: number;
};
