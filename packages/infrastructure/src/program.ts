import crypto from "node:crypto";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { params } from "@codepuzzles/backend";
import { createMainTable } from "./db.js";
import { createApiGateway } from "./api-gateway.js";

const defineInlinePolicyDocument = (policy: aws.iam.PolicyDocument) =>
  JSON.stringify(policy);

const generateSessionKeys = () =>
  crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

export const buildProgram = (isDev: boolean) => {
  const stackName = pulumi.getStack();

  const namePrefix = `${stackName}`;

  if (isDev) {
    const sessionKeys = generateSessionKeys();
    const defaultValues: Record<keyof typeof params, string | undefined> = {
      sessionJwtPrivateKey: sessionKeys.privateKey,
      sessionJwtPublicKey: sessionKeys.publicKey,
      githubOauthClientId: process.env["UNMOCK_LOGIN"]
        ? undefined
        : "mock_github_oauth_client_id",
      githubOauthClientSecret: process.env["UNMOCK_LOGIN"]
        ? undefined
        : "mock_github_oauth_client_secret",
    };
    for (const [name, { isSecret, envVar }] of Object.entries(params)) {
      const value =
        process.env[envVar] ?? defaultValues[name as keyof typeof params];
      if (!value) throw new Error(`Missing value for parameter: ${name}`);
      new aws.ssm.Parameter(`${namePrefix}-param-${name}`, {
        type: isSecret
          ? aws.ssm.ParameterType.SecureString
          : aws.ssm.ParameterType.String,
        name,
        value,
      });
    }
  }

  const mainTable = createMainTable();

  const lambdaRole = new aws.iam.Role(`${namePrefix}-lambda-role`, {
    assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "sts:AssumeRole",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
        },
      ],
    },
    inlinePolicies: [
      {
        name: "LambdaRoute",
        policy: mainTable.arn.apply((arn) =>
          defineInlinePolicyDocument({
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "DbWrite",
                Effect: "Allow",
                Action: [
                  "dynamodb:PutItem",
                  "dynamodb:UpdateItem",
                  "dynamodb:DeleteItem",
                  "dynamodb:BatchWriteItem",
                  "dynamodb:GetItem",
                  "dynamodb:BatchGetItem",
                  "dynamodb:Query",
                  "dynamodb:ConditionCheckItem",
                ],
                Resource: [arn, `${arn}/index/*`],
              },
              {
                Sid: "ReadSecrets",
                Effect: "Allow",
                Action: "ssm:GetParameter",
                Resource: "arn:aws:ssm:*:*:parameter/*",
              },
            ],
          }),
        ),
      },
    ],
  });
  new aws.iam.RolePolicyAttachment(`${namePrefix}-lambda-role-attach`, {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicy.AWSLambdaExecute,
  });

  const { apiRest, apiStage } = createApiGateway(isDev, namePrefix, lambdaRole);

  return {
    url: isDev
      ? pulumi.interpolate`http://${apiRest.id}.execute-api.localhost.localstack.cloud:4566/${apiStage.stageName}`
      : apiStage.invokeUrl,
  };
};
