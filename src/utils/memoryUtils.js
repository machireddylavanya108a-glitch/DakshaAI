export function summarizeText(value) {
  if (!value) return '';
  const text = String(value).toLowerCase();
  return text.replace(/[^a-z0-9\s]/g, ' ').trim();
}

export function buildMemoryProfile(payload = {}) {
  const history = payload.learningHistory || [];
  const weakConcepts = payload.weakConcepts || [];
  const strongConcepts = payload.strongConcepts || [];

  const recommendations = [
    `Revisit ${weakConcepts[0] || 'core fundamentals'} with a short revision session.`,
    `Practice one ${strongConcepts[0] || 'high-confidence'} concept through a quiz or flashcard deck.`,
    `Continue with a fresh lesson from your recent topic: ${history[0]?.title || 'your recent activity'}.`
  ];

  return {
    ...payload,
    learningHistory: history,
    weakConcepts,
    strongConcepts,
    recommendations,
  };
}
