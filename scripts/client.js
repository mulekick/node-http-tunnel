'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    chalk = require(`chalk`),
    {Writable} = require(`stream`),
    {request} = require(`https`),
    // ---------------------------------------------------------------------------------
    // initialize params
    [ mode ] = process.argv.slice(2),
    msep = mode === `http` ? 0x2d2d2d2d2d : 0x0a,
    options = {
        port: 1443,
        host: `localhost`,
        method: `CONNECT`,
        path: `localhost:8080`,
        headers: {
            [`user-agent`]: `Node-js client`
        },
        // Allow self-signed certificate
        rejectUnauthorized: false
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

    // create HTTP CONNECT request
    req = request(options);

// log PID
process.stdout.write(dashline);
process.stdout.write(`\n${ timestamp() } > client process running with pid ${ process.pid }`);

// send ...
req.end();

req
    // eslint-disable-next-line no-unused-vars
    .on(`connect`, (res, clientSocket, head) => {

        process.stdout.write(`\n${ timestamp() } > client connected to proxy, TLS socket up at: ${ clientSocket.localAddress }:${ clientSocket.localPort }`);

        // All data, be it HTTP messages or raw bytes, will be written on a TCP socket
        // Let's work with raw buffers
        // clientSocket.setEncoding(`utf8`);
        clientSocket
            // ---------------------------------------------------------------------------------
            .on(`data`, buf => {
                process.stdout.write(chalk.black.bgGreen(`\n${ timestamp() } > reading ${ buf.length } bytes on TCP socket:`));
                process.stdout.write(`\n${ buf.toString(`utf8`) }`);
            })
            .on(`error`, err => {
                process.stderr.write(chalk.black.bgRedBright(`\n${ timestamp() } > TCP socket emitted an error:`));
                process.stderr.write(`\n${ err.message }`);
            })
            .on(`end`, () => {
                process.stdout.write(chalk.black.bgWhite(`\n${ timestamp() } > no more data to read on TCP socket, client still up`));
            });

        const
            // ---------------------------------------------------------------------------------
            // eslint-disable-next-line no-unused-vars
            getwrite = bytes => new Promise((resolve, reject) => {
                // incoming buffer
                process.stdout.write(chalk.black.bgYellow(`\n${ timestamp() } > writing ${ bytes.length } bytes on TCP socket:`));
                process.stdout.write(`\n${ bytes.toString(`utf8`) }`);
                clientSocket.write(bytes, () => resolve());
            }),
            // ---------------------------------------------------------------------------------
            sendwrite = async buf => {
                try {

                    process.stdout.write(chalk.black.bgGreen(`\n${ timestamp() } > reading ${ buf.length } bytes on stdin:`));
                    process.stdout.write(`\n${ buf.toString(`utf8`) }`);
                    // trigger write of message
                    await getwrite(buf);

                } catch (err) {
                    process.stdout.write(chalk.black.bgRedBright(`\n${ timestamp() } > error occured during TCP socket write:`));
                    process.stdout.write(`\n${ err.message }`);
                }
            };
        let
            // ---------------------------------------------------------------------------------
            // init empty member buffer
            currentMessage = Buffer.from(``);
        const
            // ---------------------------------------------------------------------------------
            // writable stream
            linesextractor = new Writable({
                // encode incoming strings into buffers
                decodeStrings: true,
                // utf8 encoding
                defaultEncoding: `utf8`,
                // only strings allowed
                objectMode: false,
                // emit close
                emitClose: true,
                // process incoming buffer
                write: (buf, encoding, callback) => {
                    let bytes = buf;
                    // if there's at least a new line in buffer
                    if (bytes.indexOf(msep) >= 0) {
                        let i = null;
                        // isolate lines
                        while ((i = bytes.indexOf(msep)) >= 0) {
                            // add line remainder to member buffer
                            currentMessage = Buffer.concat([ currentMessage, bytes.slice(0, i) ]);
                            // process member buffer
                            if (currentMessage.length > 0)
                                // trigger write on TCP socket
                                sendwrite(currentMessage);
                            // Empty member buffer
                            currentMessage = Buffer.from(``);
                            // Remove end of line
                            bytes = bytes.slice(i + 1);
                        }
                    }
                    // Add beginning of last line to member buffer
                    currentMessage = Buffer.concat([ currentMessage, bytes ]);
                    // Success
                    callback(null);
                },
                // send remaining data (we assume that all messages are valid)
                final: callback => {
                    // process member buffer
                    if (currentMessage.length > 0)
                        // trigger write on TCP socket
                        sendwrite(currentMessage);
                    // success
                    callback();
                }
            });

        // pipe stdin to lines extractor
        process.stdin
            .pipe(linesextractor);
    });
// ---------------------------------------------------------------------------------