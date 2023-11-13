import { z } from "zod";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const lambdaHandler =
  <Body>(
    bodyShape: z.ZodType<Body>,
    handler: (body: Body, event: APIGatewayProxyEvent) => Promise<unknown>,
  ) =>
  async (evt: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let body: Body;
    try {
      body = bodyShape.parse(
        JSON.parse(Buffer.from(evt.body!, "base64").toString()),
      );
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
      console.error("Uncaught error:", err);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  };

export const withTimeout = <T>(
  operationName: string,
  ms: number,
  func: () => Promise<T>,
) =>
  new Promise<T>((resolve, reject) => {
    console.log("Operation:", operationName);
    console.time(operationName);
    const timeout = setTimeout(
      () => reject(new Error(`Operation timed out: ${operationName}`)),
      ms,
    );
    func()
      .then(resolve, reject)
      .finally(() => {
        clearTimeout(timeout);
        console.timeEnd(operationName);
      });
  });
