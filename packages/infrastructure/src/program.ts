import path from "node:path";
import crypto from "node:crypto";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Endpoint, endpoints, secrets } from "@jspuzzles/backend";
import { NODE_VERSION } from "./versions.js";
import { createJudgeFuncs } from "./judge.js";
import { DIST_BUNDLES_DIR } from "./paths.js";
import { createMainTable } from "./db.js";

interface EndpointsOrFuncs {
  [name: string]: Endpoint<unknown> | aws.lambda.Function | EndpointsOrFuncs;
}

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

  const apiRest = new aws.apigateway.RestApi(
    `${namePrefix}-api-rest`,
    isLocalDev ? { tags: { _custom_id_: "api" } } : {},
  );

  const apiResourceIds: pulumi.Input<string>[] = [];
  const buildRoutes = (
    eps: EndpointsOrFuncs,
    parentResourceId: pulumi.Input<string>,
    pathSegments: string[],
  ) => {
    for (const [name, ep] of Object.entries(eps)) {
      const segments = [...pathSegments, name];
      const namePostfix = segments.join("-").replace(/\W+/g, "-");
      const resource = new aws.apigateway.Resource(
        `${namePrefix}-api-resource-${namePostfix}`,
        {
          restApi: apiRest.id,
          parentId: parentResourceId,
          pathPart: name,
        },
      );
      apiResourceIds.push(resource.id);

      if (ep instanceof Endpoint || ep instanceof aws.lambda.Function) {
        const method = new aws.apigateway.Method(
          `${namePrefix}-api-method-${namePostfix}`,
          {
            restApi: apiRest.id,
            resourceId: resource.id,
            authorization: "NONE",
            httpMethod:
              (ep instanceof aws.lambda.Function
                ? undefined
                : ep.opts.method) ?? "POST",
          },
        );
        apiResourceIds.push(method.id);

        const bundlePath = path.join(DIST_BUNDLES_DIR, ...segments);
        const func =
          ep instanceof aws.lambda.Function
            ? ep
            : new aws.lambda.Function(`${namePrefix}-func-${namePostfix}`, {
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
                      s3Key: bundlePath,
                    }
                  : {
                      code: new pulumi.asset.AssetArchive({
                        ".": new pulumi.asset.FileArchive(bundlePath),
                      }),
                    }),
              });

        new aws.lambda.Permission(`${namePrefix}-permission-${namePostfix}`, {
          action: "lambda:InvokeFunction",
          function: func.name,
          principal: "apigateway.amazonaws.com",
          sourceArn: pulumi.interpolate`${apiRest.executionArn}/*/*`,
        });

        const integration = new aws.apigateway.Integration(
          `${namePrefix}-api-integration-${namePostfix}`,
          {
            restApi: apiRest.id,
            resourceId: resource.id,
            httpMethod: method.httpMethod,
            type: "AWS_PROXY",
            integrationHttpMethod: "POST",
            uri: pulumi.interpolate`arn:aws:apigateway:${aws.config.requireRegion()}:lambda:path/2015-03-31/functions/${
              func.arn
            }/invocations`,
          },
        );
        apiResourceIds.push(integration.id);
      } else {
        buildRoutes(ep, resource.id, segments);
      }
    }
  };

  const mergedEndpoints: EndpointsOrFuncs = {
    ...endpoints,
    ...(isLocalDev ? {} : { judge: createJudgeFuncs(namePrefix) }),
  };
  buildRoutes(mergedEndpoints, apiRest.rootResourceId, []);

  const apiDeployment = new aws.apigateway.Deployment(
    `${namePrefix}-api-deployment`,
    {
      restApi: apiRest.id,
      triggers: {
        redeployment: pulumi
          .all(apiResourceIds)
          .apply((ids) =>
            crypto.createHash("sha1").update(JSON.stringify(ids)).digest("hex"),
          ),
      },
    },
  );

  const apiStage = new aws.apigateway.Stage(`${namePrefix}-api-stage`, {
    deployment: apiDeployment.id,
    restApi: apiRest.id,
    stageName: "stage",
  });

  return {
    url: isLocalDev
      ? pulumi.interpolate`http://${apiRest.id}.execute-api.localhost.localstack.cloud:4566/${apiStage.stageName}`
      : apiStage.invokeUrl,
  };
};
