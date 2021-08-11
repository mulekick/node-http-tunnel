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
    [ mode ] = process.argv.slice(2),
    p = 8080,                        // port
    s = `localhost`,                // server
    kat = 6e4;                      // HTTP keep alive timeout

let
    srv = null;

if (mode === `http`) {
    // ============= RUN AS HTTP SERVER =============
    // Will only accept valid http messages
    srv = http.createServer();
    srv
        .on(`connection`, () => {
            process.stdout.write(dashline);
            process.stdout.write(`\nclient connected, http tunnel established from proxy at ${ new Date().toString() }`);
        })
        .on(`request`, (req, res) => {
            const
                {method, url, headers} = req;

            process.stdout.write(dashline);
            process.stdout.write(chalk.black.bgMagenta(`\nreceived ${ method } request for ${ url } from : ${ headers[`useragent`] }`));

            const
                // create HTTP response message
                body = `remote host serving ${ method } request for ${ url } at ${ new Date().toString() }\n\n`,
                buf = Buffer.from(body, `utf8`);

            // send headers ...
            res.writeHead(200, {
                // HTTP dates are always expressed in GMT, never in local time
                [`Date`]: `${ new Date().toGMTString() }`,
                [`Connection`]: `keep-alive`,
                [`Server`]: `Node.js-Remote host`,
                [`Content-Type`]: `text/plain`,
                [`Content-Length`]: `${ body.length }`
            });

            process.stdout.write(dashline);
            process.stdout.write(chalk.black.bgYellow(`\nheaders sent, writing ${ buf.length } bytes on TCP socket`));
            process.stdout.write(`\n${ buf.toString(`utf8`) }`);

            // send response
            res.end(buf);
        })
        .on(`clientError`, (err, remoteSocket) => {
            const
                {bytesParsed, code, reason, rawPacket} = err,
                // error message
                msg = `\nbytes parsed : ${ bytesParsed }` +
                      `\ncode : ${ code }, reason ${ reason }` +
                      `\ndata :\n${ Buffer.from(rawPacket).toString(`utf8`) }`;

            // error originated from client so log to stdout
            process.stdout.write(dashline);
            process.stdout.write(chalk.black.bgRedBright(`\nTCP socket emitted an error at ${ new Date().toString() }`));
            process.stdout.write(msg);
            // Write proper HTTP response to client, regardless of what was received
            remoteSocket.end(Buffer.from(`HTTP/1.1 400 Bad Request\r\n\r\n`, `utf8`));
        });

    // set socket timeout
    srv.keepAliveTimeout = kat;

} else if (mode === `tcp`) {
    // ============== RUN AS TCP SERVER =============
    // Will accept anything
    srv = net.createServer({allowHalfOpen: false, pauseOnConnect: false});
    srv
        .on(`connection`, remoteSocket => {
            process.stdout.write(dashline);
            process.stdout.write(`\nclient connected, http tunnel established from proxy at ${ new Date().toString() }`);

            remoteSocket
                .on(`data`, buf => {
                    process.stdout.write(dashline);
                    process.stdout.write(chalk.black.bgGreen(`\nreading ${ buf.length } bytes on TCP socket :`));
                    process.stdout.write(`\n${ buf.toString(`utf8`) }`);

                    const
                        msg = `remote host echoing bytes received from ${ remoteSocket.remoteAddress }:${ remoteSocket.remotePort } at ${ new Date().toGMTString() } :` +
                              `\n${ buf.toString(`utf8`) }`,
                        ret = Buffer.from(msg, `utf8`);

                    process.stdout.write(dashline);
                    process.stdout.write(chalk.black.bgYellow(`\nwriting ${ ret.length } bytes on TCP socket :`));
                    process.stdout.write(`\n${ ret.toString(`utf8`) }`);
                    // Write response to client
                    remoteSocket.write(ret);
                })
                .on(`error`, err => {
                    process.stderr.write(dashline);
                    process.stderr.write(chalk.black.bgRedBright(`\nTCP socket emitted an error at ${ new Date().toString() }`));
                    process.stderr.write(`\n${ JSON.stringify(err) }\nexiting remote host with code 1`);
                    // Exit process
                    // process.exit(1);
                })
                .on(`end`, () => {
                    process.stdout.write(dashline);
                    process.stdout.write(chalk.black.bgWhite(`\nno more data to read on TCP socket, ending TCP socket writes, remote host still up`));
                    // Terminares
                    remoteSocket.end();
                });
        })
        .on(`error`, err => {
            process.stderr.write(dashline);
            process.stderr.write(chalk.black.bgRedBright(`\nerror occured on TCP server :`));
            process.stderr.write(`\n${ JSON.stringify(err) }\nexiting remote host with code 1`);
            // Exit process
            process.exit(1);
        });

} else {
    // ============== DON'T RUN AT ALL =============
    process.stdout.write(dashline);
    process.stdout.write(chalk.black.bgRedBright(`\nno server mode specified, exiting remote host with code 1`));
    // Exit process
    process.exit(1);
}

srv.listen(p, s, () => {
    process.stdout.write(dashline);
    process.stdout.write(`\nremote host running at with pid ${ process.pid } http://${ s }:${ p }`);
});