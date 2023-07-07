# Use an official node.js runtime as a parent image
FROM node:lts-bullseye-slim

# install npm at the global scope
RUN npm cache clean --force && \
    npm i npm@latest -g && \
    # create /src directory
    mkdir -p /src

# bundle app source
COPY . /src/

# Set the working directory to /src
WORKDIR /src

# install modules
RUN npm install --omit=dev

# override shell
SHELL [ "/bin/bash", "-cli" ]

# clean bash + node script reading pipe
CMD [ "/src/start.sh" ]