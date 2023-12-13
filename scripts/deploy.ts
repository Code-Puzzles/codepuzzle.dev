import pulumi from "@pulumi/pulumi";
import {
  INFRASTRUCTURE_DIR,
  PROJECT_NAME,
  buildProgram,
} from "@jspuzzles/infrastructure";

const stackName = process.argv[2];
if (!stackName) throw new Error("Stack name argument not provided");

const stack = await pulumi.automation.LocalWorkspace.selectStack(
  {
    projectName: PROJECT_NAME,
    stackName,
    program: async () => buildProgram(false),
  },
  { workDir: INFRASTRUCTURE_DIR },
);

const result = await stack.up({
  onOutput: (out) => console.log(out),
});

if (result.summary.result === "failed") {
  throw new Error("Pulumi update failed");
}
