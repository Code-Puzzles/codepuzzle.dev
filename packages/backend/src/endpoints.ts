import { fileURLToPath } from "node:url";
import type * as aws from "@pulumi/aws";
import type { handler as healthcheckHandler } from "./endpoints/healthcheck.js";
import type { handler as loginGithubHandler } from "./endpoints/login/github.js";
import type { handler as judgeHandler } from "./endpoints/judge.js";

export class Endpoint<Handler> {
  __handlerType!: Handler;
  path: string;
  constructor(
    public relativePath: string,
    public opts: Partial<aws.lambda.FunctionArgs> = {},
  ) {
    this.path = fileURLToPath(
      new URL(`./endpoints/${relativePath}`, import.meta.url),
    );
  }
}

export interface Endpoints {
  [name: string]: Endpoint<unknown> | Endpoints;
}

export const endpoints = {
  healthcheck: new Endpoint<typeof healthcheckHandler>("healthcheck.ts"),
  login: {
    github: new Endpoint<typeof loginGithubHandler>("login/github.ts"),
  },
  judge: new Endpoint<typeof judgeHandler>("judge.ts"),
} satisfies Endpoints;
