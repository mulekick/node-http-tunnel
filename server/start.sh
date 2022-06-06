#!/bin/bash

if [[ $DEBUG = '1' ]]; then
    # redirect stderr to stdout
    node --inspect=0.0.0.0:9229 server.js 2>&1
else
    # redirect stderr to stdout
    node server.js 2>&1
fi