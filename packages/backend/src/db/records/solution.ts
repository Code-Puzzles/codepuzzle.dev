import { z } from "zod";
import { mappedRecord } from "../util/record.js";
import { mainTable } from "../table.js";

export const buildSolutionKey = (userId: string) =>
  ["USER", userId, "SOLUTION"].join("/");

export class Solution extends mappedRecord<Solution>()(
  mainTable,
  z.object({
    pk0: z.string().startsWith("USER/").endsWith("/SOLUTION"),
    sk0: z.string(),
    code: z.string(),
  }),
)((record) => {
  const [, userId] = record.pk0.split("/");
  return {
    userId: userId!,
    puzzleId: record.sk0,
    code: record.code,
  };
})({
  toRecord: (value) => ({
    pk0: buildSolutionKey(value.userId),
    sk0: value.puzzleId,
    code: value.code,
  }),
}) {}
