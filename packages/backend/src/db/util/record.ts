import { z } from "zod";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { AnyDbTable } from "./table.js";
import { getDbClient } from "../client.js";

export const TABLE_TYPE = Symbol("TableType");
export const RECORD_TYPE = Symbol("RecordType");
export const RUNTIME_TYPE = Symbol("RuntimeType");

export interface MappedRecordClass<
  TableType,
  ClassType,
  RecordType,
  RuntimeType,
> {
  [RECORD_TYPE]: RecordType;
  [RUNTIME_TYPE]: RuntimeType;

  table: TableType;
  opts: RecordOpts<RecordType, RuntimeType>;
  fromRecord(record: RecordType): ClassType;

  new (
    value: RuntimeType,
  ): RuntimeType & MappedRecordInstance<ClassType, RecordType, RuntimeType>;
}

export interface MappedRecordInstance<_ClassType, RecordType, _RuntimeType> {
  toRecord(): RecordType;
  createInDb(): Promise<void>;
  saveToDb(): Promise<void>;
}

export interface MigrationBuilderInitial {
  next<T, Next>(
    type: z.ZodType<T>,
    migrator: (prev: T) => Next,
  ): MigrationBuilder<Next>;
}

export interface MigrationBuilder<T> {
  next<Next>(
    type: z.ZodType<T>,
    migrator: (prev: T) => Next,
  ): MigrationBuilder<Next>;
}

export interface RecordOpts<RecordType, RuntimeType> {
  toRecord: (value: RuntimeType) => RecordType;
  migrations?: (m: MigrationBuilderInitial) => MigrationBuilder<RecordType>;
}

export const mappedRecord =
  <ClassType>() =>
  <RecordType, TableType extends AnyDbTable>(
    table: TableType,
    type: z.ZodType<RecordType>,
  ) =>
  <RuntimeType>(fromRecord: (record: RecordType) => RuntimeType) =>
  (
    opts: RecordOpts<RecordType, RuntimeType>,
  ): MappedRecordClass<TableType, ClassType, RecordType, RuntimeType> =>
    class implements MappedRecordInstance<ClassType, RecordType, RuntimeType> {
      static table = table;
      static opts = opts;

      static fromRecord(record: RecordType): ClassType {
        const instance = fromRecord(record);
        Object.setPrototypeOf(instance, this.prototype);
        return instance as unknown as ClassType;
      }

      constructor(value: RuntimeType) {
        Object.assign(this, value);
      }

      toRecord(): RecordType {
        return type.parse(opts.toRecord(this as unknown as RuntimeType));
      }

      async createInDb(): Promise<void> {
        await getDbClient().send(
          new PutCommand({
            TableName: table.name,
            Item: this.toRecord() as Record<string, any>,
            ConditionExpression: Object.values(table.index)
              .map((value) => `attribute_not_exists(${value})`)
              .join(" AND "),
          }),
        );
      }

      async saveToDb(): Promise<void> {
        await getDbClient().send(
          new PutCommand({
            TableName: table.name,
            // TODO: Update only changed fields to minimize chance of conflicts?
            Item: this.toRecord() as Record<string, any>,
          }),
        );
      }
    } as MappedRecordClass<TableType, ClassType, RecordType, RuntimeType>;
