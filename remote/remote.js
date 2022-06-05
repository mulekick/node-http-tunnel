// import primitives
import * as http from "http";
import * as net from "net";
// import modules
import pepe from "@mulekick/pepe-ascii";
// config module
import {chalk, timestamp, dashline} from "./lib.js";

const
    // ---------------------------------------------------------------------------------
    // initialize params
    {MODE} = process.env,
    [ h, p ] = [ `0.0.0.0`, 80 ],
    // response pepes
    pepes = {
        [`/FeelsOkayManWine`]: pepe.FeelsOkayManWine,
        [`/FeelsWeirdMan`]: pepe.FeelsWeirdMan,
        [`/forsenS`]: pepe.forsenS,
        [`/monkaChrist`]: pepe.monkaChrist,
        [`/monkaHmm`]: pepe.monkaHmm,
        [`/monkaOMEGA`]: pepe.monkaOMEGA,
        [`/monkaS`]: pepe.monkaS,
        [`/nymnSmug`]: pepe.nymnSmug,
        [`/nymnWeird`]: pepe.nymnWeird,
        [`/pepeSweat`]: pepe.pepeSweat
    },
    // HTTP keep alive timeout
    kat = 6e4;
    // ---------------------------------------------------------------------------------

let
    srv = null;

if (MODE === `http`) {
    // ============= RUN AS HTTP SERVER =============
    // Will only accept valid http messages
    srv = http.createServer();
    srv
        .on(`connection`, () => {
            process.stdout.write(`${ timestamp() } > client connected, http tunnel established from proxy.\n`);
        })
        .on(`request`, (req, res) => {
            const
                {method, url, headers} = req;

            process.stdout.write(chalk.black.bgMagenta(`${ timestamp() } > received ${ method } request for ${ url } from : ${ headers[`user-agent`] }.\n`));

            const
                // create HTTP response message
                body = `remote host serving ${ method } request for ${ url } at ${ timestamp() }:\n${ pepes[url] }\n\n`,
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

            process.stdout.write(chalk.black.bgYellow(`${ timestamp() } > headers sent, writing ${ buf.length } bytes on TCP socket\n`));
            process.stdout.write(`${ buf.toString(`utf8`) }\n`);

            // send response
            res.end(buf);
        })
        .on(`clientError`, (err, remoteSocket) => {
            const
                {bytesParsed, code, reason, rawPacket} = err,
                // error message
                msg = `bytes parsed : ${ bytesParsed }\n` +
                      `code : ${ code }, reason ${ reason }\n` +
                      `data :\n${ Buffer.from(rawPacket).toString(`utf8`) }\n`;

            // error originated from client so log to stdout
            process.stdout.write(chalk.black.bgRedBright(`${ timestamp() } > TCP socket emitted an error:\n`));
            process.stdout.write(msg);

            // Write proper HTTP response to client, regardless of what was received, and close the client socket
            remoteSocket.end(Buffer.from(`HTTP/1.1 400 Bad Request\r\n\r\n`, `utf8`));
        });

    // set socket timeout
    srv.keepAliveTimeout = kat;

} else if (MODE === `tcp`) {
    // ============== RUN AS TCP SERVER =============
    // Will accept anything
    srv = net.createServer({allowHalfOpen: false, pauseOnConnect: false});
    srv
        .on(`connection`, remoteSocket => {

            process.stdout.write(`${ timestamp() } > client connected, http tunnel established from proxy.\n`);

            remoteSocket
                .on(`data`, buf => {
                    process.stdout.write(chalk.black.bgGreen(`${ timestamp() } > reading ${ buf.length } bytes on TCP socket:\n`));
                    process.stdout.write(`${ buf.toString(`utf8`) }\n`);

                    const
                        msg = `remote host echoing bytes received from ${ remoteSocket.remoteAddress }:${ remoteSocket.remotePort } at ${ timestamp() }:\n` +
                              `${ buf.toString(`utf8`) }\n`,
                        ret = Buffer.from(msg, `utf8`);

                    process.stdout.write(chalk.black.bgYellow(`${ timestamp() } > writing ${ ret.length } bytes on TCP socket :\n`));
                    process.stdout.write(`${ ret.toString(`utf8`) }`);
                    // Write response to client
                    remoteSocket.write(ret);
                })
                .on(`error`, err => {
                    process.stderr.write(chalk.black.bgRedBright(`${ timestamp() } > TCP socket emitted an error:\n`));
                    process.stderr.write(`${ err.message }\n`);
                })
                .on(`end`, () => {
                    process.stdout.write(chalk.black.bgWhite(`${ timestamp() } > no more data to read on TCP socket, ending socket writes, remote host still up\n`));
                    // Terminares
                    remoteSocket.end();
                });
        })
        .on(`error`, err => {
            process.stderr.write(chalk.black.bgRedBright(`${ timestamp() } > error occured on TCP server :\n`));
            process.stderr.write(`${ err.message }\n`);
            process.stderr.write(`${ timestamp() } > exiting remote host with code 1\n`);
            // Exit process
            process.exit(1);
        });

} else {
    // ============== DON'T RUN AT ALL =============
    process.stdout.write(dashline);
    process.stdout.write(chalk.black.bgRedBright(`${ timestamp() } > no server mode specified, exiting remote host with code 1\n`));
    // Exit process
    process.exit(1);
}

srv.listen(p, h, () => {
    process.stdout.write(dashline);
    process.stdout.write(`${ timestamp() } > remote host running with pid ${ process.pid } at http://${ h }:${ p }\n`);
});