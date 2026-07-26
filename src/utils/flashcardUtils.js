export function calculateFlashcardProgress(cards = [], studySeconds = 0) {
  const total = cards.length;
  const learned = cards.filter((card) => card?.status === 'known').length;
  const remaining = total - learned;
  const accuracy = total ? Number(((learned / total) * 100).toFixed(2)) : 0;
  const completionPercentage = total ? Number(((learned / total) * 100).toFixed(2)) : 0;
  const minutes = Math.floor(studySeconds / 60);
  const seconds = studySeconds % 60;

  return {
    cardsLearned: learned,
    cardsRemaining: remaining,
    accuracy,
    completionPercentage,
    studyTime: `${minutes}:${seconds.toString().padStart(2, '0')}`,
  };
}

export function parseFlashcardPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      title: 'Generated Flashcards',
      category: 'General',
      flashcards: [],
    };
  }

  const flashcards = Array.isArray(payload.flashcards) ? payload.flashcards : [];
  return {
    title: payload.title || 'Generated Flashcards',
    category: payload.category || 'General',
    flashcards: flashcards.map((card) => ({
      front: card?.front || '',
      back: card?.back || '',
      difficulty: card?.difficulty || 'Mixed',
      tags: Array.isArray(card?.tags) ? card.tags : [],
      status: 'review',
      bookmarked: false,
      favorite: false,
    })),
  };
}
