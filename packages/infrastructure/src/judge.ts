import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";
import { ECR } from "@aws-sdk/client-ecr";
import { LambdaHandler } from "@jspuzzles/backend";
import { BROWSER_CONFIGS } from "./browsers.js";
import { REPO_ROOT } from "./paths.js";
import { NODE_VERSION } from "./versions.js";

const localDevLambdaHandler: LambdaHandler = async (evt) => {
  try {
    const result = await fetch(
      "http://host.docker.internal:9000/2015-03-31/functions/function/invocations",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(evt),
      },
    );

    if (!result.ok) {
      console.error("Result not ok:", result);
      throw new Error("Result not ok");
    }

    return await result.json();
  } catch (err) {
    console.error("Failed to proxy to local judge:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to proxy to local judge",
      }),
    };
  }
};

export const createJudgeFuncs = (namePrefix: string, isLocalDev: boolean) => {
  const ecr = new ECR({
    region: aws.config.region,
    endpoint: aws.config.endpoints?.find((ep) => ep.ecr)?.ecr,
  });
  const ecrAuthToken = isLocalDev ? undefined : aws.ecr.getAuthorizationToken();

  const lambdaRole = new aws.iam.Role(`${namePrefix}-judge-lambda-role`, {
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
  new aws.iam.RolePolicyAttachment(`${namePrefix}-judge-lambda-role-attach`, {
    role: lambdaRole,
    policyArn: aws.iam.ManagedPolicies.AWSLambdaExecute,
  });

  const functionOpts: aws.lambda.FunctionArgs = {
    architectures: ["x86_64"],
    timeout: 2 * 60,
    role: lambdaRole.arn,
  };

  return Object.fromEntries(
    Object.entries(BROWSER_CONFIGS).map(([name, buildConfig]) => [
      name,
      Object.fromEntries(
        buildConfig.versions.map((version) => {
          const lambdaPrefix = `${namePrefix}-judge-${name}-${version.replace(
            /\W+/g,
            "_",
          )}`;

          if (isLocalDev) {
            const func = new aws.lambda.Function(`${lambdaPrefix}-func`, {
              ...functionOpts,
              runtime: `nodejs${NODE_VERSION}.x`,
              handler: "index.handler",
              code: new pulumi.asset.AssetArchive({
                "index.mjs": new pulumi.asset.StringAsset(
                  `export const handler = ${localDevLambdaHandler};`,
                ),
              }),
            });

            return [version, func];
          }

          const repo = new aws.ecr.Repository(`${lambdaPrefix}-repo`, {
            name: lambdaPrefix,
            forceDelete: true,
          });

          const image = new docker.Image(`${lambdaPrefix}-image`, {
            imageName: repo.repositoryUrl,
            build: {
              dockerfile: buildConfig.dockerfilePath(version),
              platform: "linux/amd64",
              context: REPO_ROOT,
              args: buildConfig.dockerBuildArgs(version),
            },
            registry: {
              server: repo.repositoryUrl,
              username: ecrAuthToken!.then((token) => token.userName),
              password: ecrAuthToken!.then((token) => token.password),
            },
          });

          // TODO: Disable internet access
          const func = new aws.lambda.Function(`${lambdaPrefix}-func`, {
            ...functionOpts,
            packageType: "Image",
            imageUri: image.repoDigest,
            memorySize: 2048,
          });

          // Delete all images from registry except the one we just added
          pulumi
            .all([repo.registryId, repo.name, image.repoDigest])
            .apply(async ([registryId, repositoryName, repoDigest]) => {
              const newImageDigest = repoDigest.split("@").pop()!;
              const images = await ecr.describeImages({
                repositoryName,
                registryId,
              });

              const imageIdsToDelete = images
                .imageDetails!.filter(
                  (image) => image.imageDigest !== newImageDigest,
                )
                .map((image) => ({ imageDigest: image.imageDigest! }));

              console.log("Deleting old ECR Docker images", {
                imageIdsToDelete,
              });
              if (imageIdsToDelete.length > 0) {
                await ecr.batchDeleteImage({
                  registryId,
                  repositoryName,
                  imageIds: imageIdsToDelete,
                });
              }
            });

          return [version, func];
        }),
      ),
    ]),
  );
};
