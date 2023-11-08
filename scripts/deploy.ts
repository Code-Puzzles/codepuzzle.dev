import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as docker from "@pulumi/docker";
import * as apigateway from "@pulumi/aws-apigateway";
import { ECR } from "@aws-sdk/client-ecr";
import { BROWSER_CONFIGS, DOCKER_CONTEXT } from "./constants";

const stackName = pulumi.getStack();
const ecr = new ECR({ region: aws.config.region! });
const ecrAuthToken = aws.ecr.getAuthorizationToken();

const namePrefix = `${stackName}`;

const judgeFuncs = Object.entries(BROWSER_CONFIGS).flatMap(
  ([name, buildConfig]) =>
    buildConfig.versions.map((version) => {
      const lambdaPrefix = `${namePrefix}-judge-${name}-${version.replace(
        /\W/g,
        "_"
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
          context: DOCKER_CONTEXT,
          args: buildConfig.dockerBuildArgs(version),
        },
        registry: {
          server: repo.repositoryUrl,
          username: ecrAuthToken.then((token) => token.userName),
          password: ecrAuthToken.then((token) => token.password),
        },
      });

      const role = new aws.iam.Role(`${lambdaPrefix}-lambda-role`, {
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
      new aws.iam.RolePolicyAttachment(`${lambdaPrefix}-lambda-role-attach`, {
        role: role,
        policyArn: aws.iam.ManagedPolicies.AWSLambdaExecute,
      });

      // TODO: Disable internet access
      const func = new aws.lambda.Function(`${lambdaPrefix}-func`, {
        packageType: "Image",
        imageUri: image.repoDigest,
        architectures: ["x86_64"],
        memorySize: 2048,
        role: role.arn,
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
              (image) => image.imageDigest !== newImageDigest
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
    })
);

const helloHandler = new aws.lambda.CallbackFunction(
  `${namePrefix}-helloHandler`,
  {
    async callback() {
      return {
        statusCode: 200,
        body: { msg: "hi werld" },
      };
    },
  }
);

const api = new apigateway.RestAPI(`${namePrefix}-api`, {
  routes: [
    ...judgeFuncs.map(
      (func): apigateway.types.input.RouteArgs => ({
        // TODO: update path once we have more than one
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
