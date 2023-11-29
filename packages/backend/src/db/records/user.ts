import { z } from "zod";
import { RECORD_TYPE, RUNTIME_TYPE, mappedRecord } from "../util/record.js";
import { mainTable } from "../table.js";

export const buildUserLoginKey = (opts: {
  loginProvider: string;
  loginId: string;
}) => ["LOGIN", opts.loginProvider, opts.loginId].join("/");

export class User extends mappedRecord<User>()(
  z.object({
    pk0: z.string().startsWith("LOGIN/"),
    sk0: z.string().startsWith("USER/"),
    name: z.string(),
    pfp: z.string().optional(),
    created: z.number(),
  }),
)((record) => {
  const [, userId] = record.sk0.split("/");
  const [, loginProvider, loginId] = record.pk0.split("/");
  return {
    id: userId!,
    loginProvider: loginProvider!,
    loginId: loginId!,
    name: record.name,
    profilePictureUrl: record.pfp,
    createdDate: new Date(record.created),
  };
})({
  table: mainTable,
  toRecord: (value) => ({
    pk0: buildUserLoginKey(value),
    sk0: ["USER", value.id].join("/"),
    name: value.name,
    pfp: value.profilePictureUrl,
    created: value.createdDate.getTime(),
  }),
}) {}

const UserRecordType = User[RECORD_TYPE];
export type UserRecordType = typeof UserRecordType;

const UserRuntimeType = User[RUNTIME_TYPE];
export type UserRuntimeType = typeof UserRuntimeType;
