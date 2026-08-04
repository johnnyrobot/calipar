"use client";

import { Turnstile } from "@marsidev/react-turnstile";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Modal } from "@/components/modal";
import { useWorkspace } from "@/components/workspace-provider";
import {
  AIClientError,
  createAISession,
  getAIStatus,
  streamChat,
  type AIStatus,
} from "@/lib/ai/client";
import { addChatMessage, addChatThread } from "@/lib/db/repository";
import type { ChatMessage } from "@/lib/domain/types";

const starterQuestions = [
  "What pattern should I notice in the latest synthetic outcomes?",
  "Help me make an action plan more specific and measurable.",
  "What questions should I ask before interpreting an equity gap?",
];

export default function ChatPage() {
  const { state } = useWorkspace();
  const data = state.status === "ready" ? state.data : null;
  const derived = state.status === "ready" ? state.derived : null;
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [streamed, setStreamed] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    void getAIStatus().then((next) => {
      if (active) setStatus(next);
    }).catch((cause: unknown) => {
      if (active) setStatusError(cause instanceof Error ? cause.message : "Mission-Bot status is unavailable.");
    });
    return () => { active = false; };
  }, []);

  // The one context value. The disclosure below renders this, and `send`
  // transmits this — so what the panel claims Mission-Bot can see cannot drift
  // from what actually leaves the browser. AGENTS.md requires that disclosure.
  const aiContext = useMemo(
    () =>
      (derived?.reviews ?? []).slice(0, 3).map((review) => ({
        id: review.id,
        title: review.title,
        text: `${review.academicYear}; ${review.status}; completed sections: ${review.completeSections}/${review.requiredSections}`,
      })),
    [derived],
  );

  const thread = data?.chatThreads[0];
  const messages = useMemo(
    () => data && thread ? data.chatMessages.filter((item) => item.threadId === thread.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)) : [],
    [data, thread],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamed]);

  const verify = async (token: string) => {
    if (!consent) return;
    setSessionBusy(true);
    setError("");
    try {
      await createAISession(token);
      setSessionReady(true);
      setConsentOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The AI session could not be verified.");
    } finally {
      setSessionBusy(false);
    }
  };

  const ensureThread = async () => {
    if (thread) return thread;
    const now = new Date().toISOString();
    return addChatThread({
      id: crypto.randomUUID(),
      title: "Demo planning conversation",
      createdAt: now,
      updatedAt: now,
    });
  };

  const send = async (override?: string) => {
    const text = (override ?? prompt).trim();
    if (!text || sending || !data) return;
    if (!navigator.onLine) {
      setError("Mission-Bot needs a network connection. Your prompt remains here.");
      return;
    }
    if (!sessionReady) {
      setConsentOpen(true);
      return;
    }
    const activeThread = await ensureThread();
    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      threadId: activeThread.id,
      role: "user",
      content: text,
      model: null,
      requestId: null,
      createdAt: now,
    };
    await addChatMessage(userMessage);
    setPrompt("");
    setSending(true);
    setStreamed("");
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    let answer = "";
    try {
      const meta = await streamChat(
        {
          message: text,
          history: messages.slice(-8).map((item) => ({ role: item.role, content: item.content })),
          context: aiContext,
        },
        {
          onMeta: (value) => setModel(value.model),
          onDelta: (chunk) => {
            answer += chunk;
            setStreamed(answer);
          },
        },
        controller.signal,
      );
      if (answer.trim()) {
        await addChatMessage({
          id: crypto.randomUUID(),
          threadId: activeThread.id,
          role: "assistant",
          content: answer,
          model: meta.model,
          requestId: meta.requestId,
          createdAt: new Date().toISOString(),
        });
      }
      setStreamed("");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setError("Generation stopped. The partial response was not saved.");
      } else {
        if (cause instanceof AIClientError && cause.code === "AI_SESSION_REQUIRED") setSessionReady(false);
        setError(cause instanceof Error ? cause.message : "Mission-Bot is temporarily unavailable.");
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  if (!data) return null;
  const aiAvailable = status?.configured && !statusError;

  return (
    <div className="chat-page">
      <header className="chat-header">
        <div className="mission-avatar"><Icon name="spark" /></div>
        <div>
          <p className="eyebrow">DEMO PLANNING & WRITING ASSISTANT</p>
          <h1>Mission-Bot</h1>
          <p>Grounded in the synthetic records you deliberately include—not an authoritative policy source.</p>
        </div>
        <span className={`ai-status ${aiAvailable ? "available" : ""}`} data-testid="missionbot-status">
          <i /> {statusError ? "Status unavailable" : status === null ? "Checking…" : status.configured ? "Free AI ready" : "Not configured"}
        </span>
      </header>
      <div className="chat-layout">
        <section className="conversation" aria-label="Mission-Bot conversation">
          <div className="conversation-scroll" aria-live="polite">
            {!messages.length ? (
              <div className="chat-welcome">
                <span className="brand-mark brand-mark-large" aria-hidden="true"><i /><i /><i /></span>
                <p className="eyebrow">CHART A THOUGHTFUL COURSE</p>
                <h2>What are you trying to understand?</h2>
                <p>Select a starting point, or ask about the synthetic review workspace in your own words.</p>
                <div>{starterQuestions.map((question) => <button key={question} type="button" onClick={() => { setPrompt(question); if (!sessionReady) setConsentOpen(true); }}>{question}<Icon name="arrow" /></button>)}</div>
              </div>
            ) : null}
            {messages.map((message) => (
              <article className={`message ${message.role}`} key={message.id}>
                <span>{message.role === "assistant" ? <Icon name="spark" /> : "YOU"}</span>
                <div data-testid={message.role === "assistant" ? "missionbot-response" : undefined}>
                  <p>{message.content}</p>
                  {message.role === "assistant" && message.model ? <small>{message.model} · AI-generated; verify before use</small> : null}
                </div>
              </article>
            ))}
            {streamed ? <article className="message assistant"><span><Icon name="spark" /></span><div data-testid="missionbot-response"><p>{streamed}<i className="typing-cursor" /></p><small>{model || "Free model"} · generating</small></div></article> : null}
            {error ? <div className="chat-error" role="alert"><Icon name="warning" /><span>{error}</span></div> : null}
            <div ref={endRef} />
          </div>
          <div className="composer">
            <label>
              <span className="sr-only">Ask Mission-Bot</span>
              <textarea
                data-testid="missionbot-prompt"
                disabled={!aiAvailable || sending}
                maxLength={4000}
                placeholder={aiAvailable ? "Ask about a review, outcome, or next step…" : "Mission-Bot is unavailable; local workflows still work."}
                rows={2}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
            </label>
            {sending ? <button aria-label="Stop generation" className="send-button stop" type="button" onClick={() => abortRef.current?.abort()}><span /></button> : <button aria-label="Send to Mission-Bot" className="send-button" data-testid="missionbot-send" disabled={!prompt.trim() || !aiAvailable} type="button" onClick={() => void send()}><Icon name="arrow" /></button>}
            <small>Only this prompt and selected context leave your browser.</small>
          </div>
        </section>
        <aside className="chat-context">
          <p className="eyebrow">CONTEXT BOUNDARY</p>
          <h2>What Mission-Bot can see</h2>
          <p>Up to three review summaries are included with a question. Full narratives and the rest of your workspace are not sent automatically.</p>
          <ul>{aiContext.map((item) => <li key={item.id}><Icon name="review" /><span>{item.title}<small>{item.text}</small></span></li>)}</ul>
          <div className="privacy-note"><Icon name="compass" /><p><strong>Strict privacy route</strong>Free-only, zero-data-retention endpoints are required. If none are available, AI stops.</p></div>
        </aside>
      </div>
      <Modal open={consentOpen} title="Before Mission-Bot begins" description="AI is optional. Your local workspace remains fully usable without it." onClose={() => setConsentOpen(false)}>
        <div className="ai-consent-copy">
          <p>Prompts and selected context pass through this site’s Cloudflare Worker to OpenRouter and a compatible free model provider. CALIPAR does not store them server-side.</p>
          <label className="check-field"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>I understand the AI boundary</strong><small>I will not submit student-level, confidential, or regulated information, and I will review generated content.</small></span></label>
          {consent && status?.turnstileSiteKey ? <div className="turnstile-box"><Turnstile siteKey={status.turnstileSiteKey} options={{ theme: "light", size: "flexible" }} onSuccess={(token) => void verify(token)} /></div> : null}
          {consent && !status?.turnstileSiteKey ? <p className="form-error">Turnstile has not been configured for this deployment.</p> : null}
          {sessionBusy ? <p role="status">Verifying a short-lived anonymous AI session…</p> : null}
        </div>
      </Modal>
    </div>
  );
}
