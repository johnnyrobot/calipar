export const AI_LIMITS = {
  bodyBytes: 64 * 1024,
  promptCharacters: 4_000,
  historyMessages: 10,
  // MUST stay above `chatMaxTokens * WORST_CASE_CHARS_PER_TOKEN`, and there is
  // a test pinning that. A reply the Worker generates is stored and then sent
  // back as history on the next turn, so a ceiling below what generation can
  // emit makes a thread reject its own output: every subsequent send fails
  // AI_VALIDATION_FAILED, and because sending is what would eventually push the
  // offending message out of the client's last-8 window, it can never age out.
  // The thread stays dead until the workspace is reset. Was 2_000 against a
  // 700-token cap (~2,800 chars), so this was reachable in ordinary use.
  historyMessageCharacters: 3_000,
  contextCharacters: 12_000,
  contextRecords: 6,
  // Generation cap for chat. Lives here rather than as a literal in the Worker
  // because `historyMessageCharacters` is derived from it — see above.
  chatMaxTokens: 700,
  // Output ceilings. Legitimate replies are capped upstream at `chatMaxTokens`
  // (a few KiB); these bound a hostile or broken provider, per AGENTS.md:126-128.
  streamBytes: 256 * 1024,
  streamLineCharacters: 64 * 1024,
  streamEvents: 2_000,
  streamMilliseconds: 60_000,
  structuredBytes: 128 * 1024,
  structuredFieldCharacters: 4_000,
  structuredItems: 20,
} as const;

export type AIErrorCode =
  | "AI_SESSION_REQUIRED"
  | "AI_RATE_LIMITED"
  | "AI_QUOTA_EXHAUSTED"
  | "AI_NOT_CONFIGURED"
  | "AI_UNAVAILABLE"
  | "AI_BAD_RESPONSE"
  | "AI_VALIDATION_FAILED";

export interface AIErrorPayload {
  error: {
    code: AIErrorCode;
    message: string;
    requestId: string;
    retryAfter?: number;
  };
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIContextRecord {
  id: string;
  title: string;
  text: string;
}

export interface AICompletionMeta {
  requestId: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIStatus {
  configured: boolean;
  freeOnly: true;
  zeroDataRetention: true;
  dataCollection: "deny";
  sessionRequired: true;
  turnstileSiteKey: string | null;
}

export interface AISessionResult {
  ok: true;
  expiresIn: number;
}

export interface ChatRequest {
  message: string;
  history?: AIMessage[];
  context?: AIContextRecord[];
}

export interface AnalyzeRequest {
  content: string;
  section?: string;
  facts?: Record<string, string | number | boolean | null>;
  evidence?: AIContextRecord[];
}

export interface ExpandRequest {
  content: string;
  instructions?: string;
  context?: AIContextRecord[];
}

export interface EquityCheckRequest {
  content: string;
  metrics?: Record<string, string | number | boolean | null>;
  evidence?: AIContextRecord[];
}

export interface SocraticRequest {
  content: string;
  goal?: string;
  history?: AIMessage[];
}

export interface StructuredAIBase {
  insufficientData: boolean;
  evidenceIds: string[];
  meta: AICompletionMeta;
}

export interface AnalyzeResponse extends StructuredAIBase {
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}

export interface ExpandResponse extends StructuredAIBase {
  expandedText: string;
}

export interface EquityCheckResponse extends StructuredAIBase {
  findings: string[];
  gaps: string[];
  recommendations: string[];
}

export interface SocraticResponse extends StructuredAIBase {
  question: string;
  rationale: string;
}

export type StructuredAIResponse =
  | AnalyzeResponse
  | ExpandResponse
  | EquityCheckResponse
  | SocraticResponse;

export type ChatStreamEvent =
  | { type: "meta"; data: AICompletionMeta }
  | { type: "delta"; data: { text: string } }
  | { type: "done"; data: AICompletionMeta }
  | { type: "error"; data: AIErrorPayload["error"] };
