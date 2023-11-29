import { randomUUID } from "node:crypto";
import { z } from "zod";
import { GITHUB_OAUTH_CLIENT_ID, LOG_PREFIX } from "@jspuzzles/common";
import { Octokit } from "octokit";
import { lambdaHandler } from "../../lambda-utils.js";
import { User } from "../../db/records/user.js";
import { generateSessionJwt } from "../../auth.js";

const githubLoginOptsShape = z.object({
  oauthCode: z.string(),
});

export type GithubLoginOpts = z.TypeOf<typeof githubLoginOptsShape>;

export const handler = lambdaHandler(githubLoginOptsShape, async (opts) => {
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

  const user = await createUser({
    loginProvider: "GITHUB",
    loginId: githubUser.id.toString(),
    name: githubUser.name ?? `Github user #${githubUser.id}`,
    profilePictureUrl: githubUser.avatar_url,
  });

  const jwt = generateSessionJwt("", user.id);

  return {
    body: {},
  };
});

const createUser = async (
  userDetails: Omit<typeof User.__runtimeType, "id" | "createdDate">,
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
