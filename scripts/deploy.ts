import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import { BROWSER_FUNCS, NODE_VERSION } from "./constants";

const judgeFuncs = Object.entries(BROWSER_FUNCS).flatMap(([name, versions]) =>
  versions.map((version) => {
    const namePrefix = `judge-${name}-${version.replace(/\W/g, "_")}`;
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

    const func = new aws.lambda.Function(`${namePrefix}-func`, {
      code: new pulumi.asset.AssetArchive({
        ".": new pulumi.asset.FileArchive(`./dist/judge/${name}/${version}`),
      }),
      runtime: `nodejs${NODE_VERSION}.x`,
      architectures: ["x86_64"],
      memorySize: 2048,
      role: role.arn,
      handler: "index.handler",
      timeout: 2 * 60,
      environment: {
        variables: {
          BROWSER_NAME: name,
          BROWSER_VERSION: version,
        },
      },
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
