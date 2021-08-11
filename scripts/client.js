'use strict';

const
    // ---------------------------------------------------------------------------------
    dashline = `\n---------------------------------`,
    // ---------------------------------------------------------------------------------
    // load modules
    chalk = require(`chalk`),
    {Writable} = require(`stream`),
    http = require(`http`),
    // ---------------------------------------------------------------------------------
    // initialize params
    [ mode ] = process.argv.slice(2),
    msep = mode === `http` ? 0x2d2d2d2d2d : 0x0a,
    options = {
        port: 1337,
        host: `localhost`,
        method: `CONNECT`,
        path: `localhost:8080`,
        headers: {
            [`user-agent`]: `Node-js client`
        }
    },
    // ---------------------------------------------------------------------------------

    // create HTTP CONNECT request
    req = http
        .request(options);

// log PID
process.stdout.write(dashline);
process.stdout.write(`\nclient process running with pid ${ process.pid }`);

// send ...
req.end();

req
    // eslint-disable-next-line no-unused-vars
    .on(`connect`, (res, clientSocket, head) => {
        process.stdout.write(dashline);
        process.stdout.write(`\nclient connected to proxy`);

        // All data, be it HTTP messages or raw bytes, will be written on a TCP socket
        // Let's work with raw buffers
        // clientSocket.setEncoding(`utf8`);
        clientSocket
            // ---------------------------------------------------------------------------------
            .on(`data`, buf => {
                process.stdout.write(dashline);
                process.stdout.write(chalk.black.bgGreen(`\nreading ${ buf.length } bytes on TCP socket :`));
                process.stdout.write(`\n${ buf.toString(`utf8`) }`);
            })
            .on(`error`, err => {
                process.stderr.write(dashline);
                process.stderr.write(chalk.black.bgRedBright(`\nTCP socket emitted an error at ${ new Date().toString() }`));
                process.stderr.write(`\n${ JSON.stringify(err) }\nexiting client with code 1`);
                // Exit process
                // process.exit(1);
            })
            .on(`end`, () => {
                process.stdout.write(dashline);
                process.stdout.write(chalk.black.bgWhite(`\nno more data to read on TCP socket, exiting client with code 0\n`));
                // Exit process
                // process.exit(0);
            });

        const
            // ---------------------------------------------------------------------------------
            // eslint-disable-next-line no-unused-vars
            getwrite = bytes => new Promise((resolve, reject) => {
                // incoming buffer
                process.stdout.write(dashline);
                process.stdout.write(chalk.black.bgYellow(`\nwriting ${ bytes.length } bytes on TCP socket :`));
                process.stdout.write(`\n${ bytes.toString(`utf8`) }`);
                clientSocket.write(bytes, () => resolve());
            }),
            // ---------------------------------------------------------------------------------
            sendwrite = async buf => {
                try {

                    process.stdout.write(dashline);
                    process.stdout.write(chalk.black.bgGreen(`\nreading ${ buf.length } bytes on stdin`));
                    // trigger write of message
                    await getwrite(buf);

                } catch (err) {
                    process.stdout.write(dashline);
                    process.stdout.write(chalk.black.bgRedBright(`\nerror occured writing on TCP socket at ${ new Date().toString() }`));
                    process.stdout.write(`\n${ JSON.stringify(err) }\nexiting client with code 1`);
                    // Exit process
                    // process.exit(1);
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