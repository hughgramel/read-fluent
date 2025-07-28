// Utility to fill prompt variables and handle special cases
export function fillPromptVariables(prompt: string, vars: {
  interfaceLang: string;
  targetLang: string;
  word?: string;
  sentence?: string;
  beforeSentence?: string;
  afterSentence?: string;
}) {
  let result = prompt;
  // Handle [LANGUAGE_EXCEPTION] placeholder
  if (result.includes('[LANGUAGE_EXCEPTION]')) {
    if (vars.interfaceLang === vars.targetLang) {
      result = result.replace(/\[LANGUAGE_EXCEPTION\]/g, 'ONLY output text IN [INTERFACE_LANG].');
    } else {
      result = result.replace(/\[LANGUAGE_EXCEPTION\]/g, 'DO NOT OUTPUT any text in [TARGET_LANG]. ONLY output text IN [INTERFACE_LANG].');
    }
  }
  // Remove or reword the instruction if interfaceLang and targetLang are the same (legacy)
  if (vars.interfaceLang === vars.targetLang) {
    result = result.replace(/DO NOT OUTPUT any text in \[TARGET_LANG\]\. ONLY output text IN \[INTERFACE_LANG\]\.\n?/gi, 'Output all text in [INTERFACE_LANG].\n');
  }
  result = result
    .replace(/\[INTERFACE_LANG\]/g, vars.interfaceLang)
    .replace(/\[TARGET_LANG\]/g, vars.targetLang)
    .replace(/\[WORD\]/g, vars.word || '')
    .replace(/\[SENTENCE\]/g, vars.sentence || '')
    .replace(/\[BEFORE_SENTENCE\]/g, vars.beforeSentence || '')
    .replace(/\[AFTER_SENTENCE\]/g, vars.afterSentence || '');
  return result;
} 