import { z } from "zod";
import { LOG_PREFIX } from "@codepuzzles/common";
import { lambdaHandler } from "../lambda/handler.js";

const healthcheckOptsShape = z.object({});

export type HealthcheckOpts = z.TypeOf<typeof healthcheckOptsShape>;

export const handler = lambdaHandler({
  isUnauthenticated: true,
  bodyShape: healthcheckOptsShape,
  async handler(opts) {
    console.log(`${LOG_PREFIX} opts`, opts);

    return { body: { status: "Good" } };
  },
});
