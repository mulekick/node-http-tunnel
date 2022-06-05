#!/bin/bash

cpipe="$(pwd)/client-pipe"

# create named pipe
mkfifo "$cpipe"

if [[ $DEBUG = '1' ]]; then
    # redirect stderr to stdout
    node --inspect=0.0.0.0:9229 client.js 2>&1
else
    # redirect stderr to stdout
    node client.js 2>&1
fi