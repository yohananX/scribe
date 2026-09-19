"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export type LoginMode = "magic" | "password";

type LoginFormProps = {
  onSubmit: (mode: LoginMode, email: string, password: string) => Promise<void>;
  isLoading?: boolean;
};

export function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  const [mode, setMode] = useState<LoginMode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit(mode, email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
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
      {mode === "password" && (
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-xl border border-neutral-300 bg-white px-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            placeholder="Your password"
          />
        </div>
      )}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading
          ? "Signing in..."
          : mode === "magic"
            ? "Send magic link"
            : "Sign in"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMode((current) => (current === "magic" ? "password" : "magic"));
          setPassword("");
        }}
        className="text-sm font-medium text-primary-600 hover:text-primary-700"
      >
        {mode === "magic"
          ? "Use email and password instead"
          : "Use a magic link instead"}
      </button>
    </form>
  );
}