import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";
import { ECR } from "@aws-sdk/client-ecr";
import { BROWSER_CONFIGS } from "./browsers.js";
import { REPO_ROOT } from "./paths.js";

export const createJudgeFuncs = (namePrefix: string) => {
  const ecr = new ECR({ region: aws.config.region! });
  const ecrAuthToken = aws.ecr.getAuthorizationToken();

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

  return Object.entries(BROWSER_CONFIGS).flatMap(([name, buildConfig]) =>
    buildConfig.versions.map((version) => {
      const lambdaPrefix = `${namePrefix}-judge-${name}-${version.replace(
        /\W+/g,
        "_",
      )}`;

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
          username: ecrAuthToken.then((token) => token.userName),
          password: ecrAuthToken.then((token) => token.password),
        },
      });

      // TODO: Disable internet access
      const func = new aws.lambda.Function(`${lambdaPrefix}-func`, {
        packageType: "Image",
        imageUri: image.repoDigest,
        architectures: ["x86_64"],
        memorySize: 2048,
        role: lambdaRole.arn,
        timeout: 2 * 60,
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

          console.log("Deleting old ECR Docker images", { imageIdsToDelete });
          if (imageIdsToDelete.length > 0) {
            await ecr.batchDeleteImage({
              registryId,
              repositoryName,
              imageIds: imageIdsToDelete,
            });
          }
        });

      return func;
    }),
  );
};
