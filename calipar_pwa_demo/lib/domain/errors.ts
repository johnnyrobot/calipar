export type WorkspaceErrorCode =
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_BLOCKED"
  | "STORAGE_QUOTA_EXCEEDED"
  | "STORAGE_CORRUPT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "IMPORT_VERSION_UNSUPPORTED"
  | "IMPORT_REFERENTIAL_INTEGRITY";

export class WorkspaceError extends Error {
  readonly code: WorkspaceErrorCode;
  readonly cause?: unknown;
  readonly details?: unknown;

  constructor(
    code: WorkspaceErrorCode,
    message: string,
    options: { cause?: unknown; details?: unknown } = {},
  ) {
    super(message);
    this.name = "WorkspaceError";
    this.code = code;
    this.cause = options.cause;
    this.details = options.details;
  }
}

export function normalizeStorageError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) return error;
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String(error.name)
      : "";
  if (name === "QuotaExceededError") {
    return new WorkspaceError(
      "STORAGE_QUOTA_EXCEEDED",
      "This browser does not have enough storage available for the demo workspace.",
      { cause: error },
    );
  }
  if (name === "VersionError" || name === "InvalidStateError") {
    return new WorkspaceError(
      "STORAGE_BLOCKED",
      "Another tab or an incompatible database version is blocking the workspace.",
      { cause: error },
    );
  }
  if (name === "DataError" || name === "ConstraintError") {
    return new WorkspaceError(
      "STORAGE_CORRUPT",
      "The local workspace contains invalid or inconsistent data.",
      { cause: error },
    );
  }
  return new WorkspaceError(
    "STORAGE_UNAVAILABLE",
    "Browser storage is unavailable. The demo will not fall back to temporary memory.",
    { cause: error },
  );
}
