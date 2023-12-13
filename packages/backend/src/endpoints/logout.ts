import { deleteSessionCookieHeader } from "../auth.js";
import { LambdaHandler, normalizeHeaders } from "../lambda/utils.js";

export const handler: LambdaHandler = async (evt) => {
  normalizeHeaders(evt);
  return {
    statusCode: 200,
    headers: deleteSessionCookieHeader(),
    body: "",
  };
};
