/** ANSI: orange (256 color 208), then reset. Exported for tests. */
export const EXO_PREFIX = "\x1b[38;5;208m[exo]\x1b[0m ";
const PREFIX = EXO_PREFIX;

let rawStdoutWrite: NodeJS.WriteStream["write"] | null = null;
let rawStderrWrite: NodeJS.WriteStream["write"] | null = null;

/** Return raw stream writes (before wrap) for the shared logger so output has a single prefix. */
export function getRawWrites(): {
  stdout: NodeJS.WriteStream["write"];
  stderr: NodeJS.WriteStream["write"];
} {
  return {
    stdout: rawStdoutWrite ?? process.stdout.write.bind(process.stdout),
    stderr: rawStderrWrite ?? process.stderr.write.bind(process.stderr),
  };
}

type Encoding = BufferEncoding | ((err?: Error) => void);
type WriteCallback = (err?: Error) => void;

function isEncoding(x: Encoding | undefined): x is BufferEncoding {
  return typeof x === "string";
}

/** Exported for tests. */
export function createPrefixedWrite(
  stream: NodeJS.WriteStream,
  getPrefix: () => string
): NodeJS.WriteStream["write"] {
  const originalWrite = stream.write.bind(stream);
  let buffer = "";

  function flushIncomplete() {
    if (buffer.length > 0) {
      originalWrite(getPrefix() + buffer);
      buffer = "";
    }
  }

  const write: NodeJS.WriteStream["write"] = function (
    chunk: string | Buffer | Uint8Array,
    encodingOrCallback?: Encoding,
    callback?: WriteCallback
  ): boolean {
    const encoding: BufferEncoding | undefined = isEncoding(encodingOrCallback)
      ? encodingOrCallback
      : undefined;
    const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    const str = typeof chunk === "string" ? chunk : chunk.toString(encoding ?? "utf8");
    buffer += str;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      originalWrite(getPrefix() + line + "\n", encoding as BufferEncoding);
    }
    if (typeof cb === "function") cb();
    return true;
  };

  (write as { flush?: () => void }).flush = flushIncomplete;
  return write;
}

/**
 * Wraps process.stdout and process.stderr so each line is prefixed with colored "[exo]".
 * Call before running rsbuild dev/build so users see exo output.
 * Original rsbuild output is preserved line-by-line.
 */
export function wrapExtenzoOutput(): void {
  rawStdoutWrite = process.stdout.write.bind(process.stdout);
  rawStderrWrite = process.stderr.write.bind(process.stderr);

  const prefix = () => PREFIX;
  const stdoutWrite = createPrefixedWrite(process.stdout, prefix);
  const stderrWrite = createPrefixedWrite(process.stderr, prefix);

  (process.stdout as NodeJS.WriteStream & { write: NodeJS.WriteStream["write"] }).write = stdoutWrite;
  (process.stderr as NodeJS.WriteStream & { write: NodeJS.WriteStream["write"] }).write = stderrWrite;

  const flush = () => {
    const fOut = (stdoutWrite as { flush?: () => void }).flush;
    const fErr = (stderrWrite as { flush?: () => void }).flush;
    if (fOut) fOut();
    if (fErr) fErr();
  };

  process.once("exit", flush);
}
