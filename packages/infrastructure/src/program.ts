import path from "node:path";
import crypto from "node:crypto";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import {
  Endpoint,
  endpoints,
  getCorsHeaders,
  params,
} from "@jspuzzles/backend";
import { NODE_VERSION } from "./versions.js";
import { createJudgeFuncs } from "./judge.js";
import { DIST_BUNDLES_DIR } from "./paths.js";
import { createMainTable } from "./db.js";

interface EndpointsOrFuncs {
  [name: string]: Endpoint<unknown> | aws.lambda.Function | EndpointsOrFuncs;
}

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

export const buildProgram = (isLocalDev: boolean) => {
  const stackName = pulumi.getStack();

  const namePrefix = `${stackName}`;

  if (isLocalDev) {
    const sessionKeys = generateSessionKeys();
    const defaultValues: Record<keyof typeof params, string | undefined> = {
      sessionJwtPrivateKey: sessionKeys.privateKey,
      sessionJwtPublicKey: sessionKeys.publicKey,
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

  const apiRest = new aws.apigateway.RestApi(
    `${namePrefix}-api-rest`,
    isLocalDev ? { tags: { _custom_id_: "api" } } : {},
  );

  // TODO: Only do this in dev and hardcode options prod response
  const optionsBundlePath = path.join(DIST_BUNDLES_DIR, "options");
  const optionsFunc = new aws.lambda.Function(`${namePrefix}-options-func`, {
    architectures: ["x86_64"],
    memorySize: 128,
    role: lambdaRole.arn,
    timeout: 5,
    runtime: `nodejs${NODE_VERSION}.x`,
    handler: "index.handler",
    environment: {
      variables: isLocalDev ? { IS_DEV: String(!!isLocalDev) } : undefined,
    },
    ...(isLocalDev
      ? {
          s3Bucket: "hot-reload",
          s3Key: optionsBundlePath,
        }
      : {
          code: new pulumi.asset.AssetArchive({
            ".": new pulumi.asset.FileArchive(optionsBundlePath),
          }),
        }),
  });
  new aws.lambda.Permission(`${namePrefix}-options-permission`, {
    action: "lambda:InvokeFunction",
    function: optionsFunc.name,
    principal: "apigateway.amazonaws.com",
    sourceArn: pulumi.interpolate`${apiRest.executionArn}/*/*`,
  });

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
        const optionsMethod = new aws.apigateway.Method(
          `${namePrefix}-api-options-method-${namePostfix}`,
          {
            restApi: apiRest.id,
            resourceId: resource.id,
            httpMethod: "OPTIONS",
            authorization: "NONE",
          },
        );
        apiResourceIds.push(optionsMethod.id);

        const method = new aws.apigateway.Method(
          `${namePrefix}-api-method-${namePostfix}`,
          {
            restApi: apiRest.id,
            resourceId: resource.id,
            httpMethod:
              (ep instanceof aws.lambda.Function
                ? undefined
                : ep.opts.method) ?? "POST",
            authorization: "NONE",
          },
        );
        apiResourceIds.push(method.id);

        if (isLocalDev) {
          const optionsIntegration = new aws.apigateway.Integration(
            `${namePrefix}-api-options-integration-${namePostfix}`,
            {
              restApi: apiRest.id,
              resourceId: resource.id,
              httpMethod: optionsMethod.httpMethod,
              type: "AWS_PROXY",
              integrationHttpMethod: "POST",
              uri: pulumi.interpolate`arn:aws:apigateway:${aws.config.requireRegion()}:lambda:path/2015-03-31/functions/${
                optionsFunc.arn
              }/invocations`,
            },
          );
          apiResourceIds.push(optionsIntegration.id);
        } else {
          const response200 = new aws.apigateway.MethodResponse(
            `${namePrefix}-api-options-method-response-${namePostfix}`,
            {
              restApi: apiRest.id,
              resourceId: resource.id,
              httpMethod: optionsMethod.httpMethod,
              statusCode: "200",
              responseModels: {
                "application/json": "Empty",
              },
              responseParameters: Object.fromEntries(
                Object.keys(getCorsHeaders({ headers: {} }, false)).map(
                  (name) => [`method.response.header.${name}`, false],
                ),
              ),
            },
          );
          apiResourceIds.push(response200.id);

          const integrationResponse = new aws.apigateway.IntegrationResponse(
            `${namePrefix}-api-options-integration-response-${namePostfix}`,
            {
              restApi: apiRest.id,
              resourceId: resource.id,
              httpMethod: optionsMethod.httpMethod,
              statusCode: "200",
              responseTemplates: {
                "application/json": "",
              },
              responseParameters: getCorsHeaders({ headers: {} }, false),
            },
          );
          apiResourceIds.push(integrationResponse.id);

          const integration = new aws.apigateway.Integration(
            `${namePrefix}-api-options-integration-${namePostfix}`,
            {
              restApi: apiRest.id,
              resourceId: resource.id,
              httpMethod: optionsMethod.httpMethod,
              type: "MOCK",
              passthroughBehavior: "WHEN_NO_MATCH",
              requestTemplates: {
                "application/json": JSON.stringify({ statusCode: 200 }),
              },
            },
          );
          apiResourceIds.push(integration.id);
        }

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
                environment: {
                  variables: isLocalDev
                    ? { IS_DEV: String(!!isLocalDev) }
                    : undefined,
                },
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
    judge: createJudgeFuncs(namePrefix, isLocalDev),
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
