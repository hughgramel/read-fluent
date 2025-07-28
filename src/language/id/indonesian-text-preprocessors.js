/*
 * Indonesian text preprocessors for Read Fluent
 * Handles Indonesian text preprocessing and normalization
 */

import {capitalizeFirstLetter, decapitalize} from '../text-processors.js';

/**
 * Indonesian text preprocessor for basic text normalization
 * @type {import('language').TextProcessor<'on'|'off'>}
 */
export const indonesianTextPreprocessor = {
    name: 'Indonesian Text Preprocessor',
    description: 'Basic text preprocessing for Indonesian language',
    options: ['on', 'off'],
    process: (str, setting) => {
        if (setting === 'off') { return str; }
        
        // Basic normalization for Indonesian
        // Indonesian uses Latin alphabet, so we can use standard preprocessing
        return str;
    },
};

/**
 * Indonesian capitalization preprocessors
 */
export const indonesianCapitalizationPreprocessors = {
    capitalizeFirstLetter,
    decapitalize,
}; 