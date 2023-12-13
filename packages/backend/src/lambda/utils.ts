import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export type LambdaHandler = (
  evt: APIGatewayProxyEvent,
) => Promise<APIGatewayProxyResult>;

export const IS_DEV = process.env["IS_DEV"];

export const getCorsHeaders = (origin: string): Record<string, string> => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
});

export const getCommonHeaders = (origin: string): Record<string, string> => ({
  "Content-Type": "application/json",
  ...getCorsHeaders(origin),
});

export const normalizeHeaders = (evt: APIGatewayProxyEvent) => {
  evt.headers = Object.fromEntries(
    Object.entries(evt.headers).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );
};
