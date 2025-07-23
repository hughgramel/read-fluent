
import {basicTextProcessorOptions} from '../text-processors.js';

const optionalDiacritics = ['\u0303', '\u0304', '\u0307', '\u0308', '\u0323', '\u032E', '\u0330', '\u0331', '\u0730', '\u0731', '\u0732', '\u0733', '\u0734', '\u0735', '\u0736', '\u0737', '\u0738', '\u0739', '\u073A', '\u073B', '\u073C', '\u073D', '\u073E', '\u073F', '\u0740', '\u0741', '\u0742', '\u0743', '\u0744', '\u0745', '\u0746', '\u0747', '\u0748', '\u0749', '\u074A'];

const diacriticsRegex = new RegExp(`[${optionalDiacritics.join('')}]`, 'g');

/** @type {import('language').TextProcessor<boolean>} */
export const removeSyriacScriptDiacritics = {
    name: 'Remove diacritics',
    description: 'ܟܵܬܹܒ݂ ⬅️ ܟܬܒ',
    options: basicTextProcessorOptions,
    process: (text, setting) => {
        return setting ? text.replace(diacriticsRegex, '') : text;
    },
};
