const LANGUAGE_VARIANTS = {
  English: { voiceStyle: 'warm-professor', cadence: 'balanced', emotion: 'calm' },
  Telugu: { voiceStyle: 'warm-professor', cadence: 'gentle', emotion: 'encouraging' },
  Hindi: { voiceStyle: 'warm-professor', cadence: 'clear', emotion: 'encouraging' },
  Tamil: { voiceStyle: 'warm-professor', cadence: 'measured', emotion: 'supportive' },
  Arabic: { voiceStyle: 'warm-professor', cadence: 'measured', emotion: 'respectful' },
  Japanese: { voiceStyle: 'warm-professor', cadence: 'polite', emotion: 'gentle' },
  default: { voiceStyle: 'warm-professor', cadence: 'balanced', emotion: 'calm' }
};

function detectLevel(prompt = '') {
  const normalized = String(prompt || '').toLowerCase();
  if (/beginner|basic|simple|easy|intro|start/.test(normalized)) return 'beginner';
  if (/advanced|expert|deep|complex|master/.test(normalized)) return 'advanced';
  return 'intermediate';
}

function detectMixedLanguage(prompt = '') {
  const normalized = String(prompt || '').toLowerCase();
  const mixed = [];
  if (/(english|telugu|hindi|tamil|arabic|japanese)/.test(normalized)) {
    if (normalized.includes('telugu')) mixed.push('Telugu');
    if (normalized.includes('hindi')) mixed.push('Hindi');
    if (normalized.includes('tamil')) mixed.push('Tamil');
    if (normalized.includes('arabic')) mixed.push('Arabic');
    if (normalized.includes('japanese')) mixed.push('Japanese');
  }
  return mixed;
}

function buildPrompt(promptText = '', language = 'English', teacherMode = 'friendly') {
  const level = detectLevel(promptText);
  const mixed = detectMixedLanguage(promptText);
  const variant = LANGUAGE_VARIANTS[language] || LANGUAGE_VARIANTS.default;
  const languageInstruction = mixed.length
    ? `Teach in ${language} while gently weaving in ${mixed.join(', ')} for clarity.`
    : `Teach in ${language}.`;

  return `You are a human-like AI professor teaching ${teacherMode}ly.
- Use natural speech, emotional warmth, and a calm teaching tone.
- Pause naturally with short sentences and clear transitions.
- Use storytelling, relatable examples, simple explanations, and advanced explanations when needed.
- Adapt to a ${level} learner level.
- ${languageInstruction}
- Keep the response concise enough for voice, but include one example and one simple explanation or advanced clarification.
- Avoid robotic phrasing; sound like a real professor guiding a student step by step.

Topic: ${promptText}`;
}

export function buildVoiceTeachingPrompt(promptText = '', language = 'English', teacherMode = 'friendly') {
  return buildPrompt(promptText, language, teacherMode);
}

export function buildVoiceTeachingProfile(promptText = '', language = 'English', teacherMode = 'friendly') {
  const level = detectLevel(promptText);
  const mixed = detectMixedLanguage(promptText);
  const variant = LANGUAGE_VARIANTS[language] || LANGUAGE_VARIANTS.default;

  return {
    language,
    level,
    mixedLanguage: mixed,
    voiceStyle: variant.voiceStyle,
    cadence: variant.cadence,
    emotion: variant.emotion,
    teacherMode,
    pauseNaturally: true,
    storytelling: true,
    simpleExplanation: true,
    advancedExplanation: true,
    examples: true,
    professorTone: true
  };
}
