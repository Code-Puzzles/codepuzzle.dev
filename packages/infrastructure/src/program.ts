import path from "node:path";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import { Endpoint, endpoints, Endpoints, secrets } from "@jspuzzles/backend";
import { NODE_VERSION } from "./versions.js";
import { createJudgeFuncs } from "./judge.js";
import { DIST_BUNDLES_DIR } from "./paths.js";
import { createMainTable } from "./db.js";

const defineInlinePolicyDocument = (policy: aws.iam.PolicyDocument) =>
  JSON.stringify(policy);

export const buildProgram = (isLocalDev: boolean) => {
  const stackName = pulumi.getStack();

  const namePrefix = `${stackName}`;

  if (isLocalDev) {
    for (const [name, { envVar, getDevValue }] of Object.entries(secrets)) {
      new aws.ssm.Parameter(`${namePrefix}-secret-${name}`, {
        type: aws.ssm.ParameterType.SecureString,
        name,
        value: Promise.resolve(process.env[envVar] ?? getDevValue()).then(
          (value) => {
            if (!value) {
              throw new Error(
                `Environment variable for secret not set: ${envVar}`,
              );
            }
            return value;
          },
        ),
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

  const judgeFuncs = isLocalDev ? [] : createJudgeFuncs(namePrefix);

  const routes: apigateway.types.input.RouteArgs[] = [];
  const buildRoutes = (eps: Endpoints, pathSegments: string[]) => {
    for (const [name, ep] of Object.entries(eps)) {
      const nextPathSegments = [...pathSegments, name];
      if (ep instanceof Endpoint) {
        routes.push({
          path: nextPathSegments.map((seg) => `/${seg}`).join(""),
          method: "POST",
          eventHandler: new aws.lambda.Function(
            `${namePrefix}-${nextPathSegments
              .join("-")
              .replace(/\W+/g, "-")}-func`,
            {
              architectures: ["x86_64"],
              memorySize: 256,
              role: lambdaRole.arn,
              timeout: 5,
              runtime: `nodejs${NODE_VERSION}.x`,
              handler: "index.handler",
              ...ep.opts,
              ...(isLocalDev
                ? {
                    s3Bucket: "hot-reload",
                    s3Key: path.join(DIST_BUNDLES_DIR, ...nextPathSegments),
                  }
                : {
                    code: new pulumi.asset.AssetArchive({
                      ".": new pulumi.asset.FileArchive(
                        path.join(DIST_BUNDLES_DIR, ...nextPathSegments),
                      ),
                    }),
                  }),
            },
          ),
        });
      } else {
        buildRoutes(ep, nextPathSegments);
      }
    }
  };
  buildRoutes(endpoints, []);

  const restApi = new apigateway.RestAPI(`${namePrefix}-api`, {
    stageName: "stage",
    routes: [
      ...judgeFuncs.map(
        (func): apigateway.types.input.RouteArgs => ({
          // TODO: update path once we have more than one
          path: "/judge",
          method: "POST",
          eventHandler: func,
        }),
      ),
      ...routes,
    ],
  });

  return {
    url: restApi.url,
    restApiId: restApi.api.id,
    stageName: restApi.stage.stageName,
  };
};
