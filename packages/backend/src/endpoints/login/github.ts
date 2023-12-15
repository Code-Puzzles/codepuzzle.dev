import { randomUUID } from "node:crypto";
import { z } from "zod";
import { GITHUB_OAUTH_MOCK_CODE, LOG_PREFIX } from "@codepuzzles/common";
import { Octokit } from "octokit";
import { lambdaHandler } from "../../lambda/handler.js";
import { IS_DEV } from "../../lambda/utils.js";
import { User, UserRuntimeType } from "../../db/records/user.js";
import { generateSessionCookieHeader } from "../../auth.js";
import { getUserByLogin } from "../../db/queries.js";
import { getParam } from "../../parameters.js";

const GITHUB_LOGIN_PROVIDER = "GITHUB";

const githubLoginOptsShape = z.object({
  oauthCode: z.string(),
});

export type GithubLoginOpts = z.TypeOf<typeof githubLoginOptsShape>;

export const handler = lambdaHandler({
  isUnauthenticated: true,
  bodyShape: githubLoginOptsShape,
  async handler(opts) {
    console.log(`${LOG_PREFIX} opts`, opts);

    const githubUser = await fetchUserDetails(opts.oauthCode);

    const user = await getAndUpdateOrCreateUser({
      loginProvider: GITHUB_LOGIN_PROVIDER,
      loginId: githubUser.id.toString(),
      name: githubUser.name ?? githubUser.login,
      profilePictureUrl: githubUser.avatar_url,
    });

    return {
      headers: {
        ...(await generateSessionCookieHeader(user.id, user.loginId)),
      },
      body: {},
    };
  },
});

const fetchUserDetails = async (
  oauthCode: string,
): Promise<{
  id: number;
  name?: string | null;
  login: string;
  avatar_url?: string;
}> => {
  if (IS_DEV && oauthCode === GITHUB_OAUTH_MOCK_CODE) {
    return {
      id: 12345,
      name: "Mock Github User",
      login: "mock-github-user",
    };
  }

  const data = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: await getParam("githubOauthClientId"),
      client_secret: await getParam("githubOauthClientSecret"),
      code: oauthCode,
    }),
    credentials: "include",
  }).then(
    (res) => res.json() as Promise<{ access_token?: string } | undefined>,
  );
  const accessToken = data?.access_token;
  if (!accessToken) throw new Error("Missing access_token from response");

  const octokit = new Octokit({
    userAgent: "codepuzzle.dev/v0.0.0",
    auth: accessToken,
  });

  const { data: githubUser } = await octokit.rest.users.getAuthenticated();
  return githubUser;
};

const getAndUpdateOrCreateUser = async (
  userDetails: Omit<UserRuntimeType, "id" | "createdDate">,
) => {
  const existingUser = await getUserByLogin(
    userDetails.loginProvider,
    userDetails.loginId,
  );

  if (!existingUser) return createUser(userDetails);

  let isUpdated = false;
  for (const [key, value] of Object.entries(userDetails)) {
    if (
      (typeof value !== "object" || value === null) &&
      existingUser[key as keyof User] !== value
    ) {
      existingUser[key as keyof User] = value as any;
      isUpdated = true;
    }
  }
  if (isUpdated) await existingUser.saveToDb();

  return existingUser;
};

const createUser = async (
  userDetails: Omit<UserRuntimeType, "id" | "createdDate">,
) => {
  for (let i = 0; i < 3; i++) {
    try {
      const user = new User({
        ...userDetails,
        id: randomUUID(),
        createdDate: new Date(),
      });
      await user.createInDb();
      return user;
    } catch (err) {
      // TODO: Check for dynamodb condition failure
      const userIdAlreadyExists = (err as any).userIdAlreadyExists;
      if (!userIdAlreadyExists) throw err;
    }
  }
  throw new Error("Failed to generate unique user ID after multiple attempts");
};
