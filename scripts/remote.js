'use strict';

const
    // ---------------------------------------------------------------------------------
    // load modules
    chalk = require(`chalk`),
    http = require(`http`),
    net = require(`net`),
    // ---------------------------------------------------------------------------------
    // initialize params
    [ mode ] = process.argv.slice(2),
    [ h, p ] = [ `localhost`, 8080 ],
    // HTTP keep alive timeout
    kat = 6e4,
    // ---------------------------------------------------------------------------------
    timestamp = () => {
        const
            d = new Date(),
            [ hr, mn, ss ] = [ d.getHours(), d.getMinutes(), d.getSeconds() ]
                .map(x => (`${ x }`.length === 1 ? `0${ x }` : `${ x }`));
        return `${ hr }:${ mn }:${ ss }.${ d.getMilliseconds() }`;
    },
    dashline = `\n---------------------------------`;
    // ---------------------------------------------------------------------------------

let
    srv = null;

if (mode === `http`) {
    // ============= RUN AS HTTP SERVER =============
    // Will only accept valid http messages
    srv = http.createServer();
    srv
        .on(`connection`, () => {
            process.stdout.write(`\n${ timestamp() } > client connected, http tunnel established from proxy.`);
        })
        .on(`request`, (req, res) => {
            const
                {method, url, headers} = req;

            process.stdout.write(chalk.black.bgMagenta(`\n${ timestamp() } > received ${ method } request for ${ url } from : ${ headers[`useragent`] }.`));

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

            process.stdout.write(chalk.black.bgYellow(`\n${ timestamp() } > headers sent, writing ${ buf.length } bytes on TCP socket`));
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
            process.stdout.write(chalk.black.bgRedBright(`\n${ timestamp() } > TCP socket emitted an error:`));
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

            process.stdout.write(`\n${ timestamp() } > client connected, http tunnel established from proxy.`);

            remoteSocket
                .on(`data`, buf => {
                    process.stdout.write(chalk.black.bgGreen(`\n${ timestamp() } > reading ${ buf.length } bytes on TCP socket:`));
                    process.stdout.write(`\n${ buf.toString(`utf8`) }`);

                    const
                        msg = `remote host echoing bytes received from ${ remoteSocket.remoteAddress }:${ remoteSocket.remotePort } at ${ new Date().toGMTString() }:` +
                              `\n${ buf.toString(`utf8`) }`,
                        ret = Buffer.from(msg, `utf8`);

                    process.stdout.write(chalk.black.bgYellow(`\n${ timestamp() } > writing ${ ret.length } bytes on TCP socket :`));
                    process.stdout.write(`\n${ ret.toString(`utf8`) }`);
                    // Write response to client
                    remoteSocket.write(ret);
                })
                .on(`error`, err => {
                    process.stderr.write(chalk.black.bgRedBright(`\n${ timestamp() } > TCP socket emitted an error:`));
                    process.stderr.write(`\n${ err.message }`);
                })
                .on(`end`, () => {
                    process.stdout.write(chalk.black.bgWhite(`\n${ timestamp() } > no more data to read on TCP socket, ending socket writes, remote host still up`));
                    // Terminares
                    remoteSocket.end();
                });
        })
        .on(`error`, err => {
            process.stderr.write(chalk.black.bgRedBright(`\n${ timestamp() } > error occured on TCP server :`));
            process.stderr.write(`\n${ err.message }`);
            process.stderr.write(`\n${ timestamp() } > exiting remote host with code 1`);
            // Exit process
            process.exit(1);
        });

} else {
    // ============== DON'T RUN AT ALL =============
    process.stdout.write(dashline);
    process.stdout.write(chalk.black.bgRedBright(`\n${ timestamp() } > no server mode specified, exiting remote host with code 1`));
    // Exit process
    process.exit(1);
}

srv.listen(p, h, () => {
    process.stdout.write(dashline);
    process.stdout.write(`\n${ timestamp() } > remote host running with pid ${ process.pid } at http://${ h }:${ p }`);
});