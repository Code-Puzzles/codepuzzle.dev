import path from "node:path";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";
import * as apigateway from "@pulumi/aws-apigateway";
import { BROWSER_CONFIGS } from "./constants";

const ecrAuthToken = aws.ecr.getAuthorizationToken();

const judgeFuncs = Object.entries(BROWSER_CONFIGS).flatMap(
  ([name, buildConfig]) =>
    buildConfig.versions.map((version) => {
      const namePrefix = `judge-${name}-${version.replace(/\W/g, "_")}`;

      const repo = new aws.ecr.Repository(`${namePrefix}-repo`, {
        name: `${namePrefix}-${pulumi.getStack()}`,
        forceDelete: true,
      });

      const image = new docker.Image(`${namePrefix}-image`, {
        imageName: repo.repositoryUrl,
        build: {
          dockerfile: buildConfig.dockerfilePath(version),
          platform: "linux/amd64",
          context: path.join(__dirname, "..", "dist", "judge"),
          args: buildConfig.dockerBuildArgs(version),
        },
        registry: {
          server: repo.repositoryUrl,
          username: ecrAuthToken.then((token) => token.userName),
          password: ecrAuthToken.then((token) => token.password),
        },
      });

      const role = new aws.iam.Role(`${namePrefix}-lambda-role`, {
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
        role: role,
        policyArn: aws.iam.ManagedPolicies.AWSLambdaExecute,
      });

      // TODO: Disable internet access
      const func = new aws.lambda.Function(`${namePrefix}-func`, {
        packageType: "Image",
        imageUri: image.repoDigest,
        architectures: ["x86_64"],
        memorySize: 2048,
        role: role.arn,
        timeout: 2 * 60,
      });

      return func;
    })
);

const helloHandler = new aws.lambda.CallbackFunction("helloHandler", {
  async callback() {
    return {
      statusCode: 200,
      body: { msg: "hi werld" },
    };
  },
});

const api = new apigateway.RestAPI("api", {
  routes: [
    ...judgeFuncs.map(
      (func): apigateway.types.input.RouteArgs => ({
        path: "/judge",
        method: "POST",
        eventHandler: func,
      })
    ),
    {
      path: "/hello",
      method: "POST",
      eventHandler: helloHandler,
    },
  ],
});

export const url = api.url;
