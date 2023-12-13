import { fileURLToPath } from "node:url";
import type * as aws from "@pulumi/aws";
import type { handler as healthcheckHandler } from "./endpoints/healthcheck.js";
import type { handler as loginGithubHandler } from "./endpoints/login/github.js";
import type { handler as meHandler } from "./endpoints/me.js";
import { APIGatewayProxyResult } from "aws-lambda";
import { deleteSessionCookieHeader } from "./auth.js";
import { getCommonHeaders } from "./index.js";

export class LambdaEndpoint<Handler> {
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

export class MockEndpoint {
  constructor(
    public opts: {
      method: string;
      getResponse: (frontendOrigin: string) => APIGatewayProxyResult;
    },
  ) {}
}

export interface Endpoints {
  [name: string]: MockEndpoint | LambdaEndpoint<unknown> | Endpoints;
}

export const endpoints = {
  healthcheck: new LambdaEndpoint<typeof healthcheckHandler>("healthcheck.ts"),
  login: {
    github: new LambdaEndpoint<typeof loginGithubHandler>("login/github.ts"),
  },
  logout: new MockEndpoint({
    method: "POST",
    getResponse: (frontendOrigin) => ({
      statusCode: 200,
      body: "{}",
      headers: {
        ...getCommonHeaders(frontendOrigin),
        ...deleteSessionCookieHeader(),
      },
    }),
  }),
  me: new LambdaEndpoint<typeof meHandler>("me.ts"),
} satisfies Endpoints;
