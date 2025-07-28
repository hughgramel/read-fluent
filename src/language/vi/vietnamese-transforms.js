/*
 * Vietnamese language transforms for Read Fluent
 * Handles Vietnamese word analysis and lemmatization
 */

const conditions = {
    v: {name: 'Verb', isDictionaryForm: true},
    n: {name: 'Noun', isDictionaryForm: true},
    adj: {name: 'Adjective', isDictionaryForm: true},
    adv: {name: 'Adverb', isDictionaryForm: true},
};

/** @type {import('language-transformer').LanguageTransformDescriptor<keyof typeof conditions>} */
export const vietnameseTransforms = {
    language: 'vi',
    conditions,
    transforms: {
        // Vietnamese has minimal inflection, so we provide basic transforms
        'basic': {
            name: 'Basic Vietnamese',
            description: 'Basic Vietnamese word analysis',
            rules: [
                // For Vietnamese, most words are their own lemma
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