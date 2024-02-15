import path from "node:path";
import crypto from "node:crypto";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import type { APIGatewayProxyResult } from "aws-lambda";
import {
  LambdaEndpoint,
  endpoints,
  getCorsHeaders,
} from "@codepuzzles/backend";
import { API_DOMAIN_NAME } from "@codepuzzles/common";
import { MockEndpoint } from "@codepuzzles/backend/endpoints";
import { DEV_FRONTEND_BASE_URL, FRONTEND_BASE_URL } from "@codepuzzles/common";
import { NODE_VERSION } from "./versions.js";
import { createJudgeFuncs } from "./judge.js";
import { DIST_BUNDLES_DIR } from "./paths.js";

interface EndpointsOrFuncs {
  [name: string]:
    | MockEndpoint
    | LambdaEndpoint<unknown>
    | aws.lambda.Function
    | EndpointsOrFuncs;
}

interface CreateMockOpts {
  apiRestId: pulumi.Input<string>;
  resourceId: pulumi.Input<string>;
  httpMethod: pulumi.Input<string>;
  namePrefix: string;
  nameSuffix: string;
  result: APIGatewayProxyResult;
}

export const createApiGateway = (
  isDev: boolean,
  namePrefix: string,
  lambdaRole: aws.iam.Role,
) => {
  const frontendOrigin = isDev ? DEV_FRONTEND_BASE_URL : FRONTEND_BASE_URL;

  const apiRest = new aws.apigateway.RestApi(
    `${namePrefix}-api-rest`,
    isDev ? { tags: { _custom_id_: "api" } } : {},
  );

  const apiResourceIds: pulumi.Input<string>[] = [];
  const buildRoutes = (
    eps: EndpointsOrFuncs,
    parentResourceId: pulumi.Input<string>,
    pathSegments: string[],
  ) => {
    for (const [name, ep] of Object.entries(eps)) {
      const segments = [...pathSegments, name];
      const nameSuffix = segments.join("-").replace(/\W+/g, "-");
      const resource = new aws.apigateway.Resource(
        `${namePrefix}-api-resource-${nameSuffix}`,
        {
          restApi: apiRest.id,
          parentId: parentResourceId,
          pathPart: name,
        },
      );
      apiResourceIds.push(resource.id);

      if (
        ep instanceof MockEndpoint ||
        ep instanceof LambdaEndpoint ||
        ep instanceof aws.lambda.Function
      ) {
        const optionsMethod = new aws.apigateway.Method(
          `${namePrefix}-api-options-method-${nameSuffix}`,
          {
            restApi: apiRest.id,
            resourceId: resource.id,
            httpMethod: "OPTIONS",
            authorization: "NONE",
          },
        );
        apiResourceIds.push(optionsMethod.id);

        const method = new aws.apigateway.Method(
          `${namePrefix}-api-method-${nameSuffix}`,
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

        // create hardcoded options mock
        apiResourceIds.push(
          ...createMock({
            apiRestId: apiRest.id,
            resourceId: resource.id,
            httpMethod: optionsMethod.httpMethod,
            namePrefix: `${namePrefix}-api-options`,
            nameSuffix,
            result: {
              statusCode: 200,
              headers: getCorsHeaders(frontendOrigin),
              body: "{}",
            },
          }),
        );

        if (ep instanceof MockEndpoint) {
          apiResourceIds.push(
            ...createMock({
              apiRestId: apiRest.id,
              resourceId: resource.id,
              httpMethod: method.httpMethod,
              namePrefix: `${namePrefix}-api-mock`,
              nameSuffix,
              result: ep.opts.getResponse(frontendOrigin),
            }),
          );
          continue;
        }

        const bundlePath = path.join(DIST_BUNDLES_DIR, ...segments);
        const func =
          ep instanceof aws.lambda.Function
            ? ep
            : new aws.lambda.Function(`${namePrefix}-func-${nameSuffix}`, {
                architectures: ["x86_64"],
                memorySize: 256,
                role: lambdaRole.arn,
                timeout: 5,
                runtime: `nodejs${NODE_VERSION}.x`,
                handler: "index.handler",
                environment: {
                  variables: {
                    FRONTEND_ORIGIN: frontendOrigin,
                    ...(isDev ? { IS_DEV: String(!!isDev) } : undefined),
                  },
                },
                ...ep.opts,
                ...(isDev
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

        new aws.lambda.Permission(`${namePrefix}-permission-${nameSuffix}`, {
          action: "lambda:InvokeFunction",
          function: func.name,
          principal: "apigateway.amazonaws.com",
          sourceArn: pulumi.interpolate`${apiRest.executionArn}/*/*`,
        });

        const integration = new aws.apigateway.Integration(
          `${namePrefix}-api-integration-${nameSuffix}`,
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
    judge: createJudgeFuncs(namePrefix, !!isDev),
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

  const apiDomainName = new aws.apigateway.DomainName(
    `${namePrefix}-api-domain`,
    {
      certificateArn:
        "arn:aws:acm:us-east-1:237755930437:certificate/ee793a37-09a8-467d-beb0-8bf1a13f7cfe",
      domainName: API_DOMAIN_NAME,
    },
  );

  new aws.apigateway.BasePathMapping(`${namePrefix}-api-mapping`, {
    restApi: apiRest.id,
    stageName: apiStage.stageName,
    domainName: apiDomainName.domainName,
  });

  addCloudwatchRole(namePrefix);

  return { apiRest, apiStage };
};

const addCloudwatchRole = (namePrefix: string) => {
  const apiGatewayCloudwatchRole = new aws.iam.Role(
    `${namePrefix}-apigateway-cloudwatch-role`,
    {
      assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "sts:AssumeRole",
            Principal: {
              Service: "apigateway.amazonaws.com",
            },
          },
        ],
      },
    },
  );

  const apiGatewayCloudwatchPolicy = new aws.iam.Policy(
    `${namePrefix}-apigateway-cloudwatch-policy`,
    {
      policy: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "logs:CreateLogGroup",
              "logs:CreateLogStream",
              "logs:DescribeLogGroups",
              "logs:DescribeLogStreams",
              "logs:PutLogEvents",
              "logs:GetLogEvents",
              "logs:FilterLogEvents",
            ],
            Resource: "arn:aws:logs:*:*:*",
          },
        ],
      },
    },
  );

  new aws.iam.RolePolicyAttachment(
    `${namePrefix}-apigateway-cloudwatch-policy-attachment`,
    {
      role: apiGatewayCloudwatchRole,
      policyArn: apiGatewayCloudwatchPolicy.arn,
    },
  );

  new aws.apigateway.Account(`${namePrefix}-apigateway-account`, {
    cloudwatchRoleArn: apiGatewayCloudwatchRole.arn,
  });
};

function createMock({
  apiRestId,
  resourceId,
  namePrefix,
  nameSuffix,
  httpMethod,
  result,
}: CreateMockOpts) {
  const apiResourceIds = [];
  const integration = new aws.apigateway.Integration(
    `${namePrefix}-integration-${nameSuffix}`,
    {
      restApi: apiRestId,
      resourceId: resourceId,
      httpMethod: httpMethod,
      type: "MOCK",
    },
  );
  apiResourceIds.push(integration.id);

  const response200 = new aws.apigateway.MethodResponse(
    `${namePrefix}-method-response-${nameSuffix}`,
    {
      restApi: apiRestId,
      resourceId: resourceId,
      httpMethod: httpMethod,
      statusCode: result.statusCode.toString(),
      responseModels: {
        "application/json": "Empty",
      },
      responseParameters: Object.fromEntries(
        Object.keys(result.headers ?? {}).map((name) => [
          `method.response.header.${name}`,
          false,
        ]),
      ),
    },
  );
  apiResourceIds.push(response200.id);

  const integrationResponse = new aws.apigateway.IntegrationResponse(
    `${namePrefix}-integration-response-${nameSuffix}`,
    {
      restApi: apiRestId,
      resourceId: resourceId,
      httpMethod: httpMethod,
      statusCode: result.statusCode.toString(),
      responseTemplates: {
        "application/json": result.body,
      },
      responseParameters: Object.fromEntries(
        Object.entries(result.headers ?? {}).map(([name, value]) => [
          `method.response.header.${name}`,
          `'${value}'`,
        ]),
      ),
    },
    { dependsOn: integration },
  );
  apiResourceIds.push(integrationResponse.id);
  return apiResourceIds;
}
