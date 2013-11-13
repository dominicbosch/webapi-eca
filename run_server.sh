#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
node $DIR/js/server > $DIR/server.log 2>&1 &
