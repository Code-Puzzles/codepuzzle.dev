import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export type LambdaHandler = (
  evt: APIGatewayProxyEvent,
) => Promise<APIGatewayProxyResult>;

export const IS_DEV = process.env["IS_DEV"];

export const getCorsHeaders = (
  evt: APIGatewayProxyEvent,
): Record<string, string> => ({
  "Access-Control-Allow-Origin": IS_DEV
    ? evt.headers["origin"] ?? "http://localhost:5173"
    : "TODO",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
});

export const getCommonHeaders = (
  evt: APIGatewayProxyEvent,
): Record<string, string> => ({
  "Content-Type": "application/json",
  ...getCorsHeaders(evt),
});

export const normalizeHeaders = (evt: APIGatewayProxyEvent) => {
  evt.headers = Object.fromEntries(
    Object.entries(evt.headers).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );
};
