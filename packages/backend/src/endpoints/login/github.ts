import { randomUUID } from "node:crypto";
import { z } from "zod";
import { GITHUB_OAUTH_CLIENT_ID, LOG_PREFIX } from "@jspuzzles/common";
import { Octokit } from "octokit";
import { lambdaHandler } from "../../lambda/utils.js";
import { User, UserRuntimeType } from "../../db/records/user.js";
import { generateSessionCookieHeader } from "../../auth.js";
import { getUserByLogin } from "../../db/queries.js";

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

    const githubOauthSecret = process.env["GITHUB_OAUTH_CLIENT_SECRET"];
    if (!githubOauthSecret)
      throw new Error("GITHUB_OAUTH_CLIENT_SECRET env variable not set");

    const data = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        client_secret: githubOauthSecret,
        code: opts.oauthCode,
      }),
    }).then(
      (res) => res.json() as Promise<{ access_token?: string } | undefined>,
    );
    const accessToken = data?.access_token;
    if (!accessToken) throw new Error("Missing access_token from response");

    const octokit = new Octokit({
      userAgent: "js-puzzles/v0.0.0",
      auth: accessToken,
    });

    const { data: githubUser } = await octokit.rest.users.getAuthenticated();
    const githubId = githubUser.id.toString();

    const user = await getAndUpdateOrCreateUser({
      loginProvider: GITHUB_LOGIN_PROVIDER,
      loginId: githubId,
      name: githubUser.name ?? `Github user #${githubId}`,
      profilePictureUrl: githubUser.avatar_url,
    });

    return {
      headers: {
        ...(await generateSessionCookieHeader(user.id)),
      },
      body: {},
    };
  },
});

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
