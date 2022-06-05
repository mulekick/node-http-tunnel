// import primitives
import {request} from "https";
// import modules
import {fileStreamer} from "@mulekick/file-streamer";
// config module
import {chalk, timestamp, dashline, writablePipe} from "./lib.js";

const
    // ---------------------------------------------------------------------------------
    // initialize params
    {PROXY, REMOTE} = process.env,
    // ---------------------------------------------------------------------------------
    // resolve as soon as proxy is available
    proxyUp = () =>
        new Promise((resolve, reject) => {
            let
                // timeout object
                tmo = null;
            const
                // create HTTP GET request
                req = () => request({
                    // initialize options
                    port: 443,
                    host: PROXY,
                    method: `GET`,
                    path: `/`,
                    headers: {
                        [`user-agent`]: `Node-js client container`
                    },
                    // allow 1 second to proxy to connect
                    timeout: 1e3,
                    // Allow self-signed certificate
                    rejectUnauthorized: false
                })
                    .on(`response`, response => {
                        const
                            // proxy response code
                            {statusCode} = response;
                        // Terminate attempts ...
                        clearInterval(tmo);
                        // resolve promise
                        if (statusCode === 200)
                            resolve();
                        // reject promise
                        else
                            reject(new Error(`proxy returned code ${ statusCode }`));
                    })
                    .on(`error`, err => {
                        // ignore getaddrinfo ENOTFOUND (proxy not connected to network yet)
                        if (err.message !== `getaddrinfo ENOTFOUND ${ PROXY }`) {
                            // Terminate attempts ...
                            clearInterval(tmo);
                            // reject promise
                            reject(new Error(`request emitted ${ err.message }`));
                        }
                    })
                    // send ...
                    .end();
            // execute every 2 seconds
            tmo = setInterval(req, 2000);
        });
    // ---------------------------------------------------------------------------------

(async() => {

    try {

        // log PID
        process.stdout.write(dashline);
        process.stdout.write(`${ timestamp() } > client process running with pid ${ process.pid }\n`);

        await proxyUp();

        // log result
        process.stdout.write(dashline);
        process.stdout.write(`${ timestamp() } > success: proxy is up and available\n`);

        // create HTTP CONNECT request
        request({
            port: 443,
            host: PROXY,
            method: `CONNECT`,
            path: `${ REMOTE }:80`,
            headers: {
                [`user-agent`]: `Node-js client container`
            },
            // Allow self-signed certificate
            rejectUnauthorized: false
        })
            // eslint-disable-next-line no-unused-vars
            .on(`connect`, (res, clientSocket, head) => {

                try {

                    process.stdout.write(`${ timestamp() } > client connected to proxy, TLS socket up at: ${ clientSocket.localAddress }:${ clientSocket.localPort }\n`);

                    // All data, be it HTTP messages or raw bytes, will be written on a TCP socket
                    // Let's work with raw buffers
                    // clientSocket.setEncoding(`utf8`);
                    clientSocket
                        // attach handlers
                        .on(`data`, buf => {
                            process.stdout.write(chalk.black.bgGreen(`${ timestamp() } > reading ${ buf.length } bytes on TCP socket:\n`));
                            process.stdout.write(`${ buf.toString(`utf8`) }`);
                        })
                        .on(`error`, err => {
                            process.stderr.write(chalk.black.bgRedBright(`${ timestamp() } > TCP socket emitted an error:\n`));
                            process.stderr.write(`${ err.message }\n`);
                        })
                        .on(`close`, () => {
                            // the TCP socket will only be closed by the remote host when it receives an invalid HTTP request while running in HTTP mode
                            process.stdout.write(chalk.black.bgWhite(`${ timestamp() } > TCP socket closed, client still up.\n`));
                        });

                    const
                        // named pipe
                        cPipe = `${ process.cwd() }/client-pipe`,
                        // reader (4 bytes)
                        streamer = new fileStreamer({bufSize: 2048, errorOnMissing: true, closeOnEOF: false});

                    streamer
                        // open
                        .open(cPipe)
                        // stream file contents and pipe
                        .on(`file`, fstr => fstr.stream().pipe(new writablePipe(clientSocket)));

                    // close
                    process.on(`SIGTERM`, () => streamer.unstream().close());

                } catch (err) {
                    // output message to stderr
                    process.stderr.write(dashline);
                    process.stderr.write(`error occured: ${ err.message }.\n`);
                }

            })
            .on(`error`, err => {
                // output message to stderr
                process.stderr.write(dashline);
                process.stderr.write(`error occured: ${ err.message }.\n`);
            })
            // send ...
            .end();

    } catch (err) {
        // output message to stderr
        process.stderr.write(dashline);
        process.stderr.write(`error occured: ${ err.message }.\n`);
    }

})();
// ---------------------------------------------------------------------------------