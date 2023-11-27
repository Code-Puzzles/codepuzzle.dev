import { z } from "zod";

export const JudgeResultSchema = z.object({
  passed: z.boolean(),
  value: z.string().optional(),
  error: z.string().optional(),
});
export type JudgeResult = z.infer<typeof JudgeResultSchema>;

export const JudgeResultWithCountSchema = JudgeResultSchema.extend({
  numChars: z.number(),
});
export type JudgeResultWithCount = z.infer<typeof JudgeResultWithCountSchema>;

export type UserState = Record<
  string,
  {
    /**
     * Only set when a solution exists
     */
    charCount?: number;
  }
>;
