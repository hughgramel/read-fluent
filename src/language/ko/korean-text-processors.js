
// import {Hangul} from '../../../lib/hangul-js.js';

/** @type {import('language').TextProcessor<boolean>} */
export const disassembleHangul = {
    name: 'Disassemble Hangul',
    description: 'Disassemble Hangul characters into jamo.',
    options: [true], // Could probably also be set to [false, true], but this way it is always on
    process: (str) => {
        return Hangul.disassemble(str, false).join('');
    },
};

/** @type {import('language').TextProcessor<boolean>} */
export const reassembleHangul = {
    name: 'Reassemble Hangul',
    description: 'Reassemble Hangul characters from jamo.',
    options: [true], // Could probably also be set to [false, true], but this way it is always on
    process: (str) => {
        return Hangul.assemble(str);
    },
};
