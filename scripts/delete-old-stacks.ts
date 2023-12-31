import { fileURLToPath } from "node:url";
import * as pulumi from "@pulumi/pulumi";
import { INFRASTRUCTURE_DIR, PROJECT_NAME } from "@codepuzzles/infrastructure";

const PROTECTED_STACK_NAME = `${PROJECT_NAME}/prod`;

const run = async () => {
  const workspace = await pulumi.automation.LocalWorkspace.create({
    workDir: INFRASTRUCTURE_DIR,
  });

  const stacks = await workspace.listStacks();

  for (const stackSummary of stacks) {
    if (stackSummary.name === PROTECTED_STACK_NAME) continue;

    const stackName = stackSummary.name;
    const stack = await pulumi.automation.LocalWorkspace.selectStack({
      workDir: INFRASTRUCTURE_DIR,
      stackName,
    });

    const stackLastDeployDate = new Date(stackSummary.lastUpdate!);
    console.log(
      `Stack ${stackName} last deployed at ${stackSummary.lastUpdate}`,
    );
    if (Date.now() - stackLastDeployDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
      console.log("Not deleting stack because it was deployed too recently");
      continue;
    }

    console.log("Destroying stack");
    await stack.destroy();
    console.log("Stack has been destroyed");
  }
};

if (fileURLToPath(import.meta.url) === process.argv[1]) await run();
