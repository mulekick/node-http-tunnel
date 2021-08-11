'use strict';

const
    // ---------------------------------------------------------------------------------
    dashline = `\n---------------------------------`,
    // ---------------------------------------------------------------------------------
    // load modules
    chalk = require(`chalk`),
    http = require(`http`),
    net = require(`net`),
    // ---------------------------------------------------------------------------------
    // initialize params
    p = 1337,                        // port
    s = `localhost`,                // server
    // ---------------------------------------------------------------------------------

    // Create HTTP tunneling proxy
    // Handle HTTP CONNECT requests
    proxy = http
        .createServer((req, res) => {
            res.writeHead(200, {'Content-Type': `text/plain`});
            res.end();
        });

proxy
    .on(`connect`, (req, clientSocket, head) => {

        process.stdout.write(dashline);
        process.stdout.write(`\nclient connected at ${ new Date().toString() }`);

        const
            // Extract remote host from request url
            {port, hostname} = new URL(`http://${ req.url }`);

        process.stdout.write(dashline);
        process.stdout.write(chalk.black.bgBlue(`\nreceived tunneling request from client ${ req.headers[`user-agent`] } for remote ${ hostname }:${ port }`));

        const
            // Connect to remote host
            remoteSocket = net.connect(port || 80, hostname, () => {

                // eslint-disable-next-line prefer-template
                const msg = `HTTP/1.1 200 Connection Established\r\n` +
                            `Proxy-agent: Node.js-Proxy\r\n` +
                            `\r\n`;

                // Send confirmation to client
                clientSocket.write(msg);

                // Write first packet to remote host
                remoteSocket.write(head);

                // Pipe remote host TCP socket to client TCP socket
                process.stdout.write(`\npiping socket ${ remoteSocket.remoteAddress }:${ remoteSocket.remotePort } (remote) to socket ${ clientSocket.remoteAddress }:${ clientSocket.remotePort } (client)`);
                remoteSocket.pipe(clientSocket);

                // Pipe client TCP socket to remote host TCP socket
                process.stdout.write(`\npiping socket ${ clientSocket.remoteAddress }:${ clientSocket.remotePort } (client) to socket ${ remoteSocket.remoteAddress }:${ remoteSocket.remotePort } (remote)`);
                clientSocket.pipe(remoteSocket);

                process.stdout.write(chalk.black.bgBlue(`\nHTTP tunnel to remote host established at ${ new Date().toString() }`));
            });

        // Handle error and closing events
        [ remoteSocket, clientSocket ]
            .forEach(x => {
                x
                    // eslint-disable-next-line max-nested-callbacks
                    .on(`error`, err => {
                        process.stderr.write(dashline);
                        process.stderr.write(chalk.black.bgRedBright(`\nsocket ${ x.remoteAddress }:${ x.remotePort } emitted an error : ${ JSON.stringify(err) } at ${ new Date().toString() }`));
                    })
                    // eslint-disable-next-line max-nested-callbacks
                    .on(`close`, () => {
                        process.stdout.write(dashline);
                        process.stdout.write(`\nsocket ${ x.remoteAddress }:${ x.remotePort } closed at ${ new Date().toString() }`);
                    });
            });

    });

// Now that proxy is running
proxy.listen(p, s, () => {
    process.stdout.write(dashline);
    process.stdout.write(`\nproxy server running with pid ${ process.pid } at http://${ s }:${ p }`);
});