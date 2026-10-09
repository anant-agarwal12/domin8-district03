import type { ErrorCode } from "./types";

// "network" is client-side only: the API could not be reached.
export type ClientErrorCode = ErrorCode | "network";

// Clients branch on `code` and show `message` as-is (contracts/api.md, Errors).
export class ApiError extends Error {
  constructor(
    public code: ClientErrorCode,
    message: string,
    public status: number = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
