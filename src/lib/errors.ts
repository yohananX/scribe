export type AppError = {
  message: string;
  code?: string;
};

export function toAppError(error: unknown): AppError {
  if (error instanceof Error) {
    return { message: error.message };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return { message: error.message };
  }

  return { message: "Something went wrong. Please try again." };
}

export function getFriendlyMessage(error: unknown): string {
  const appError = toAppError(error);

  if (appError.message.includes("network") || appError.message.includes("fetch")) {
    return "Network issue. Please check your connection and try again.";
  }

  if (appError.message.includes("Invalid login credentials")) {
    return "Incorrect email or password. Try again or reset your password.";
  }

  if (appError.message.includes("upload")) {
    return "Upload failed. Please try again or use a different file.";
  }

  if (appError.message.includes("processing")) {
    return "Processing failed. Please try again or contact support if it keeps happening.";
  }

  if (
    appError.message.includes("row-level security") ||
    appError.message.includes("infinite recursion")
  ) {
    return "Your account setup is not available yet. Please try again after the database access setup is completed.";
  }

  return appError.message;
}
