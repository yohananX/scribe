"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm, type LoginMode } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  const handleSubmit = async (mode: LoginMode, email: string, password: string) => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email, password }),
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
        router.push("/dashboard");
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Welcome to Scribe
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {status === "success"
              ? "Check your email to finish signing in."
              : "Sign in to continue to your school dashboard."}
          </p>
        </div>
        <LoginForm onSubmit={handleSubmit} isLoading={status === "loading"} />
        {status === "success" && (
          <p className="mt-4 text-center text-sm text-success-600">{message}</p>
        )}
        {status === "error" && (
          <p className="mt-4 text-center text-sm text-error-600">{message}</p>
        )}
      </div>
    </div>
  );
}
