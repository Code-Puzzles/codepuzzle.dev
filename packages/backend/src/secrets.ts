import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const defineSecrets = <SecretName extends string>(
  secrets: Record<
    SecretName,
    { envVar: string; getDevValue: () => Promise<string> }
  >,
) => secrets;

export const secrets = defineSecrets({
  sessionJwtPrivateKey: {
    envVar: "SESSION_JWT_PRIVATE_KEY",
    getDevValue: async () => "sessionJwtPrivateKey",
  },
  githubOauthClientSecret: {
    envVar: "GITHUB_OAUTH_CLIENT_SECRET",
    getDevValue: async () => "githubOauthClientSecret",
  },
});

export type SecretName = keyof typeof secrets;

export const loadSecret = async (name: SecretName): Promise<string> => {
  const ssmClient = new SSMClient({});
  const { Parameter: parameter } = await ssmClient.send(
    new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    }),
  );
  const value = parameter?.Value;
  if (!value) {
    throw new Error(`Secret parameter '${name}' not found or empty`);
  }
  return value;
};

const secretsCache = new Map<string, Promise<string>>();

// TODO: Cache refreshing
export const getSecret = async (name: SecretName) => {
  const existingPromise = secretsCache.get(name);
  if (existingPromise) return existingPromise;

  const newPromise = loadSecret(name);
  secretsCache.set(name, newPromise);
  return newPromise;
};
