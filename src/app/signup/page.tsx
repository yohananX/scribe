"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        redirect?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign up");
      }

      if (data.redirect) {
        router.push(data.redirect);
        router.refresh();
        return;
      }

      setStatus("success");
      setMessage(data.message || "Check your email to confirm your account.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Create your Scribe account
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Sign up with email and password, then set up your school.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              placeholder="you@school.edu"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-neutral-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              placeholder="At least 8 characters"
            />
          </div>
          <Button type="submit" disabled={status === "loading"} className="w-full">
            {status === "loading" ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        {status === "success" && (
          <p className="mt-4 text-center text-sm text-success-600">{message}</p>
        )}
        {status === "error" && (
          <p className="mt-4 text-center text-sm text-error-600">{message}</p>
        )}
        <p className="mt-6 text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
