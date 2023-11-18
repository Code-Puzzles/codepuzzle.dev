import concurrently from "concurrently";

concurrently(
  [
    {
      name: "be",
      command: "npm run dev:backend",
      prefixColor: "magenta",
    },
    {
      name: "fe",
      command: "npm run dev:frontend",
      prefixColor: "yellow",
    },
  ],
  {
    killOthers: ["success", "failure"],
  },
);
