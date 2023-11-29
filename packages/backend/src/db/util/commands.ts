import {
  GetCommand,
  GetCommandInput,
  QueryCommandInput,
  paginateQuery,
} from "@aws-sdk/lib-dynamodb";

import { DbTable, TypeFromAttribute } from "./table.js";
import { MappedRecordClass } from "./record.js";
import { getDbClient } from "../client.js";

type GetIndex<
  Table extends DbTable<any, any, any, any>,
  IndexName extends
    | keyof Table["globalSecondaryIndexes"]
    | undefined = undefined,
> = IndexName extends keyof Table["globalSecondaryIndexes"]
  ? Table["globalSecondaryIndexes"][IndexName]
  : Table["index"];

type ConditionDef<T> = T | { beginsWith: T };

type TableKey<
  Table extends DbTable<any, any, any, any>,
  IndexName extends keyof Table["globalSecondaryIndexes"] | undefined,
> = Record<
  GetIndex<Table, IndexName>["hashKey"],
  TypeFromAttribute<Table["attributes"][GetIndex<Table, IndexName>["hashKey"]]>
> &
  Partial<
    Record<
      GetIndex<Table, IndexName>["rangeKey"],
      ConditionDef<
        TypeFromAttribute<
          Table["attributes"][GetIndex<Table, IndexName>["rangeKey"]]
        >
      >
    >
  >;

export const get = async <
  Table extends DbTable<any, any, any, any>,
  RecordClass extends MappedRecordClass<any, any, any>,
>(
  recordClass: RecordClass,
  input: Omit<GetCommandInput, "TableName"> & {
    Key: TableKey<Table, undefined>;
  },
): Promise<InstanceType<RecordClass> | undefined> => {
  const res = await getDbClient().send(
    new GetCommand({
      TableName: recordClass.opts.table.name,
      ...input,
    }),
  );
  return res.Item ? recordClass.fromRecord(res.Item) : undefined;
};

export const query = async <
  Table extends DbTable<any, any, any, any>,
  IndexName extends keyof Table["globalSecondaryIndexes"] | undefined,
  RecordClass extends MappedRecordClass<any, any, any>,
>(
  recordClass: RecordClass,
  input: Omit<QueryCommandInput, "TableName"> & {
    IndexName?: IndexName;
    Key: TableKey<Table, IndexName>;
  },
): Promise<InstanceType<RecordClass>[] | undefined> => {
  const res = paginateQuery(
    { client: getDbClient() },
    {
      TableName: recordClass.opts.table.name,
      ...input,
    },
  );
  const result: InstanceType<RecordClass>[] = [];
  for await (const item of res) {
    result.push(recordClass.fromRecord(item));
  }
  return result;
};
