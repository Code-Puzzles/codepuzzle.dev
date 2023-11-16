#!/bin/sh

# NOTE: workaround to let us restart the lambda handler when we change files
# without having to restart the docker image
# see: https://github.com/aws/aws-lambda-nodejs-runtime-interface-client/issues/9
>&2 echo "Watching for changes in $(pwd)..."

# ensure we spawn this as a subprocess, so this script can respond to signals
script='
cp = require("child_process");
fs = require("fs");

proc = null;
function spawn() {
  if (proc) proc.kill();
  proc = cp.spawn("/lambda-entrypoint.sh", ["index.handler"], { stdio: "inherit" });
  proc.on("error", err => {
    console.error(err);
    process.exit(1);
  });
}

watch = (event, path) => {
  process.stderr.write(`[${event}]: ${path}\n`);
  spawn();
}

for (const line of fs.readFileSync(0, "utf-8").trim().split("\n")) {
  process.stderr.write(`fs.watch("${line}")...\n`);
  fs.watch(line.trim(), watch);
}

spawn();
'
find -type f | node -e "$script" &

# blocks indefinitely, since the subprocess above never exits
wait
