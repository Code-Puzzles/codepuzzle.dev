import { z } from "zod";
import { lambdaHandler } from "../lambda/handler.js";
import { getUserByLogin } from "../db/queries.js";

const meOptsShape = z.object({});

export type HealthcheckOpts = z.TypeOf<typeof meOptsShape>;

export const handler = lambdaHandler({
  bodyShape: meOptsShape,
  async handler(_opts, ctx) {
    const user = await getUserByLogin("GITHUB", ctx.session.ghid);
    return {
      body: { user },
    };
  },
});
