import { fileURLToPath } from "node:url";
import type * as aws from "@pulumi/aws";
import type { handler as healthcheckHandler } from "./endpoints/healthcheck.js";
import type { handler as loginGithubHandler } from "./endpoints/login/github.js";

export class Endpoint<Handler> {
  __handlerType!: Handler;
  path: string;
  constructor(
    public relativePath: string,
    public opts: Partial<aws.lambda.FunctionArgs & { method: string }> = {},
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
} satisfies Endpoints;
