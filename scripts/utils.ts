import { ChildProcess } from "node:child_process";
import {
  Duplex,
  Readable,
  Transform,
  TransformCallback,
  TransformOptions,
  Writable,
} from "node:stream";
import chalk, { ColorName } from "chalk";

export class LinePrefixer extends Transform {
  isAtLineStart = true;

  constructor(
    public prefix: string,
    options?: TransformOptions,
  ) {
    super(options);
  }

  override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    const chunkStr = chunk.toString();
    const output =
      (this.isAtLineStart && chunkStr.length >= 1 ? this.prefix : "") +
      chunkStr.replace(/(\n)(?=.)/g, `$1${this.prefix}`);
    if (chunkStr.length >= 1) {
      this.isAtLineStart = chunkStr[chunkStr.length - 1] === "\n";
    }
    callback(null, output);
  }
}

export class LineMapper extends Transform {
  line = "";

  constructor(
    public mapper: (line: string) => string | null | undefined,
    options?: TransformOptions,
  ) {
    super(options);
  }

  override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    const lineParts = chunk.toString().split("\n");
    this.line += lineParts[0];
    for (let i = 1; i < lineParts.length; i++) {
      const result = this.mapper(this.line);
      if (result) this.push(result + "\n");
      this.line = lineParts[i];
    }
    callback();
  }
}

export const localstackLogCleaner = () =>
  new LineMapper((line) => {
    const trimmed = line.replace(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\s+(\w+)\s+[^:]+: /,
      "[$1] ",
    );
    const trimmedWithoutNonLambdaDebugLogs = trimmed.replace(
      /^\[DEBUG\]\s+(?:>\s+(?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\s+)?(.*)|.*)$/,
      "$1",
    );
    return trimmedWithoutNonLambdaDebugLogs;
  });

export const createPrefixedOutputStream = (
  prefix: string,
  out: Writable = process.stdout,
) => {
  const stream = new LinePrefixer(prefix);
  stream.pipe(out);
  return stream;
};

export const prefixProcessOutput = (
  proc: { stdout?: Readable | null; stderr?: Readable | null },
  prefix: string,
  color: ColorName,
) => {
  proc.stdout?.pipe(createPrefixedOutputStream(chalk[color](prefix)));

  proc.stderr?.pipe(
    createPrefixedOutputStream(chalk.red(prefix), process.stderr),
  );
};
