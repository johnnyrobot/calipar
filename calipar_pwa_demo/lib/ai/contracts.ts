export const AI_LIMITS = {
  bodyBytes: 64 * 1024,
  promptCharacters: 4_000,
  historyMessages: 10,
  historyMessageCharacters: 2_000,
  contextCharacters: 12_000,
  contextRecords: 6,
  // Output ceilings. Legitimate replies are capped upstream at max_tokens 700
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
