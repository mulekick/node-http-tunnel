// import modules
import chalk from "chalk";

const
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
    // ---------------------------------------------------------------------------------

// never rename exports in modules
export {chalk, timestamp, dashline};