"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LoginForm, type LoginMode } from "@/components/auth/LoginForm";
import { AuthFrame } from "@/components/auth/AuthFrame";

function friendlyError(code: string | null): string | null {
  if (!code) return null;
  if (code === "invalid_link")
    return "That sign-in link is invalid or expired. Request a new one below.";
  return decodeURIComponent(code);
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";
  const urlError = friendlyError(searchParams.get("error"));
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    urlError ? "error" : "idle"
  );
  const [message, setMessage] = useState(urlError ?? "");

  const handleSubmit = async (mode: LoginMode, email: string, password: string) => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email, password, next }),
      });

      const responseText = await response.text();
      let data: { error?: string; message?: string } = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText) as typeof data;
        } catch {
          throw new Error("The sign-in service returned an invalid response. Please try again.");
        }
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign in");
      }

      if (mode === "password") {
        router.push(next);
        router.refresh();
        return;
      }

      setStatus("success");
      setMessage(
        data.message ||
          (mode === "magic"
            ? "Check your email for a magic link to sign in."
            : "You are signed in.")
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <AuthFrame
      eyebrow="Welcome back"
      title="Sign in to Scribe"
      description={status === "success" ? "Check your email to finish signing in." : "Continue to your school dashboard and exam workspace."}
    >
        <LoginForm onSubmit={handleSubmit} isLoading={status === "loading"} />
        {status === "success" && (
          <p className="mt-4 text-center text-sm text-success-600">{message}</p>
        )}
        {status === "error" && (
          <p className="mt-4 text-center text-sm text-error-600">{message}</p>
        )}
        <p className="mt-7 text-center text-sm text-neutral-600">
          New to Scribe?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Create an account
          </Link>
        </p>
    </AuthFrame>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
