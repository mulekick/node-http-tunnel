# HTTP tunneling with Node.js
This is a Node.js implementation of HTTP tunneling (forwarding of TCP connections by a proxy server) between some clients and an echo server that comes with a full, user-friendly monitoring interface.

That will provide useful insights on what's actually happening under the hood during http or network transactions at large.

**Update 01/04/2022:** client/proxy HTTP sessions are now secured by TLSv1.3, ie a TLS layer has been added at the proxy level between the clients TCP sockets and the Node.js http.server instance handling them. This is relevant architecture-wise as you picture clients connecting to a public-facing reverse proxy that will then tunnel (forward) the requests to production servers running in a local, isolated network. In such a situation, all publicly exposed traffic between the clients and the production servers is therefore encrypted.

# How it works

**The purpose here is to illustrate the fundamentals of proxied client/server communication, so :**
   - The clients processes will listen to the http.ClientRequest 'connect' event.
   - From there, all the communications will be done by writing data directly to the proxied TCP connections.
   - All events ocurring on the different processes will be written to their respective stdout's in a user-friendly manner.
   - A tmux session will be used to keep all processes running in the foreground and view them on a single screen. 

## Role of the echo server

The echo server can run in two modes :

1. **HTTP mode**
   - A Node.js http.server instance will run on top of the TCP connection.
   - Echoing will occur each time a valid HTTP request message is received.

2. **TCP mode**
   - A Node.js net.server instance will run on top of the TCP connection.
   - Echoing will occur each time some data is read from the TCP socket.

## Role of the proxy server
   - It is a Node.js http.server instance
   - It will establish a connection between the client and the echo server when issued a CONNECT request 
   - Once connected, it will return a TCP socket (Node.js Duplex stream) to the client

## Role of the client process
   - It is a Node.js http.request instance
   - It will issue a CONNECT request to the proxy on startup and retrieve a TCP socket
   - It will afterwards write any data buffered in stdin to the TCP socket each time a specific sequence of bytes is received
   - If the server runs in HTTP mode, the sequence of bytes to send to client's stdin to trigger the write is -----, otherwise it is LF 

# How to run it

## prerequisites
   - Linux distro or WLS2 (debian 10.4.0 recommended)
   - GNU Bash shell (version 5.0.3 recommended)
   - node.js (version 14.17.4 recommended)
   - tmux (version 2.8 recommended)
   - npm (version 7.20.3 recommended)
   - git (version 2.20.1 recommended)

## how to install
Navigate to your install directory and type :
   - git clone https://github.com/mulekick/node-http-tunnel.git
   - cd node-http-tunnel
   - npm install

## how to start
When in the node-http-tunnel directory, type one of the following commands :

- **npm run tunnel-http**
   1. starts the echo server in HTTP mode on localhost:8080
   2. starts the proxy server on localhost:1443
   3. starts 2 client processes

- **npm run tunnel-tcp**
   1. starts the echo server in TCP mode on localhost:8080
   2. starts the proxy server on localhost:1443
   3. starts 2 client processes

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
