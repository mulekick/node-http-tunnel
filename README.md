# HTTP tunneling with Node.js and Docker

This is a network architecture prototype which illustrates the way HTTP tunneling (forwarding of TCP connections) is used to handle the internet traffic. It emulates how internet clients communicate with a production server through a public-facing reverse proxy that manages the connections as well as the incoming and outgoing traffic on behalf of the server. It comes with a full, user-friendly monitoring interface and will provide useful insights on what's actually happening under the hood during http or network transactions at large.

# How it works

**This project was designed with the goal of emulating some actual internet traffic:**
   - Node.js processes are used to emulate each network component : `client`, `proxy` and `server`.
   - Each process runs inside a dedicated Docker container with its own network interface and IP address.
   - Two Docker `bridge` networks are used as well, each with their own subnet mask and gateway:
      1. `ntw-internet`: emulates the internet, to which the `client` containers are connected.
      2. `ntw-local`: emulates the local isolated network of a business/cloud provider, to which the `server` container is connected.
   - The `proxy` container is connected to both `ntw-internet` and `ntw-local` in order to function as a reverse proxy (thus having 2 network interfaces).

**The purpose is also to illustrate the fundamentals of proxied client/server communication, so :**
   - At startup, the `client` process issues a request to `proxy` to open a proxied connection to `server`.
   - It then waits for the `http.ClientRequest` `connect` event to be emitted, thus indicating that the connection is established.
   - From there, all communications between the `client` and `server` processes happen by reading from and writing to the proxied connection's TCP socket.
   - All events occuring on the different processes are written to their respective container's logs in a user-friendly manner.
   - A custom tmux session is used to visualize `client`, `proxy` and `server` containers logs on a single screen and monitor the traffic.

## server container

**The server container emulates a production server running in an isolated network.**

The `server` process can run in two modes :

1. **HTTP mode**
   - A Node.js `http.server` instance runs on top of the proxied connections.
   - Each time a valid HTTP request is received, `server` returns a valid HTTP response with code `200 (OK)`.
   - When an invalid HTTP request is received, `server` returns a valid HTTP response with code `400 (Bad Request)` and closes the proxied connection. 

2. **TCP mode**
   - A Node.js `net.server` instance runs on top of the proxied connections.
   - Each time some data is read from a connection's TCP socket, `server` echoes the received bytes.

## proxy container

**The proxy container emulates a public facing reverse proxy, running in an isolated network but also connected to the internet**

   - It is a Node.js `http.server` instance.
   - It establishes a connection between `client` and `server` containers when issued a `CONNECT` request.
   - Once connected, it returns a TCP socket (Node.js `stream.Duplex`) to the `client`.

*Note: all traffic between `client` and `proxy` containers is secured by TLSv1.3 (a TLS layer has been added between the clients TCP sockets and the Node.js http.server instance handling them inside the proxy). In such a situation, all publicly exposed traffic between the clients and the server is therefore encrypted.*

**The client container emulates a host connected to the internet, sending requests to and receiving responses from the production server through the reverse proxy**

   - It is a Node.js `http.request` instance.
   - It will issue a `CONNECT` request to the `proxy` container at startup.
   - It retrieve a TCP socket (Node.js `stream.Duplex`) once the connection to `server` is established.
   - Afterwards, it performs continuous reads from a specific named pipe and write whatever is read to the TCP socket.

# How to use it

## prerequisites
   - Linux distro or WLS2 (debian 11 recommended)
   - GNU Bash shell (version 5.1.4 recommended)
   - Docker (version 20.10.16 recommended)
   - Openssl (version 1.1.1 recommended)
   - tmux (version 3.1 recommended)
   - git (version 2.30.2 recommended)

## how to install
Navigate to your install directory and type the following commands sequence :
   1. `git clone https://github.com/mulekick/node-http-tunnel.git` to clone the repository.
   2. `cd node-http-tunnel` to cd into it.
   3. `. tunnel.sh tls` to configure the TLS layer by generating a certificate and a private key that will be used by the `proxy` process.
   4. `. tunnel.sh build` to build the Docker images for the `client`, `proxy` and `server` containers.

## how to start
When in the node-http-tunnel directory, type one of the following commands :

- `. tunnel.sh start http`
   - creates networks `ntw-internet` and `ntw-local`
   - starts container `server` in HTTP mode (web server) and attaches it to `ntw-local`
   - starts container `proxy` and attaches it to `ntw-local` and `ntw-internet`
   - starts containers `client-1` and `client-2` and attaches them to `ntw-internet`
   - starts a predefined tmux session allowing you to monitor the containers stdouts and providing you with a spare shell

- `. tunnel.sh start tcp`
   - creates networks `ntw-internet` and `ntw-local`
   - starts container `server` in TCP mode (echo server) and attaches it to `ntw-local`
   - starts container `proxy` and attaches it to `ntw-local` and `ntw-internet`
   - starts containers `client-1` and `client-2` and attaches them to `ntw-internet`
   - starts a predefined tmux session allowing you to monitor the containers stdouts and providing you with a spare shell

## how to create and monitor traffic
   1. Navigate the tmux session to access the available shell (the only window not running a foreground process).
   2. Type `docker exec -it client-1 /bin/bash` to open a shell inside container `client-1` (or `client-2`).
   3. Once inside the container, echo or cat whatever you want into `/src/client-pipe` to have the client send it to the server through the proxied connection.
   4. See the traffic taking place at the TCP socket level between the `client` and `server` containers.

*Note: dont forget that your proxied connection will be terminated if you send anything that is not a valid HTTP message when the `server` container runs in HTTP mode. Some sample well-formatted HTTP messages are provided in /HTTPMSGS, cat these into `/src/client-pipe` to have the server respond with nice Pepe the Frog ASCII art.*

## how to stop
When in the node-http-tunnel directory, type the folowing command:

- `. tunnel.sh stop`
  - stops and removes containers `client-1`, `client-2`, `server` and `proxy` (thus terminating all network connections)
  - removes networks `ntw-internet` and `ntw-local`
  - kills the tmux session (thus terminating all foreground processes)

## Notes
- Basic knowledge of the bash/sh shell commands (at least `cd`, `echo` and `cat`) is required.
- Basic knowledge of tmux navigation commands (C-b up, down, etc ...) is required.
- Reminder : [IETF defined that line endings for HTTP messages must be CRLF](https://datatracker.ietf.org/doc/html/rfc2616). The Node.js HTTP parser won't have it if you do otherwise.
- [What is HTTP tunneling](https://en.wikipedia.org/wiki/HTTP_tunnel).