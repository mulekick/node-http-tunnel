# Use an official node.js runtime as a parent image
FROM node:lts-bullseye-slim

# create /src directory, install busybox
RUN mkdir /src && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install --no-install-recommends -m -y busybox && \
    apt-get clean

# Set the working directory to /src
WORKDIR /src

# Bundle app source
COPY . /src/

# install npm at the global scope, install modules
RUN npm cache clean --force && \
    npm i npm@latest -g && \
    npm install

# override shell
SHELL [ "/bin/bash", "-cli" ]

# clean bash + node script reading pipe
CMD [ "/src/start.sh" ]