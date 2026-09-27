import { createClient } from "@/lib/supabase/server";

const EXAM_PAGES_BUCKET = "exam-pages";

export async function uploadExamPage(examId: string, pageNumber: number, file: File) {
  const supabase = await createClient();
  const path = `${examId}/${pageNumber}/${crypto.randomUUID()}-${file.name}`;

  const { error } = await supabase.storage
    .from(EXAM_PAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`Failed to upload exam page: ${error.message}`);
  }

  return path;
}

export async function getExamPageSignedUrl(path: string, expiresIn = 60) {
  const supabase = await createClient();
  const result = await supabase.storage
    .from(EXAM_PAGES_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (!result.data?.signedUrl) {
    throw new Error("Failed to create signed URL");
  }

  return result.data.signedUrl;
}
