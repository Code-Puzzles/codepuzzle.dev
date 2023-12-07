import crypto from "node:crypto";
import type { APIGatewayProxyEvent } from "aws-lambda";
import * as cookie from "cookie";
import * as jwt from "jsonwebtoken";

import { ClientError } from "./lambda/common.js";
import { getParam } from "./parameters.js";
import { IS_DEV } from "./index.js";

export interface SessionJwtPayload {
  id: string;
  // TODO: Remove this and allow lookup by user ID in DB
  ghid: string;
  csrf: string;
}

const NOT_LOGGED_IN_ERROR = new ClientError("Not logged in", 401);
const JWT_ALGORITHM: jwt.Algorithm = "ES256";
const SESSION_JWT_COOKIE = "session";

export const generateSessionCookieHeader = async (
  userId: string,
  githubLoginId: string,
): Promise<Record<"Set-Cookie", string>> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);
  const jwt = await generateSessionJwt(userId, githubLoginId);
  return {
    "Set-Cookie": cookie.serialize(SESSION_JWT_COOKIE, jwt, {
      path: "/",
      httpOnly: true,
      sameSite: IS_DEV ? "lax" : "none",
      secure: !IS_DEV,
      expires: expiresAt,
    }),
  };
};

export const generateSessionJwt = async (
  userId: string,
  githubLoginId: string,
): Promise<string> => {
  const csrf = crypto.pseudoRandomBytes(12).toString("base64");
  const payload: SessionJwtPayload = { id: userId, ghid: githubLoginId, csrf };
  return jwt.sign(payload, await getParam("sessionJwtPrivateKey"), {
    algorithm: JWT_ALGORITHM,
    expiresIn: "90d",
  });
};

export const requireAuth = async (
  evt: APIGatewayProxyEvent,
): Promise<SessionJwtPayload> => {
  const cookieHeader = evt.headers["cookie"];
  if (!cookieHeader) throw NOT_LOGGED_IN_ERROR;
  const cookies = cookie.parse(cookieHeader);
  const token = cookies[SESSION_JWT_COOKIE];
  if (!token) throw NOT_LOGGED_IN_ERROR;
  const sessionJwtPublicKey = await getParam("sessionJwtPublicKey");
  try {
    const payload = jwt.verify(token, sessionJwtPublicKey, {
      algorithms: [JWT_ALGORITHM],
    }) as SessionJwtPayload;
    return payload;
  } catch (err) {
    throw new ClientError(`Failed to verify session token: ${err}`);
  }
};
