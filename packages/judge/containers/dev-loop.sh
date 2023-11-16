#!/bin/sh

# NOTE: workaround to let us restart the lambda handler when we change files
# without having to restart the docker image
# see: https://github.com/aws/aws-lambda-nodejs-runtime-interface-client/issues/9
>&2 echo "Watching for changes in $(pwd)..."

# ensure we spawn this as a subprocess, so this script can respond to signals
(
  while true; do
    /lambda-entrypoint.sh index.handler & pid=$!
    >&2 inotifywait -e modify -e move -e create -e delete -e attrib --recursive --quiet `pwd`
    kill $pid
    wait
    pid=
  done
) &

# blocks indefinitely, since the subprocess above never exits
wait
