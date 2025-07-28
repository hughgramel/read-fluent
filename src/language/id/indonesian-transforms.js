/*
 * Indonesian language transforms for Read Fluent
 * Handles Indonesian word analysis and lemmatization
 */

const conditions = {
    v: {name: 'Verb', isDictionaryForm: true},
    n: {name: 'Noun', isDictionaryForm: true},
    adj: {name: 'Adjective', isDictionaryForm: true},
    adv: {name: 'Adverb', isDictionaryForm: true},
};

/** @type {import('language-transformer').LanguageTransformDescriptor<keyof typeof conditions>} */
export const indonesianTransforms = {
    language: 'id',
    conditions,
    transforms: {
        // Indonesian has some inflection but is generally simpler than European languages
        'basic': {
            name: 'Basic Indonesian',
            description: 'Basic Indonesian word analysis',
            rules: [
                // For Indonesian, most words are their own lemma
                // This is a minimal transform that doesn't change the word
                {
                    type: 'suffix',
                    isInflected: /^.*$/,
                    deinflect: (text) => text,
                    conditionsIn: [],
                    conditionsOut: []
                }
            ]
        }
    }
}; 