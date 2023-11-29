import { defineTable } from "./util/table.js";

export const mainTable = defineTable({
  name: "main",
  attributes: {
    pk0: "S",
    sk0: "S",
  },
  index: {
    hashKey: "pk0",
    rangeKey: "sk0",
  },
});
