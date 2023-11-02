import { FirefoxBrowser } from "../src/browsers";
import { judge } from "../src/judge";

const main = async () => {
  console.log("Running...");

  console.log(
    "Result:",
    await judge(
      {
        puzzleName: "id",
        puzzleSource: "function id(x) {\n  return x;\n}",
        solution: "!0",
      },
      new FirefoxBrowser()
    )
  );

  process.exit(0);
};

main();
