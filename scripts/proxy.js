/* eslint-disable no-unused-vars */
'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    chalk = require(`chalk`),
    {createServer} = require(`https`),
    {connect} = require(`net`),
    {readFileSync} = require(`fs`),
    // ---------------------------------------------------------------------------------
    // initialize params
    [ h, p ] = [ `localhost`, 1443 ],
    // TLSv1.3 cipher suite: TLS_AES_128_GCM_SHA256 TLSv1.3 Kx=any Au=any Enc=AESGCM(128) Mac=AEAD
    // provide ECDSA private key, x509 certificate with ECDSA public key, ECDH parameters for key exchange
    // ECDSA key pair generated using curve prime256v1
    // Named curve to use for ECDH key agreement is P-256
    tlsOpts = {
        // tls.Server options
        ciphers: `TLS_AES_128_GCM_SHA256`,
        key: readFileSync(`./.node.http.tunnel.ecdsa.prime256v1`),
        cert: readFileSync(`./.node.http.tunnel.ecdsa.prime256v1.crt`),
        dhparam: readFileSync(`./.node.http.tunnel.ecdh.prime256v1`),
        ecdhCurve: `prime256v1`,
        maxVersion: `TLSv1.3`,
        minVersion: `TLSv1.3`,
        // force TLS simple mode
        requestCert: false,
        // net.Server options
        allowHalfOpen: false,
        pauseOnConnect: false
    },
    // ---------------------------------------------------------------------------------
    timestamp = () => {
        const
            d = new Date(),
            [ hr, mn, ss ] = [ d.getHours(), d.getMinutes(), d.getSeconds() ]
                .map(x => (`${ x }`.length === 1 ? `0${ x }` : `${ x }`));
        return `${ hr }:${ mn }:${ ss }.${ d.getMilliseconds() }`;
    },
    dashline = `\n---------------------------------`,
    // ---------------------------------------------------------------------------------
    // Create HTTPS/TLS tunneling proxy
    proxy = createServer(tlsOpts, (req, res) => {
        // Handle CONNECT requests
        res.writeHead(200, {'Content-Type': `text/plain`});
        res.end();
    });

// Setup server listeners
proxy
    // handshake begins
    .on(`connection`, () => {
        process.stdout.write(dashline);
        process.stdout.write(`\n${ timestamp() } > TCP connection established, beginning TLS handshake.`);
    })
    // handshake complete
    .on(`secureConnection`, tlsSocket => {
        const
            {address, family, port} = tlsSocket.address(),
            {name, standardName, version} = tlsSocket.getCipher();
        process.stdout.write(`\n${ timestamp() } > TLS handshake completed.`);
        process.stdout.write(`\n${ timestamp() } > TLS socket up at: ${ address }:${ port }, cipher suite is: ${ name } (${ version })`);
    })
    .on(`tlsClientError`, (err, tlsSocket) => {
        process.stderr.write(`\n${ timestamp() } > An error occured before a secure connection was established: ${ err.message }`);
        process.stderr.write(dashline);
    })
    .on(`connect`, (req, clientSocket, head) => {
        const
            // Extract remote host from request url
            {port, hostname} = new URL(`http://${ req.url }`);

        process.stdout.write(`\n${ timestamp() } > client connected over secure channel.`);
        process.stdout.write(`\n${ timestamp() } > received tunneling request from client ${ req.headers[`user-agent`] } for remote ${ hostname }:${ port }`);

        const
            // Connect to remote host
            remoteSocket = connect(port || 80, hostname, () => {

                // eslint-disable-next-line prefer-template
                const msg = `HTTP/1.1 200 Connection Established\r\n` +
                            `Proxy-agent: Node.js-Proxy\r\n` +
                            `\r\n`;

                // Send confirmation to client
                clientSocket.write(msg);

                // Write first packet to remote host
                remoteSocket.write(head);

                // Pipe remote host TCP socket to client TCP socket
                process.stdout.write(`\n${ timestamp() } > piping socket ${ remoteSocket.remoteAddress }:${ remoteSocket.remotePort } (remote) to socket ${ clientSocket.remoteAddress }:${ clientSocket.remotePort } (client)`);
                remoteSocket.pipe(clientSocket);

                // Pipe client TCP socket to remote host TCP socket
                process.stdout.write(`\n${ timestamp() } > piping socket ${ clientSocket.remoteAddress }:${ clientSocket.remotePort } (client) to socket ${ remoteSocket.remoteAddress }:${ remoteSocket.remotePort } (remote)`);
                clientSocket.pipe(remoteSocket);

                process.stdout.write(chalk.black.bgBlue(`\n${ timestamp() } > HTTP tunnel to remote host established.`));
            });

        // Handle error and closing events
        [ remoteSocket, clientSocket ]
            .forEach(x => {
                x
                    // eslint-disable-next-line max-nested-callbacks
                    .on(`error`, err => {
                        process.stderr.write(dashline);
                        process.stderr.write(chalk.black.bgRedBright(`\n${ timestamp() } > socket ${ x.remoteAddress }:${ x.remotePort } emitted an error : ${ err.message }.`));
                    })
                    // eslint-disable-next-line max-nested-callbacks
                    .on(`close`, () => {
                        process.stdout.write(dashline);
                        process.stdout.write(`\n${ timestamp() } > socket ${ x.remoteAddress }:${ x.remotePort } closed.`);
                    });
            });

    });

// Now that proxy is running
proxy.listen(p, h, () => {
    process.stdout.write(dashline);
    process.stdout.write(`\n${ timestamp() } > proxy server running with pid ${ process.pid } at https://${ h }:${ p }`);
});