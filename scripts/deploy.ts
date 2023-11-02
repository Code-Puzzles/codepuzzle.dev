import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as apigateway from "@pulumi/aws-apigateway";
import { BROWSERS, NODE_VERSION } from "./constants";

// import { z } from "zod";
// import { JudgeOpts, judge } from "../src/judge";

// const withValidatedInput =
//   <B, T extends { body: string }, R>(
//     shape: z.ZodType<B>,
//     callback: (
//       body: B,
//       event: T,
//       context: aws.lambda.Context,
//       callback: (
//         error?: string | Error | null | undefined,
//         result?: R | undefined
//       ) => void
//     ) => Promise<R>
//   ): aws.lambda.Callback<
//     T,
//     R | { statusCode: number; headers: Record<string, string>; body: string }
//   > =>
//   async (evt, ctx, cb) => {
//     let body: B;
//     try {
//       body = shape.parse(
//         JSON.parse(Buffer.from(evt.body, "base64").toString())
//       );
//     } catch (err) {
//       return {
//         statusCode: 400,
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ error: err }),
//       };
//     }
//     try {
//       return await callback(body, evt, ctx, cb);
//     } catch (err) {
//       return {
//         statusCode: 500,
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ err }),
//       };
//     }
//   };

// const judgeHandler = new aws.lambda.CallbackFunction("judge-handler", {
//   callbackFactory: () => {
//     const judgeOptsShape: z.ZodType<JudgeOpts> = z.object({
//       puzzleSource: z.string(),
//       puzzleName: z.string(),
//       solution: z.string(),
//     });
//     return withValidatedInput(judgeOptsShape, async (opts: JudgeOpts) => ({
//       statusCode: 200,
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(await judge(opts)),
//     }));
//   },
// });

const judgeFuncs = Object.keys(BROWSERS).map((browserKey) => {
  const role = new aws.iam.Role(`judge-${browserKey}-lambda-role`, {
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
  new aws.iam.RolePolicyAttachment(`judge-${browserKey}-lambda-role-attach`, {
    role: role,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaExecute,
  });

  const func = new aws.lambda.Function(`judge-${browserKey}-func`, {
    code: new pulumi.asset.AssetArchive({
      ".": new pulumi.asset.FileArchive(`./dist/judge/${browserKey}`),
    }),
    runtime: `nodejs${NODE_VERSION}.x`,
    architectures: ["x86_64"],
    role: role.arn,
    handler: "index.handler",
    timeout: 60,
  });

  return func;
});

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
