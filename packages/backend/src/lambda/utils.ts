import { FRONTEND_BASE_URL } from "@jspuzzles/common";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export type LambdaHandler = (
  evt: APIGatewayProxyEvent,
) => Promise<APIGatewayProxyResult>;

const FRONTEND_ORIGIN = new URL(FRONTEND_BASE_URL).origin;

export const IS_DEV = process.env["IS_DEV"];

export const getCorsHeaders = (
  evt: Pick<APIGatewayProxyEvent, "headers">,
  isDev = !!IS_DEV,
): Record<string, string> => ({
  "Access-Control-Allow-Origin": isDev
    ? evt.headers["origin"] ?? "http://localhost:5173"
    : FRONTEND_ORIGIN,
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
