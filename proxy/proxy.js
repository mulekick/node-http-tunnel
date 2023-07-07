/* eslint-disable no-shadow, no-unused-vars, node/no-process-env */

// import primitives
import process from "node:process";
import {createServer} from "node:https";
import {connect} from "node:net";
import {readFileSync} from "node:fs";
import {URL} from "node:url";

// config module
import {chalk, timestamp, dashline} from "./lib.js";

const
    // ---------------------------------------------------------------------------------
    // initialize params
    [ h, p ] = [ `0.0.0.0`, 443 ],
    // TLSv1.3 cipher suite: TLS_AES_128_GCM_SHA256 TLSv1.3 Kx=any Au=any Enc=AESGCM(128) Mac=AEAD
    // provide ECDSA private key, x509 certificate with ECDSA public key
    // Named curve for ECDSA key pair generation and ECDH key agreement is prime256v1
    tlsOpts = {
        // tls.Server options
        ciphers: `TLS_AES_128_GCM_SHA256`,
        key: readFileSync(`/src/.node.http.tunnel.ecdsa.prime256v1`),
        cert: readFileSync(`/src/.node.http.tunnel.ecdsa.prime256v1.crt`),
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
        process.stdout.write(`${ timestamp() } > TCP connection established with client, beginning TLS handshake.\n`);
    })
    // handshake complete
    .on(`secureConnection`, tlsSocket => {
        const
            // get TLS cipher suite
            {name, standardName, version} = tlsSocket.getCipher();
        process.stdout.write(`${ timestamp() } > TLS handshake completed, cipher suite is: ${ name } (${ version }).\n`);
    })
    .on(`tlsClientError`, (err, tlsSocket) => {
        process.stderr.write(`${ timestamp() } > An error occured before a secure connection was established: ${ err.message }\n`);
        process.stderr.write(dashline);
    })
    .on(`connect`, (req, clientSocket, head) => {
        const
            // extract host name
            {hostname} = new URL(`http://${ req.url }`),
            // extract port
            port = req.port || 80;

        process.stdout.write(`${ timestamp() } > client connected over secure channel.\n`);
        process.stdout.write(`${ timestamp() } > received tunneling request from client '${ req.headers[`user-agent`] }' for server '${ hostname }:${ port }'\n`);

        const
            // Connect to remote host
            remoteSocket = connect(port, hostname, () => {

                // eslint-disable-next-line prefer-template
                const msg = `HTTP/1.1 200 Connection Established\r\n` +
                            `Proxy-agent: Node.js-Proxy\r\n` +
                            `\r\n`;

                // Send confirmation to client
                clientSocket.write(msg);

                // Write first packet to remote host
                remoteSocket.write(head);

                // Pipe remote host TCP socket to client TCP socket
                process.stdout.write(`${ timestamp() } > piping socket ${ remoteSocket.remoteAddress }:${ remoteSocket.remotePort } (server) to socket ${ clientSocket.remoteAddress }:${ clientSocket.remotePort } (client)\n`);
                remoteSocket.pipe(clientSocket);

                // Pipe client TCP socket to remote host TCP socket
                process.stdout.write(`${ timestamp() } > piping socket ${ clientSocket.remoteAddress }:${ clientSocket.remotePort } (client) to socket ${ remoteSocket.remoteAddress }:${ remoteSocket.remotePort } (remote)\n`);
                clientSocket.pipe(remoteSocket);

                process.stdout.write(chalk.black.bgBlue(`${ timestamp() } > HTTP tunnel to server '${ hostname }' established.\n`));
            });

        // Handle error and closing events
        [ remoteSocket, clientSocket ]
            .forEach(x => {
                x
                    // eslint-disable-next-line max-nested-callbacks
                    .on(`error`, err => {
                        process.stderr.write(dashline);
                        process.stderr.write(chalk.black.bgRedBright(`${ timestamp() } > socket ${ x.remoteAddress }:${ x.remotePort } emitted an error : ${ err.message }.\n`));
                    })
                    // eslint-disable-next-line max-nested-callbacks
                    .on(`close`, () => {
                        process.stdout.write(dashline);
                        process.stdout.write(`${ timestamp() } > socket ${ x.remoteAddress }:${ x.remotePort } closed.\n`);
                    });
            });

    });

// Now that proxy is running
proxy.listen(p, h, () => {
    process.stdout.write(dashline);
    process.stdout.write(`${ timestamp() } > proxy running with pid ${ process.pid } at https://${ h }:${ p }\n`);
});