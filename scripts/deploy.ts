import pulumi from "@pulumi/pulumi";
import { PROJECT_NAME, buildProgram } from "@jspuzzles/infrastructure";

const stackName = process.argv[2];
if (!stackName) throw new Error("Stack name argument not provided");

const stack = await pulumi.automation.LocalWorkspace.selectStack({
  projectName: PROJECT_NAME,
  stackName,
  program: async () => buildProgram(false),
});

await stack.up();
