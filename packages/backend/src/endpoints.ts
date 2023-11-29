import { fileURLToPath } from "node:url";
import type { handler as healthcheckHandler } from "./endpoints/healthcheck.js";
import type { handler as loginGithubHandler } from "./endpoints/login/github.js";
import type { handler as judgeHandler } from "./endpoints/judge.js";

interface EndpointShape<Handler> {
  __handlerType: Handler;
  path: string;
}

const defineEndpoint = <Handler>(
  relativePath: string,
): EndpointShape<Handler> =>
  ({
    path: fileURLToPath(
      new URL(`./endpoints/${relativePath}`, import.meta.url),
    ),
  }) as any;

export const endpoints = {
  healthcheck: defineEndpoint<typeof healthcheckHandler>("healthcheck.ts"),
  login: {
    github: defineEndpoint<typeof loginGithubHandler>("login/github.ts"),
  },
  judge: defineEndpoint<typeof judgeHandler>("judge.ts"),
};
