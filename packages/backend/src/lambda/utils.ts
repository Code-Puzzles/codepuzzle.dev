import { z } from "zod";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type * as aws from "@pulumi/aws";
import { LOG_PREFIX } from "@jspuzzles/common";
import { SessionJwtPayload, requireAuth } from "../auth.js";
import { ClientError } from "./common.js";

export type LambdaHandler = (
  evt: APIGatewayProxyEvent,
) => Promise<APIGatewayProxyResult>;

export interface HandlerContext<IsUnauthenticated extends boolean> {
  session:
    | SessionJwtPayload
    | (IsUnauthenticated extends true ? undefined : never);
  event: APIGatewayProxyEvent;
}

export interface LambdaOpts<
  InputBody,
  OutputBody,
  IsUnauthenticated extends boolean,
> {
  isUnauthenticated?: IsUnauthenticated;
  bodyShape: z.ZodType<InputBody>;
  infra?: Partial<aws.lambda.FunctionArgs>;
  handler: (
    body: InputBody,
    context: HandlerContext<IsUnauthenticated>,
  ) => Promise<{
    statusCode?: number;
    headers?: Record<string, string>;
    body: OutputBody;
  }>;
}

export const IS_DEV = process.env["IS_DEV"];

const getCommonHeaders = (
  evt: APIGatewayProxyEvent,
): Record<string, string> => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": IS_DEV
    ? evt.headers["origin"] ?? "http://localhost:5173"
    : "TODO",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
});

const normalizeHeaders = (evt: APIGatewayProxyEvent) => {
  evt.headers = Object.fromEntries(
    Object.entries(evt.headers).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );
};

export const lambdaHandler = <
  InputBody,
  OutputBody,
  IsUnauthenticated extends boolean = false,
>(
  opts: LambdaOpts<InputBody, OutputBody, IsUnauthenticated>,
): LambdaHandler & {
  __inputBody: InputBody;
  __outputBody: OutputBody;
} => {
  const innerHandler: LambdaHandler = async (evt) => {
    normalizeHeaders(evt);

    let body: InputBody;
    try {
      const bodyText = evt.isBase64Encoded
        ? Buffer.from(evt.body!, "base64").toString()
        : evt.body!;
      body = opts.bodyShape.parse(JSON.parse(bodyText));
    } catch (err) {
      return {
        statusCode: 400,
        headers: getCommonHeaders(evt),
        body: JSON.stringify({ error: String(err) }),
      };
    }

    try {
      const session = await getSession(evt, opts.isUnauthenticated);
      const result = await opts.handler(body, {
        session: session as any,
        event: evt,
      });
      return {
        statusCode: result.statusCode ?? 200,
        headers: { ...getCommonHeaders(evt), ...result.headers },
        body: JSON.stringify(result.body),
      };
    } catch (err) {
      if (err instanceof ClientError) {
        return {
          statusCode: err.statusCode ?? 400,
          headers: getCommonHeaders(evt),
          body: JSON.stringify({ error: String(err) }),
        };
      }

      console.error("Uncaught error:", err);
      return {
        statusCode: 500,
        headers: getCommonHeaders(evt),
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  };
  return innerHandler as any;
};

const getSession = async (
  evt: APIGatewayProxyEvent,
  isUnauthenticated?: boolean,
) => {
  try {
    return await requireAuth(evt);
  } catch (err) {
    if (isUnauthenticated) return undefined;
    throw err;
  }
};

export const withTimeout = <T>(
  operationName: string,
  ms: number,
  func: () => Promise<T>,
) =>
  new Promise<T>((resolve, reject) => {
    console.log(`${LOG_PREFIX} Operation:`, operationName);
    console.time(`${LOG_PREFIX}${operationName}`);
    const timeout = setTimeout(
      () =>
        reject(
          new Error(`${LOG_PREFIX} Operation timed out: ${operationName}`),
        ),
      ms,
    );
    func()
      .then(resolve, reject)
      .finally(() => {
        clearTimeout(timeout);
        console.timeEnd(`${LOG_PREFIX}${operationName}`);
      });
  });
