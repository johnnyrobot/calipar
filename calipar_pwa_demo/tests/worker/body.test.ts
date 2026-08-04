import { describe, expect, it } from "vitest";

import { BodyInvalid, BodyTooLarge, readBoundedJson, readBoundedText } from "../../worker/body";

const MAX = 1024;

function jsonRequest(body: BodyInit | null, headers: Record<string, string> = {}): Request {
  return new Request("https://calipar.example/api/ai/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

function streamRequest(body: ReadableStream<Uint8Array>): Request {
  return new Request("https://calipar.example/api/ai/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // @ts-expect-error duplex is required for a stream body and absent from lib.dom
    duplex: "half",
  });
}

describe("readBoundedJson", () => {
  it("parses a small object", async () => {
    const value = await readBoundedJson(jsonRequest(JSON.stringify({ a: 1 })), MAX);
    expect(value).toEqual({ a: 1 });
  });

  it("rejects a declared oversize body without reading it", async () => {
    await expect(
      readBoundedJson(
        jsonRequest(JSON.stringify({ a: 1 }), { "Content-Length": String(MAX + 1) }),
        MAX,
      ),
    ).rejects.toBeInstanceOf(BodyTooLarge);
  });

  it("stops reading an undeclared oversize body partway through", async () => {
    // 100 chunks of 1 KiB with no Content-Length: the old code buffered all of it.
    let pulled = 0;
    const chunk = new Uint8Array(1024).fill(97);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled >= 100) return controller.close();
        pulled += 1;
        controller.enqueue(chunk);
      },
    });
    await expect(readBoundedJson(streamRequest(stream), MAX)).rejects.toBeInstanceOf(
      BodyTooLarge,
    );
    // The reader stopped early — this is the assertion that makes the fix
    // falsifiable. "It didn't crash" is not a signal for a memory bug.
    expect(pulled).toBeLessThan(100);
  });

  it("accepts a body exactly at the limit", async () => {
    const padding = "x".repeat(MAX - 8); // {"a":""} framing is 8 bytes
    const body = JSON.stringify({ a: padding });
    expect(new TextEncoder().encode(body).byteLength).toBe(MAX);
    expect(await readBoundedJson(jsonRequest(body), MAX)).toEqual({ a: padding });
  });

  it("rejects a wrong content type with 415", async () => {
    await expect(
      readBoundedJson(jsonRequest("x", { "Content-Type": "text/plain" }), MAX),
    ).rejects.toMatchObject({ status: 415 });
  });

  it("rejects malformed JSON with 400", async () => {
    await expect(readBoundedJson(jsonRequest("{"), MAX)).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a JSON array with 400", async () => {
    await expect(readBoundedJson(jsonRequest("[1,2]"), MAX)).rejects.toMatchObject({
      status: 400,
    });
  });

  it("rejects an absent body with 400", async () => {
    await expect(readBoundedJson(jsonRequest(null), MAX)).rejects.toMatchObject({ status: 400 });
  });

  it("handles a multi-byte character split across chunks", async () => {
    const text = new TextEncoder().encode(JSON.stringify({ a: "café" }));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(text.slice(0, 10));
        controller.enqueue(text.slice(10));
        controller.close();
      },
    });
    expect(await readBoundedJson(streamRequest(stream), MAX)).toEqual({ a: "café" });
  });

  it("rejects a body whose bytes exceed the limit even when Content-Length is honest", async () => {
    await expect(readBoundedJson(jsonRequest("x".repeat(MAX + 50)), MAX)).rejects.toBeInstanceOf(
      BodyTooLarge,
    );
  });
});

describe("readBoundedText", () => {
  it("reads a small response", async () => {
    expect(await readBoundedText(new Response("hello"), MAX)).toBe("hello");
  });

  it("stops reading an oversize response partway through", async () => {
    let pulled = 0;
    const chunk = new Uint8Array(1024).fill(98);
    const flood = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled += 1;
        controller.enqueue(chunk);
      },
    });
    await expect(readBoundedText(new Response(flood), MAX)).rejects.toBeInstanceOf(BodyTooLarge);
    expect(pulled).toBeLessThan(10);
  });

  it("rejects a response with no body", async () => {
    await expect(readBoundedText(new Response(null, { status: 204 }), MAX)).rejects.toBeInstanceOf(
      BodyTooLarge,
    );
  });

  it("handles a multi-byte character split across chunks", async () => {
    const text = new TextEncoder().encode('{"a":"café"}');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(text.slice(0, 10));
        controller.enqueue(text.slice(10));
        controller.close();
      },
    });
    expect(await readBoundedText(new Response(stream), MAX)).toBe('{"a":"café"}');
  });
});

describe("BodyInvalid", () => {
  it("carries the status it was constructed with", () => {
    expect(new BodyInvalid("nope", 415).status).toBe(415);
    expect(new BodyTooLarge().status).toBe(413);
  });
});
