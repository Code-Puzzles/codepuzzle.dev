import { FirefoxBrowser } from "../src/browser/firefox";
import { judge } from "../src/judge";

const main = async () => {
  console.log("Running...");

  // const browser = new FirefoxBrowser("57.0");
  // browser.dir = ".browser";
  // await browser.install();

  const browser = new FirefoxBrowser();
  await browser.start();
  console.log("=== result", await browser.execute("return 123+456"));

  // console.log(
  //   "Result:",
  //   await judge(
  //     {
  //       puzzleName: "id",
  //       puzzleSource: "function id(x) {\n  return x;\n}",
  //       solution: "!0",
  //     },
  //     browser
  //   )
  // );

  await browser.close();
  process.exit(0);
};

main();
