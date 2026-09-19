"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { createExamFromPages } from "@/app/exams/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type CapturedPage = {
  id: string;
  file: File;
  url: string;
};

export function PageCapture() {
  const [pages, setPages] = useState<CapturedPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      pages.forEach((page) => URL.revokeObjectURL(page.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(list: FileList | null) {
    if (!list) return;

    setError(null);
    setPages((prev) => [
      ...prev,
      ...Array.from(list).map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      })),
    ]);
  }

  function handleCamera(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  function handleGallery(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  function movePage(index: number, direction: -1 | 1) {
    setPages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removePage(id: string) {
    setPages((prev) => {
      const target = prev.find((page) => page.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((page) => page.id !== id);
    });
  }

  function handleProcess() {
    setError(null);

    const formData = new FormData();
    pages.forEach((page) => formData.append("pages", page.file));

    startTransition(async () => {
      const result = await createExamFromPages(formData);
      if (result && !result.ok) {
        setError(result.message ?? "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleCamera}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleGallery}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          size="lg"
          onClick={() => cameraInputRef.current?.click()}
        >
          Take photo
        </Button>
        <Button
          type="button"
          size="lg"
          variant="secondary"
          onClick={() => galleryInputRef.current?.click()}
        >
          Upload from gallery
        </Button>
      </div>

      <p className="mt-3 text-sm text-neutral-500">
        Capture each page of your handwritten exam. You can add more pages,
        reorder them, or remove mistakes before processing.
      </p>

      {pages.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-neutral-900">
              Added pages
            </h2>
            <Badge variant="primary">{pages.length}</Badge>
          </div>

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pages.map((page, index) => (
              <li key={page.id}>
                <Card className="overflow-hidden">
                  <div className="relative aspect-[3/4] bg-neutral-100">
                    <img
                      src={page.url}
                      alt={`Page ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 p-2">
                    <button
                      type="button"
                      onClick={() => movePage(index, -1)}
                      disabled={index === 0}
                      className="text-xs font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-40"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => movePage(index, 1)}
                      disabled={index === pages.length - 1}
                      className="text-xs font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-40"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => removePage(page.id)}
                      className="text-xs font-medium text-error-600 hover:text-error-700"
                    >
                      Remove
                    </button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="mt-8">
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={handleProcess}
          disabled={pages.length === 0 || pending}
        >
          {pending
            ? "Processing..."
            : `Extract exam from ${pages.length} page${pages.length === 1 ? "" : "s"}`}
        </Button>
      </div>

      {pending && (
        <div className="mt-4 flex items-center justify-center gap-3 text-neutral-600">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600" />
          <span className="text-sm">Reading your pages...</span>
        </div>
      )}
    </div>
  );
}