import path from "node:path";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import { NODE_VERSION } from "./versions.js";
import { createJudgeFuncs } from "./judge.js";
import { DIST_BUNDLES_DIR } from "./paths.js";

export const buildProgram = (isLocalDev: boolean) => {
  const stackName = pulumi.getStack();

  const namePrefix = `${stackName}`;

  const lambdaRole = new aws.iam.Role(`${namePrefix}-lambda-role`, {
    assumeRolePolicy: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
          Effect: "Allow",
          Sid: "",
        },
      ],
    },
  });
  new aws.iam.RolePolicyAttachment(`${namePrefix}-lambda-role-attach`, {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaExecute,
  });

  const judgeFuncs = isLocalDev ? [] : createJudgeFuncs(namePrefix);

  const otherFuncs = ["/healthcheck", "/login/github"].map((pathname) => {
    const pathNoLeadingSlash = pathname.replace(/^\//, "");
    return {
      pathname,
      func: new aws.lambda.Function(
        `${namePrefix}-${pathNoLeadingSlash.replace(/\W+/g, "-")}-func`,
        {
          architectures: ["x86_64"],
          memorySize: 256,
          role: lambdaRole.arn,
          timeout: 5,
          runtime: `nodejs${NODE_VERSION}.x`,
          handler: "index.handler",
          ...(isLocalDev
            ? {
                s3Bucket: "hot-reload",
                s3Key: path.join(DIST_BUNDLES_DIR, pathNoLeadingSlash),
              }
            : {
                code: new pulumi.asset.AssetArchive({
                  ".": new pulumi.asset.FileArchive(
                    path.join(DIST_BUNDLES_DIR, pathNoLeadingSlash),
                  ),
                }),
              }),
        },
      ),
    };
  });

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
      ...otherFuncs.map(
        ({ pathname, func }): apigateway.types.input.RouteArgs => ({
          path: pathname,
          method: "POST",
          eventHandler: func,
        }),
      ),
    ],
  });

  return {
    url: restApi.url,
    restApiId: restApi.api.id,
    stageName: restApi.stage.stageName,
  };
};
