"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { finalizeExam, saveExam, type ExamActionResult } from "@/app/exams/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TITLE_BLOCK_FIELD_LABELS, type TitleBlockField } from "@/lib/template";
import type { EditableBlock } from "@/types/database";

type ReviewScreenProps = {
  examId: string;
  initialBlocks: EditableBlock[];
  initialTitleBlock: Record<string, string>;
  titleFields: TitleBlockField[];
};

export function ReviewScreen({
  examId,
  initialBlocks,
  initialTitleBlock,
  titleFields,
}: ReviewScreenProps) {
  const [blocks, setBlocks] = useState<EditableBlock[]>(initialBlocks);
  const [titleBlock, setTitleBlock] = useState<Record<string, string>>(
    initialTitleBlock
  );
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<ExamActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function markDirty() {
    setDirty(true);
    setSaveState(null);
  }

  function updateBlock(id: string, patch: Partial<EditableBlock>) {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, ...patch } : block
      )
    );
    markDirty();
  }

  function moveBlockTo(from: number, to: number) {
    setBlocks((prev) => {
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

  function moveBlock(index: number, direction: -1 | 1) {
    moveBlockTo(index, index + direction);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
    markDirty();
  }

  function addBlock(type: EditableBlock["type"]) {
    const newBlock: EditableBlock = {
      id: `local-${crypto.randomUUID()}`,
      type,
      text: type === "instructions" ? "" : undefined,
      title: type === "section" ? "" : undefined,
      instructions: type === "section" ? "" : undefined,
      content: type === "passage" ? "" : undefined,
      questionText: type === "question" ? "" : undefined,
      marks: type === "question" ? null : undefined,
      options: type === "question" ? [] : undefined,
      subparts: type === "question" ? [] : undefined,
    };
    setBlocks((prev) => [...prev, newBlock]);
    markDirty();
  }

  function updateSubpart(blockId: string, subpartIndex: number, patch: { text?: string; marks?: number | null }) {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || !block.subparts) return block;
        const newSubparts = [...block.subparts];
        newSubparts[subpartIndex] = { ...newSubparts[subpartIndex], ...patch };
        return { ...block, subparts: newSubparts };
      })
    );
    markDirty();
  }

  function addSubpart(blockId: string) {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          subparts: [...(block.subparts ?? []), { text: "", marks: null }],
        };
      })
    );
    markDirty();
  }

  function removeSubpart(blockId: string, subpartIndex: number) {
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== blockId || !block.subparts) return block;
        return {
          ...block,
          subparts: block.subparts.filter((_, i) => i !== subpartIndex),
        };
      })
    );
    markDirty();
  }

  const router = useRouter();

  function orderedPayload() {
    return {
      blocks: blocks.map((b, index) => ({ ...b, order: index + 1 })),
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

  const questionBlocks = blocks.filter((b) => b.type === "question");
  const nonQuestionBlocks = blocks.filter((b) => b.type !== "question");

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

      {/* Non-question blocks: instructions, sections, passages */}
      {nonQuestionBlocks.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-neutral-900">Exam structure</h2>
          <p className="mt-1 text-sm text-neutral-600">
            These are paper-level instructions, sections, and passages extracted from your photos.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {nonQuestionBlocks.map((block, index) => (
              <BlockCard
                key={block.id}
                block={block}
                index={blocks.findIndex((b) => b.id === block.id)}
                totalBlocks={blocks.length}
                onUpdate={updateBlock}
                onMoveUp={() => moveBlock(blocks.findIndex((b) => b.id === block.id), -1)}
                onMoveDown={() => moveBlock(blocks.findIndex((b) => b.id === block.id), 1)}
                onRemove={() => removeBlock(block.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Questions */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Questions</h2>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => addBlock("question")}>
              Add question
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => addBlock("instructions")}>
              Add instructions
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => addBlock("section")}>
              Add section
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => addBlock("passage")}>
              Add passage
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {questionBlocks.map((question, questionIndex) => {
            const globalIndex = blocks.findIndex((b) => b.id === question.id);
            return (
              <Card
                key={question.id}
                className="cursor-grab active:cursor-grabbing"
              >
                <QuestionEditor
                  question={question}
                  index={questionIndex}
                  globalIndex={globalIndex}
                  totalBlocks={blocks.length}
                  onUpdate={updateBlock}
                  onAddSubpart={addSubpart}
                  onUpdateSubpart={updateSubpart}
                  onRemoveSubpart={removeSubpart}
                  onMoveUp={() => moveBlock(globalIndex, -1)}
                  onMoveDown={() => moveBlock(globalIndex, 1)}
                  onRemove={() => removeBlock(question.id)}
                />
              </Card>
            );
          })}
        </div>
      </section>

      <div className="mt-8">
        <Button
          size="lg"
          className="w-full"
          onClick={handleContinue}
          disabled={pending || questionBlocks.length === 0}
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

function BlockCard({
  block,
  index,
  totalBlocks,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  block: EditableBlock;
  index: number;
  totalBlocks: number;
  onUpdate: (id: string, patch: Partial<EditableBlock>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const typeLabels: Record<EditableBlock["type"], string> = {
    instructions: "Instructions",
    section: "Section",
    passage: "Passage",
    question: "Question",
  };

  const typeIcons: Record<EditableBlock["type"], string> = {
    instructions: "📋",
    section: "📂",
    passage: "📖",
    question: "❓",
  };

  return (
    <Card className="p-4 border-l-4 border-primary-500 bg-neutral-50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl">{typeIcons[block.type]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700">{typeLabels[block.type]}</span>
              {block.type === "section" && block.title && (
                <span className="text-sm font-semibold text-neutral-900">: {block.title}</span>
              )}
              {block.type === "passage" && block.title && (
                <span className="text-sm font-semibold text-neutral-900">: {block.title}</span>
              )}
            </div>
            {(block.type === "instructions" && block.text) && (
              <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{block.text}</p>
            )}
            {(block.type === "section" && block.instructions) && (
              <p className="mt-1 text-sm text-neutral-600 line-clamp-2">{block.instructions}</p>
            )}
            {(block.type === "passage" && block.content) && (
              <p className="mt-1 text-sm text-neutral-600 line-clamp-3">{block.content}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-200 disabled:opacity-40"
          >
            Up
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalBlocks - 1}
            className="rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-200 disabled:opacity-40"
          >
            Down
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg px-2 py-1 text-sm font-medium text-error-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-3">
        {block.type === "instructions" && (
          <textarea
            value={block.text ?? ""}
            onChange={(e) => onUpdate(block.id, { text: e.target.value })}
            rows={2}
            placeholder="Paper-level instructions (e.g. 'Answer all questions...')"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          />
        )}
        {block.type === "section" && (
          <div className="flex flex-col gap-2">
            <Input
              label="Section title"
              value={block.title ?? ""}
              onChange={(e) => onUpdate(block.id, { title: e.target.value })}
              placeholder="e.g. Section A"
            />
            <textarea
              value={block.instructions ?? ""}
              onChange={(e) => onUpdate(block.id, { instructions: e.target.value })}
              rows={2}
              placeholder="Section instructions (optional)"
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            />
          </div>
        )}
        {block.type === "passage" && (
          <div className="flex flex-col gap-2">
            <Input
              label="Passage title (optional)"
              value={block.title ?? ""}
              onChange={(e) => onUpdate(block.id, { title: e.target.value })}
              placeholder="e.g. Reading Passage"
            />
            <textarea
              value={block.content ?? ""}
              onChange={(e) => onUpdate(block.id, { content: e.target.value })}
              rows={4}
              placeholder="Passage text (comprehension text, case study, etc.)"
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function QuestionEditor({
  question,
  index,
  globalIndex,
  totalBlocks,
  onUpdate,
  onAddSubpart,
  onUpdateSubpart,
  onRemoveSubpart,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  question: EditableBlock;
  index: number;
  globalIndex: number;
  totalBlocks: number;
  onUpdate: (id: string, patch: Partial<EditableBlock>) => void;
  onAddSubpart: (blockId: string) => void;
  onUpdateSubpart: (blockId: string, subpartIndex: number, patch: { text?: string; marks?: number | null }) => void;
  onRemoveSubpart: (blockId: string, subpartIndex: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-8 items-center rounded-full bg-neutral-100 px-3 text-sm font-semibold text-neutral-700">
          Question {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={globalIndex === 0}
            className="rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
          >
            Up
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={globalIndex === totalBlocks - 1}
            className="rounded-lg px-2 py-1 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
          >
            Down
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg px-2 py-1 text-sm font-medium text-error-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      <textarea
        value={question.questionText ?? ""}
        onChange={(event) =>
          onUpdate(question.id, { questionText: event.target.value })
        }
        rows={2}
        placeholder="Question text"
        className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <OptionsEditor
            options={question.options ?? []}
            onChange={(options) => onUpdate(question.id, { options })}
          />
        </div>
        <Input
          label="Marks"
          type="number"
          min={0}
          max={200}
          value={question.marks ?? ""}
          onChange={(event) =>
            onUpdate(question.id, {
              marks:
                event.target.value === ""
                  ? null
                  : Math.max(0, Number(event.target.value)),
            })
          }
          className="w-24"
        />
      </div>

      {/* Subparts */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700">Sub-parts</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => onAddSubpart(question.id)}>
            Add sub-part
          </Button>
        </div>
        {(question.subparts ?? []).length > 0 && (
          <div className="flex flex-col gap-2">
            {question.subparts!.map((subpart, subpartIndex) => (
              <div key={subpartIndex} className="flex items-start gap-2 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                <span className="w-6 text-sm font-medium text-neutral-600 shrink-0">
                  {String.fromCharCode(97 + subpartIndex)})
                </span>
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    type="text"
                    value={subpart.text}
                    onChange={(e) => onUpdateSubpart(question.id, subpartIndex, { text: e.target.value })}
                    placeholder="Sub-part text"
                    className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      label="Marks"
                      type="number"
                      min={0}
                      max={200}
                      value={subpart.marks ?? ""}
                      onChange={(e) => onUpdateSubpart(question.id, subpartIndex, {
                        marks: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                      })}
                      className="w-20"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveSubpart(question.id, subpartIndex)}
                      className="text-sm text-error-600 hover:text-error-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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