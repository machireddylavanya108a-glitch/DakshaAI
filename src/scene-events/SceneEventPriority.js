import { asArray, toFiniteNumber } from './SceneEventConfig.js';

function comparePriority(a, b) {
  const timeA = toFiniteNumber(a?.timeMs, 0);
  const timeB = toFiniteNumber(b?.timeMs, 0);
  if (timeA !== timeB) return timeA - timeB;

  const priorityA = toFiniteNumber(a?.priority, 0);
  const priorityB = toFiniteNumber(b?.priority, 0);
  if (priorityA !== priorityB) return priorityB - priorityA;

  const serialA = toFiniteNumber(a?.serial, 0);
  const serialB = toFiniteNumber(b?.serial, 0);
  if (serialA !== serialB) return serialA - serialB;

  return String(a?.id || '').localeCompare(String(b?.id || ''));
}

export function rankSceneEvents(events = []) {
  return asArray(events)
    .map((event, index) => ({
      ...event,
      serial: toFiniteNumber(event?.serial, index)
    }))
    .sort(comparePriority);
}
