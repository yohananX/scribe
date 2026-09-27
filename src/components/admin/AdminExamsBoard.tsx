"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export type BoardExam = {
  id: string;
  label: string;
  className: string;
  teacherName: string;
  createdLabel: string;
  pages: number;
  status: "draft" | "finalized";
};

type AdminExamsBoardProps = {
  exams: BoardExam[];
};

export function AdminExamsBoard({ exams }: AdminExamsBoardProps) {
  const groups = new Map<string, BoardExam[]>();

  for (const exam of exams) {
    const key = exam.className;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(exam);
    } else {
      groups.set(key, [exam]);
    }
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach((_, key) => {
      initial[key] = true;
    });
    return initial;
  });

  if (exams.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          title="No exams yet"
          description="When teachers create exams, they will appear here grouped by class so you can review and print them."
        />
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      {Array.from(groups.entries()).map(([className, classExams]) => {
        const isOpen = expanded[className] ?? true;

        return (
          <section key={className}>
            <button
              type="button"
              onClick={() =>
                setExpanded((prev) => ({ ...prev, [className]: !isOpen }))
              }
              className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2 text-left"
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-neutral-900">
                  {className}
                </h2>
                <Badge variant="neutral">{classExams.length}</Badge>
              </div>
              <span className="text-sm font-medium text-neutral-500">
                {isOpen ? "Hide" : "Show"}
              </span>
            </button>

            {isOpen && (
              <ul className="mt-2 space-y-3">
                {classExams.map((exam) => (
                  <li key={exam.id}>
                    <a href={`/exams/${exam.id}/preview`}>
                      <Card className="flex flex-col gap-3 p-5 transition-colors hover:border-primary-300 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-neutral-900">
                            {exam.label}
                          </p>
                          <p className="mt-0.5 text-sm text-neutral-600">
                            {exam.teacherName} - {exam.createdLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-neutral-600">
                            {exam.pages} {exam.pages === 1 ? "page" : "pages"}
                          </span>
                          <Badge
                            variant={
                              exam.status === "finalized" ? "success" : "warning"
                            }
                          >
                            {exam.status === "finalized" ? "Ready" : "Draft"}
                          </Badge>
                        </div>
                      </Card>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}