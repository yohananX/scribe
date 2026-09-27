"use client";

import { useEffect, useRef } from "react";
import { finalizeExam } from "@/app/exams/actions";

export function FinalizeOnView({ examId }: { examId: string }) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void finalizeExam(examId);
  }, [examId]);

  return null;
}
