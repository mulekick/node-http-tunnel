// import modules
import chalk from "chalk";

const
    // ---------------------------------------------------------------------------------
    timestamp = () => {
        const
            d = new Date(),
            [ hr, mn, ss ] = [ d.getHours(), d.getMinutes(), d.getSeconds() ]
                .map(x => {
                    const
                        // avoid implicit type coercion
                        s = String(x);

                    // return
                    return s.length === 1 ? `0${ s }` : s;
                });
        return `${ hr }:${ mn }:${ ss }.${ d.getMilliseconds() }`;
    },
    // ---------------------------------------------------------------------------------
    dashline = `---------------------------------\n`;
    // ---------------------------------------------------------------------------------

// never rename exports in modules
export {chalk, timestamp, dashline};