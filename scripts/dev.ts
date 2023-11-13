import concurrently from "concurrently";

concurrently(
  [
    {
      name: "lambda",
      command: "npm run dev:backend",
      prefixColor: "magenta",
    },
    {
      name: "svelte",
      command: "npm run dev:frontend",
      prefixColor: "yellow",
    },
  ],
  {
    killOthers: ["success", "failure"],
  },
);
