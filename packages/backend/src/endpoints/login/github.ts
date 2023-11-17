import { randomUUID } from "node:crypto";
import { z } from "zod";
import { GITHUB_OAUTH_CLIENT_ID, LOG_PREFIX } from "@jspuzzles/common-node";
import { Octokit } from "octokit";
import { lambdaHandler } from "../../lambda-utils.js";

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

  const { data: user } = await octokit.rest.users.getAuthenticated();
  saveToDb({
    id: randomUUID(),
    type: "GITHUB",
    name: user.name,
    profilePictureUrl: user.avatar_url,
  });

  return {};
});

// TODO
const saveToDb = (record: unknown) => {
  console.log("=== saveToDb", record);
};
