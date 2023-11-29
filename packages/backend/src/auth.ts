import crypto from "node:crypto";
import type { APIGatewayProxyEvent } from "aws-lambda";
import * as cookie from "cookie";
import * as jwt from "jsonwebtoken";

import { ClientError } from "./lambda-utils.js";

interface SessionJwtPayload {
  id: string;
  csrf: string;
}

const NOT_LOGGED_IN_ERROR = new ClientError("Not logged in", 401);

const ALGORITHM: jwt.Algorithm = "ES256";

export const SESSION_JWT_COOKIE = "session";

export const generateSessionJwt = (
  privateKeyPem: string,
  userId: string,
): string => {
  const csrf = crypto.pseudoRandomBytes(8).toString("base64").replace(/=$/, "");
  const payload: SessionJwtPayload = { id: userId, csrf };
  return jwt.sign(payload, privateKeyPem, {
    algorithm: ALGORITHM,
    expiresIn: "90d",
  });
};

export const requireAuth = async (
  publicKeyPem: string,
  evt: APIGatewayProxyEvent,
): Promise<SessionJwtPayload> => {
  if (!evt.headers["cookie"]) throw NOT_LOGGED_IN_ERROR;
  const cookies = cookie.parse(evt.headers["cookie"]);
  const token = cookies[SESSION_JWT_COOKIE];
  if (!token) throw NOT_LOGGED_IN_ERROR;
  try {
    const payload = jwt.verify(token, publicKeyPem, {
      algorithms: [ALGORITHM],
    }) as SessionJwtPayload;
    return payload;
  } catch (err) {
    throw new ClientError(`Session token: ${err}`);
  }
};
