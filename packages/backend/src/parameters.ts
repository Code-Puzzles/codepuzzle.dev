import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const defineParameters = <ParamName extends string>(
  params: Record<ParamName, { isSecret?: boolean; envVar: string }>,
) => params;

export const params = defineParameters({
  sessionJwtPrivateKey: {
    isSecret: true,
    envVar: "SESSION_JWT_PRIVATE_KEY",
  },
  sessionJwtPublicKey: {
    envVar: "SESSION_JWT_PUBLIC_KEY",
  },
  githubOauthClientId: {
    envVar: "GITHUB_OAUTH_CLIENT_ID",
  },
  githubOauthClientSecret: {
    isSecret: true,
    envVar: "GITHUB_OAUTH_CLIENT_SECRET",
  },
});

export type ParamName = keyof typeof params;

export const loadParam = async (name: ParamName): Promise<string> => {
  const ssmClient = new SSMClient({});
  const { Parameter: parameter } = await ssmClient.send(
    new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    }),
  );
  const value = parameter?.Value;
  if (!value) throw new Error(`Parameter '${name}' not found or empty`);
  return value;
};

const paramsCache = new Map<string, Promise<string>>();

// TODO: Cache refreshing
export const getParam = async (name: ParamName) => {
  const existingPromise = paramsCache.get(name);
  if (existingPromise) return existingPromise;

  const newPromise = loadParam(name);
  paramsCache.set(name, newPromise);
  return newPromise;
};
