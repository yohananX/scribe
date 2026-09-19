"use client";

import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (email: string) => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send magic link");
      }

      setStatus("success");
      setMessage("Check your email for a magic link to sign in.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">Welcome to Scribe</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Enter your email and we&apos;ll send you a magic link.
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
