import { ScalarAttributeType } from "@aws-sdk/client-dynamodb";
import { StringOnly } from "./types.js";

export type TableIndex<Attr extends string> = {
  hashKey: Attr;
  rangeKey: Attr;
};

export type TypeFromAttribute<T extends ScalarAttributeType> = {
  S: string;
  N: number;
  B: boolean;
}[T];

export interface DbTable<
  Attrs extends Record<string, ScalarAttributeType>,
  Index extends TableIndex<StringOnly<keyof Attrs>>,
  IncludedAttr extends string,
  Gsis extends Record<
    string,
    TableIndex<StringOnly<keyof Attrs>> & {
      projectionType: "ALL" | "INCLUDE" | "KEYS_ONLY";
      nonKeyAttributes?: IncludedAttr[] & [string];
    }
  >,
> {
  name: string;
  attributes: Attrs;
  index: Index;
  globalSecondaryIndexes?: Gsis;
}

export type AnyDbTable = DbTable<
  Record<string, ScalarAttributeType>,
  TableIndex<string>,
  string,
  Record<
    string,
    TableIndex<string> & {
      projectionType: "ALL" | "INCLUDE" | "KEYS_ONLY";
      nonKeyAttributes?: string[] & [string];
    }
  >
>;

export const defineTable = <
  Attrs extends Record<string, ScalarAttributeType>,
  Index extends TableIndex<StringOnly<keyof Attrs>>,
  IncludedAttr extends string,
  Gsis extends Record<
    string,
    TableIndex<StringOnly<keyof Attrs>> & {
      projectionType: "ALL" | "INCLUDE" | "KEYS_ONLY";
      nonKeyAttributes?: IncludedAttr[] & [string];
    }
  > = {},
>(
  opts: DbTable<Attrs, Index, IncludedAttr, Gsis>,
) => opts;
