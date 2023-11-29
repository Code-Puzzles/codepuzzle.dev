import { z } from "zod";
import { LOG_PREFIX } from "@jspuzzles/common";
import { lambdaHandler } from "../lambda-utils.js";

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
