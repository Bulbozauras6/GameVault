import { isAxiosError } from "axios";

interface AuthApiError {
  message?: string;
  errors?: Record<string, string[]>;
}

export function getAuthApiError(error: unknown): AuthApiError {
  if (isAxiosError<AuthApiError>(error)) {
    return {
      message: error.response?.data?.message ?? "We couldn’t complete that request. Please try again.",
      errors: error.response?.data?.errors,
    };
  }

  return { message: "We couldn’t complete that request. Please try again." };
}
