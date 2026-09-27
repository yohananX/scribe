"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { finalizeExam, saveExam, type ExamActionResult } from "@/app/exams/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TITLE_BLOCK_FIELD_LABELS, type TitleBlockField } from "@/lib/template";
import type { EditableQuestion } from "@/types/database";

type ReviewScreenProps = {
  examId: string;
  initialQuestions: EditableQuestion[];
  initialTitleBlock: Record<string, string>;
  titleFields: TitleBlockField[];
};

export function ReviewScreen({
  examId,
  initialQuestions,
  initialTitleBlock,
  titleFields,
}: ReviewScreenProps) {
  const [questions, setQuestions] = useState<EditableQuestion[]>(initialQuestions);
  const [titleBlock, setTitleBlock] = useState<Record<string, string>>(
    initialTitleBlock
  );
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<ExamActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const dragIndex = useRef<number | null>(null);

  function markDirty() {
    setDirty(true);
    setSaveState(null);
  }

  function updateQuestion(id: string, patch: Partial<EditableQuestion>) {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === id ? { ...question, ...patch } : question
      )
    );
    markDirty();
  }

  function moveQuestionTo(from: number, to: number) {
    setQuestions((prev) => {
      if (from < 0 || from >= prev.length || to < 0 || to >= prev.length)
        return prev;
      if (from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    markDirty();
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    moveQuestionTo(index, index + direction);
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((question) => question.id !== id));
    markDirty();
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        id: `local-${crypto.randomUUID()}`,
        text: "",
        marks: null,
        options: [],
        order: prev.length + 1,
      },
    ]);
    markDirty();
  }

  function handleDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === targetIndex) return;
    moveQuestionTo(from, targetIndex);
  }

  const router = useRouter();

  function orderedPayload() {
    return {
      questions: questions.map((q, index) => ({ ...q, order: index + 1 })),
      titleBlock,
    };
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveExam(examId, orderedPayload());
      setSaveState(result);
      if (result.ok) setDirty(false);
    });
  }

  function handleContinue() {
    startTransition(async () => {
      if (dirty) {
        const result = await saveExam(examId, orderedPayload());
        setSaveState(result);
        if (!result.ok) return;
        setDirty(false);
      }
      const fin = await finalizeExam(examId);
      if (!fin.ok) {
        setSaveState(fin);
        return;
      }
      router.push(`/exams/${examId}/preview`);
    });
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Review exam</h1>
          <p className="mt-1 text-neutral-600">
            Fix the text, marks and order, then continue to the preview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <Badge variant="warning">Unsaved changes</Badge>}
          <Button onClick={handleSave} disabled={pending || !dirty}>
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      {saveState && !saveState.ok && (
        <div className="mb-5">
          <Alert variant="error">{saveState.message}</Alert>
        </div>
      )}
      {saveState && saveState.ok && (
        <div className="mb-5">
          <Alert variant="success">{saveState.message}</Alert>
        </div>
      )}

      <section>
        <Card className="p-5">
          <h2 className="text-base font-semibold text-neutral-900">Exam details</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Fill in the fields your school template uses at the top of the exam.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {titleFields.map((field) => (
              <Input
                key={field}
                label={TITLE_BLOCK_FIELD_LABELS[field]}
                value={titleBlock[field] ?? ""}
                onChange={(event) => {
                  setTitleBlock((prev) => ({ ...prev, [field]: event.target.value }));
                  markDirty();
                }}
              />
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Questions</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
            Add question
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {questions.map((question, index) => (
            <Card
              key={question.id}
              draggable
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, index)}
              className="cursor-grab active:cursor-grabbing"
            >
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-8 items-center rounded-full bg-neutral-100 px-3 text-sm font-semibold text-neutral-700">
                    Question {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={index === 0}
                      className="rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={index === questions.length - 1}
                      className="rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(question.id)}
                      className="rounded-lg px-2 py-1 text-sm font-medium text-error-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <textarea
                  value={question.text}
                  onChange={(event) =>
                    updateQuestion(question.id, { text: event.target.value })
                  }
                  rows={2}
                  placeholder="Question text"
                  className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                />

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <OptionsEditor
                      options={question.options}
                      onChange={(options) => updateQuestion(question.id, { options })}
                    />
                  </div>
                  <Input
                    label="Marks"
                    type="number"
                    min={0}
                    max={200}
                    value={question.marks ?? ""}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        marks:
                          event.target.value === ""
                            ? null
                            : Math.max(0, Number(event.target.value)),
                      })
                    }
                    className="w-24"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <Button
          size="lg"
          className="w-full"
          onClick={handleContinue}
          disabled={pending || questions.length === 0}
        >
          {pending
            ? "Saving..."
            : dirty
              ? "Save and continue to preview"
              : "Continue to preview"}
        </Button>
        {dirty && (
          <p className="mt-2 text-center text-sm text-neutral-500">
            Unsaved changes will be saved before continuing.
          </p>
        )}
      </div>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  if (options.length === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange([""])}
        className="text-sm font-medium text-primary-700 hover:text-primary-800"
      >
        Add multiple-choice options
      </button>
    );
  }

  function updateOption(index: number, value: string) {
    onChange(options.map((option, i) => (i === index ? value : option)));
  }

  function addOption() {
    if (draft.trim() && !options.includes(draft.trim())) {
      onChange([...options.filter(Boolean), draft.trim()]);
      setDraft("");
    }
  }

  function finishAdding() {
    if (draft.trim()) {
      onChange([...options.filter(Boolean), draft.trim()]);
      setDraft("");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-neutral-700">Options</span>
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-5 text-sm text-neutral-500">
            {String.fromCharCode(65 + index)}.
          </span>
          <input
            value={option}
            onChange={(event) => updateOption(index, event.target.value)}
            placeholder="Option text"
            className="h-10 flex-1 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
            className="px-1 text-sm text-error-600 hover:text-error-700"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addOption();
            }
          }}
          placeholder="Add an option"
          className="h-10 flex-1 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        />
        <Button size="sm" type="button" variant="secondary" onClick={finishAdding}>
          Add
        </Button>
      </div>
    </div>
  );
}