# HTTP tunneling with Node.js and Docker

This is an implementation of HTTP tunneling (forwarding of clients TCP connections to a server by a proxy) that comes with a full, user-friendly monitoring interface.

It will provide useful insights on what's actually happening under the hood during http or network transactions at large. Architecture-wise, you can picture it as internet clients connecting to a public-facing reverse proxy that will then tunnel (forward) the clients requests to a production server running in a local, isolated network.

# How it works

**This project was designed with the goal of emulating the actual workings of the internet traffic:**
   - Each process involved (clients, proxy, server) runs in a dedicated Docker container.
   - Two Docker `bridge` networks will be involved as well, each with their own subnet mask and gateway :
      1. `ntw-internet`: emulates the internet, to which the clients containers are connected.
      2. `ntw-local`: emulates the local/isolated network of a business/cloud provider, to which the server container is connected.
   - Only the proxy container will be connected to both `ntw-internet` and `ntw-local` in order to function as a reverse proxy.

**The purpose is also to illustrate the fundamentals of proxied client/server communication, so :**
   - The clients processes will listen to the `http.ClientRequest` 'connect' event.
   - From there, all the communications will be done by writing data directly to the proxied TCP connections.
   - All events ocurring on the different processes will be written to their respective container's stdout in a user-friendly manner.
   - A tmux session will be used to keep all containers running in the foreground and visualize their stdouts on a single screen. 

## Role of the server container

**The server container emulates a genuine production server running in an isolated network.**

The server process can run in two modes :

1. **HTTP mode**
   - A Node.js `http.server` instance will run on top of the proxied TCP connections.
   - Each time a valid HTTP request is received, the server will return a valid HTTP response with code `200 (OK)`.
   - If an invalid HTTP request is received, the server will return a valid HTTP response with code `400 (Bad Request)` and close the proxied connection. 

2. **TCP mode**
   - A Node.js `net.server` instance will run on top of the proxied TCP connections.
   - Each time some data is read from the TCP socket, the server will echo the received bytes.

## Role of the proxy container

**The proxy container emulates a public facing reverse proxy, running in an isolated network but connected to the internet**

   - It is a Node.js `http.server` instance.
   - It will establish a connection between the client and the echo server when issued a `CONNECT` request.
   - Once connected, it will return a TCP socket (Node.js `stream.Duplex`) to the client.

*Note: all traffic between the clients containers and the proxy is secured by TLSv1.3 (a TLS layer has been added between the clients TCP sockets and the Node.js http.server instance handling them on the proxy). In such a situation, all publicly exposed traffic between the clients and the production server is therefore encrypted.*

## Role of the client container

**The client container emulates a host connected to the internet, sending requests to and receiving responses from the production server through the reverse proxy**

   - It is a Node.js `http.request` instance.
   - It will issue a `CONNECT` request to the proxy on startup and retrieve a TCP socket.
   - It will perform nonstop reads from a dedicated named pipe, and write whatever is read to the TCP socket.

# How to run it

## prerequisites
   - Linux distro or WLS2 (debian 11 recommended)
   - GNU Bash shell (version 5.1.4 recommended)
   - Docker (version 20.10.16 recommended)
   - Openssl (version 1.1.1 recommended)
   - tmux (version 3.1 recommended)
   - git (version 2.30.2 recommended)

## how to install
Navigate to your install directory and type : `git clone https://github.com/mulekick/node-http-tunnel.git`

## post-installation steps
When in the node-http-tunnel directory, type :
1. `. tunnel.sh tls`: configure TLS by generating a certificate and a private key for the proxy.
2. `. tunnel.sh build`: build the Docker images for the client, proxy and server containers.

## how to start
When in the node-http-tunnel directory, type one of the following commands :

- `. tunnel.sh start http`
   1. creates a server container running in HTTP mode (web server)
   2. creates a proxy container
   3. creates 2 client containers
   4. starts a predefined tmux session allowing you to monitor the containers stdouts and providing you with a spare shell

- `. tunnel.sh start tcp`
   1. creates a server container running in TCP mode (echo server)
   2. creates a proxy container
   3. creates 2 client container
   4. starts a predefined tmux session allowing you to monitor the containers stdouts and providing you with a spare shell























In both cases, a named pipe will be created for each client and redirected to their stdins, so echo or cat whatever you want to this named pipe to have the client send it to the echo server. This is done so as to keep client's stdout in the foreground and view the events occuring there. An explicit invite containing the named pipe's path will be displayed on client stdout at startup.

## how to stop
When in the node-http-tunnel directory, type :

- **npm run exit**
  - kills the tmux session (thus terminating all foreground processes and network connections)
  - kills all background processes 
  - cleans up the files in /tmp

## Notes
- Some basic knowledge of tmux navigation commands (C-b up, down, etc ...) is required.
- Some sample well-formatted HTTP messages are hereby provided in /HTTPMSGS (cat these directly in the client's named pipes when the remote server runs in HTTP mode).
- Reminder : [IETF defined that line endings for HTTP messages must be CRLF](https://datatracker.ietf.org/doc/html/rfc2616). The Node.js HTTP parser won't have it if you do otherwise.
- [What is HTTP tunneling](https://en.wikipedia.org/wiki/HTTP_tunnel)
