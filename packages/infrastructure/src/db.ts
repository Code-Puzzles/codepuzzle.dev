import * as aws from "@pulumi/aws";

import { mainTable, AnyDbTable } from "@codepuzzles/backend";

export const createTable = (table: AnyDbTable) =>
  new aws.dynamodb.Table("main-table", {
    name: table.name,
    billingMode: "PAY_PER_REQUEST",
    hashKey: table.index.hashKey,
    rangeKey: table.index.rangeKey,
    attributes: Object.entries(table.attributes).map(([name, type]) => ({
      name,
      type,
    })),
    globalSecondaryIndexes:
      table.globalSecondaryIndexes &&
      Object.entries(table.globalSecondaryIndexes).map(([name, gsi]) => ({
        ...gsi,
        name,
      })),
  });

export const createMainTable = () => createTable(mainTable);
