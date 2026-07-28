import { processEducationalObject } from './EducationalObjectVersionManager.js';
import { generateEducationalObjectLabels } from './EducationalObjectLabelGenerator.js';
import { generateEducationalObjectNarration } from './EducationalObjectNarrationGenerator.js';
import { stableSortByKey } from './EducationalObjectGenerationConfig.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function findConceptByObject(object = {}, context = {}) {
  const concepts = toArray(context.concepts);
  const byId = concepts.find((item) => String(item?.id || item?.conceptId || '') === String(object.metadata?.conceptId || ''));
  if (byId) return byId;
  const byName = concepts.find((item) => String(item?.name || item?.label || '').toLowerCase() === String(object.name || '').toLowerCase());
  return byName || { label: object.name || 'Concept', importance: object.metadata?.importance || 0.5 };
}

export function refineEducationalObjects(objects = [], context = {}, options = {}) {
  const maxPasses = Math.max(0, Math.min(3, Number(options.refinementPasses || 2)));
  const notes = [];
  let current = stableSortByKey(toArray(objects), 'objectId');
  let refined = false;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;

    current = current.map((objectValue, index) => {
      const concept = findConceptByObject(objectValue, context);
      let next = { ...objectValue };

      if (!toArray(next.labels).length) {
        next.labels = generateEducationalObjectLabels(next, concept, context, {
          objectIndex: index,
          readingOrder: index + 1,
          priority: index + 1
        });
        changed = true;
      }

      if (!next.narration || typeof next.narration !== 'object' || !String(next.narration.text || '').trim()) {
        next.narration = generateEducationalObjectNarration(next, concept, context, { objectIndex: index });
        changed = true;
      }

      const processed = processEducationalObject(next, {
        allowFallback: true,
        knownObjectIds: current.map((item) => String(item?.objectId || item?.id || ''))
      });

      if (processed.status !== 'fallback') {
        next = processed.object;
      }

      return next;
    });

    if (!changed) break;
    refined = true;
    notes.push(`refinement-pass-${pass + 1}`);
  }

  return {
    refined,
    passes: maxPasses,
    objects: stableSortByKey(current, 'objectId'),
    notes
  };
}
