export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong";
}