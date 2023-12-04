import { get, query } from "./util/commands.js";
import { User, buildUserLoginKey } from "./records/user.js";
import { Solution, buildSolutionKey } from "./records/solution.js";

export const getUserByLogin = async (loginProvider: string, loginId: string) =>
  get(User, {
    Key: {
      pk0: buildUserLoginKey({ loginProvider, loginId }),
      sk0: "USER",
    },
  });

export const listUserSolutions = async (userId: string) =>
  query(Solution, {
    Key: {
      pk0: buildSolutionKey(userId),
    },
  });
