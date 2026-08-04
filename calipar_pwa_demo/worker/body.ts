export class BodyTooLarge extends Error {
  readonly status = 413 as const;
  constructor(message = "The AI request is too large.") {
    super(message);
    this.name = "BodyTooLarge";
  }
}

export class BodyInvalid extends Error {
  constructor(
    message: string,
    readonly status: 400 | 415,
  ) {
    super(message);
    this.name = "BodyInvalid";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Read a byte stream to text with the ceiling enforced *during* the read,
 * cancelling the source as soon as it is passed. Decoding is incremental so a
 * multi-byte character straddling two chunks survives.
 */
async function readBounded(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
  overflow: () => BodyTooLarge,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let received = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw overflow();
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return text;
}

/**
 * Read a JSON body with the byte ceiling enforced during the read. The previous
 * implementation buffered the whole body via `request.text()` and measured
 * afterwards, so a body with no Content-Length — chunked transfer encoding — was
 * fully resident before it could be rejected, on the public pre-session route.
 */
export async function readBoundedJson(
  request: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  const type = request.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!type.startsWith("application/json")) {
    throw new BodyInvalid("Content-Type must be application/json.", 415);
  }

  const declared = request.headers.get("Content-Length");
  if (declared !== null && Number(declared) > maxBytes) throw new BodyTooLarge();

  if (!request.body) throw new BodyInvalid("The request body is missing.", 400);

  const text = await readBounded(request.body, maxBytes, () => new BodyTooLarge());

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new BodyInvalid("The request body is not valid JSON.", 400);
  }
  if (!isObject(value)) {
    throw new BodyInvalid("The request body must be a JSON object.", 400);
  }
  return value;
}

/**
 * The same bound applied to an upstream provider response. `response.json()`
 * has no ceiling, so a hostile or broken provider could grow the Worker's
 * memory without limit on the structured path.
 */
export async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) throw new BodyTooLarge("The AI provider returned no body.");
  return readBounded(
    response.body,
    maxBytes,
    () => new BodyTooLarge("The AI response exceeded its size limit."),
  );
}
