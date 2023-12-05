import {
  LambdaHandler,
  getCorsHeaders,
  normalizeHeaders,
} from "../lambda/utils.js";

export const handler: LambdaHandler = async (evt) => {
  normalizeHeaders(evt);
  return {
    statusCode: 200,
    headers: getCorsHeaders(evt),
    body: "",
  };
};
