import { z } from "zod";
import { JudgeOpts, judge } from "./judge";
import { lambdaHandler } from "./lambda-utils";

const judgeOptsShape: z.ZodType<JudgeOpts> = z.object({
  puzzleSource: z.string(),
  puzzleName: z.string(),
  solution: z.string(),
});

export const handler = lambdaHandler(judgeOptsShape, async (opts) => {
  console.log("==== opts", opts);
  return judge(opts);
});
