import { z } from "zod";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LOG_PREFIX } from "@jspuzzles/common";

export const lambdaHandler =
  <Body>(
    bodyShape: z.ZodType<Body>,
    handler: (body: Body, event: APIGatewayProxyEvent) => Promise<unknown>,
  ) =>
  async (evt: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let body: Body;
    try {
      const bodyText = evt.isBase64Encoded
        ? Buffer.from(evt.body!, "base64").toString()
        : evt.body!;
      body = bodyShape.parse(JSON.parse(bodyText));
    } catch (err) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: String(err) }),
      };
    }

    try {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await handler(body, evt)),
      };
    } catch (err) {
      if (err instanceof ClientError) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: String(err) }),
        };
      }

      console.error("Uncaught error:", err);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  };

export class ClientError extends Error {}

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
