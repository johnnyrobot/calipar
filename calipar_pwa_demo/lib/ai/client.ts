import type {
  AICompletionMeta,
  AIErrorCode,
  AIErrorPayload,
  AISessionResult,
  AIStatus,
  AnalyzeRequest,
  AnalyzeResponse,
  ChatRequest,
  EquityCheckRequest,
  EquityCheckResponse,
  ExpandRequest,
  ExpandResponse,
  SocraticRequest,
  SocraticResponse,
} from "./contracts";

export * from "./contracts";

export class AIClientError extends Error {
  readonly code: AIErrorCode;
  readonly requestId?: string;
  readonly retryAfter?: number;
  readonly status?: number;

  constructor(
    message: string,
    options: {
      code: AIErrorCode;
      requestId?: string;
      retryAfter?: number;
      status?: number;
    },
  ) {
    super(message);
    this.name = "AIClientError";
    this.code = options.code;
    this.requestId = options.requestId;
    this.retryAfter = options.retryAfter;
    this.status = options.status;
  }
}

async function readError(response: Response): Promise<AIClientError> {
  let payload: AIErrorPayload | undefined;
  try {
    payload = (await response.json()) as AIErrorPayload;
  } catch {
    // A proxy or offline layer may replace the JSON response.
  }
  return new AIClientError(
    payload?.error?.message ?? "The AI service is temporarily unavailable.",
    {
      code: payload?.error?.code ?? "AI_UNAVAILABLE",
      requestId: payload?.error?.requestId,
      retryAfter: payload?.error?.retryAfter,
      status: response.status,
    },
  );
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

async function postJson<T>(
  path: string,
  input: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export function getAIStatus(): Promise<AIStatus> {
  return getJson<AIStatus>("/api/ai/status");
}

export function createAISession(
  turnstileToken: string,
): Promise<AISessionResult> {
  return postJson<AISessionResult>("/api/ai/session", { turnstileToken });
}

export function analyze(
  input: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  return postJson<AnalyzeResponse>("/api/ai/analyze", input, signal);
}

export function expand(
  input: ExpandRequest,
  signal?: AbortSignal,
): Promise<ExpandResponse> {
  return postJson<ExpandResponse>("/api/ai/expand", input, signal);
}

export function equityCheck(
  input: EquityCheckRequest,
  signal?: AbortSignal,
): Promise<EquityCheckResponse> {
  return postJson<EquityCheckResponse>("/api/ai/equity-check", input, signal);
}

export function socratic(
  input: SocraticRequest,
  signal?: AbortSignal,
): Promise<SocraticResponse> {
  return postJson<SocraticResponse>("/api/ai/socratic", input, signal);
}

export interface ChatStreamHandlers {
  onMeta?: (meta: AICompletionMeta) => void;
  onDelta?: (text: string) => void;
  onDone?: (meta: AICompletionMeta) => void;
}

export async function streamChat(
  input: ChatRequest,
  handlers: ChatStreamHandlers = {},
  signal?: AbortSignal,
): Promise<AICompletionMeta> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    signal,
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await readError(response);
  if (!response.body) {
    throw new AIClientError("The AI stream did not include a response body.", {
      code: "AI_BAD_RESPONSE",
      status: response.status,
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "message";
  let dataLines: string[] = [];
  let completed: AICompletionMeta | undefined;

  const dispatch = () => {
    if (dataLines.length === 0) return;
    const raw = dataLines.join("\n");
    dataLines = [];
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new AIClientError("The AI stream returned malformed data.", {
        code: "AI_BAD_RESPONSE",
      });
    }

    if (currentEvent === "meta") {
      handlers.onMeta?.(data as AICompletionMeta);
    } else if (currentEvent === "delta") {
      handlers.onDelta?.((data as { text: string }).text);
    } else if (currentEvent === "done") {
      completed = data as AICompletionMeta;
      handlers.onDone?.(completed);
    } else if (currentEvent === "error") {
      const error = data as AIErrorPayload["error"];
      throw new AIClientError(error.message, {
        code: error.code,
        requestId: error.requestId,
        retryAfter: error.retryAfter,
      });
    }
    currentEvent = "message";
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) {
      if (line === "") {
        dispatch();
      } else if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (done) break;
  }
  if (buffer) {
    for (const line of buffer.split(/\r?\n/)) {
      if (line.startsWith("event:")) currentEvent = line.slice(6).trim();
      if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
  }
  dispatch();

  if (!completed) {
    throw new AIClientError("The AI stream ended before completion.", {
      code: "AI_BAD_RESPONSE",
    });
  }
  return completed;
}
