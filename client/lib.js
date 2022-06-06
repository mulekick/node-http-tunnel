// import primitives
import {Writable} from "stream";
// import modules
import chalk from "chalk";

const
    // ---------------------------------------------------------------------------------
    HIGH_WATER_MARK = 2048,
    // ---------------------------------------------------------------------------------
    timestamp = () => {
        const
            d = new Date(),
            [ hr, mn, ss ] = [ d.getHours(), d.getMinutes(), d.getSeconds() ]
                .map(x => (`${ x }`.length === 1 ? `0${ x }` : `${ x }`));
        return `${ hr }:${ mn }:${ ss }.${ d.getMilliseconds() }`;
    },
    // ---------------------------------------------------------------------------------
    dashline = `---------------------------------\n`;

class writablePipe extends Writable {
    constructor(socket) {
        // default options
        super({
            // write x bytes at time
            highWaterMark: HIGH_WATER_MARK,
            // encode incoming strings into buffers
            decodeStrings: true,
            // utf8 encoding
            defaultEncoding: `utf8`,
            // only strings allowed
            objectMode: false,
            // emit close
            emitClose: true
        });
        // writable tcp socket
        this.socket = socket;
    }

    _write(buf, encoding, callback) {
        // log
        process.stdout.write(chalk.black.bgGreen(`${ timestamp() } > reading ${ buf.length } bytes from named pipe:\n`));
        process.stdout.write(`${ buf.toString(`utf8`) }\n`);
        process.stdout.write(chalk.black.bgYellow(`${ timestamp() } > writing ${ buf.length } bytes on TCP socket:\n`));
        process.stdout.write(`${ buf.toString(`utf8`) }\n`);
        // trigger write on TCP socket
        this.socket.write(buf);
        // Success
        callback(null);
    }

    _final(callback) {
        // Signal EOF
        this.push(null);
        // success
        callback();
    }
}

// ---------------------------------------------------------------------------------

// never rename exports in modules
export {chalk, timestamp, dashline, writablePipe};