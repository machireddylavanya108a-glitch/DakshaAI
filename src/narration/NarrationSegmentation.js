import {
  DEFAULT_NARRATION_CONFIG,
  NARRATION_CUE_TYPES,
  NARRATION_DIFFICULTIES,
  asArray,
  clamp,
  isObject,
  toFiniteNumber
} from './NarrationConfig.js';

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(text = '') {
  return normalizeText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function collectNarrationInputs(input = {}) {
  const source = isObject(input) ? input : {};
  const scene = isObject(source.scene) ? source.scene : source;
  const timeline = isObject(source.timeline) ? source.timeline : isObject(scene.timelineData) ? scene.timelineData : {};
  const narration = isObject(source.narration)
    ? source.narration
    : isObject(scene.narration)
      ? scene.narration
      : {};

  const chunks = [];

  const directLesson = normalizeText(source.lesson || source.lessonText || source.content || source.explanation || source.teacherScript || '');
  if (directLesson) chunks.push(directLesson);

  const narrationText = normalizeText(narration.text || narration.summary || '');
  if (narrationText) chunks.push(narrationText);

  asArray(narration.segments).forEach((segment) => {
    const text = normalizeText(segment?.text || segment?.line || segment?.content || segment?.description || '');
    if (text) chunks.push(text);
  });

  asArray(scene.timeline).forEach((step) => {
    const title = normalizeText(step?.title || step?.name || '');
    const description = normalizeText(step?.description || step?.objective || '');
    const line = normalizeText([title, description].filter(Boolean).join('. '));
    if (line) chunks.push(line);
  });

  asArray(timeline.clips).forEach((clip) => {
    const title = normalizeText(clip?.metadata?.title || clip?.title || clip?.label || '');
    const description = normalizeText(clip?.metadata?.description || clip?.objective || '');
    const line = normalizeText([title, description].filter(Boolean).join('. '));
    if (line) chunks.push(line);
  });

  if (!chunks.length) {
    const fallbackTopic = normalizeText(source.topic || scene.topic || scene.subject || scene.title || 'lesson');
    chunks.push(`This lesson introduces ${fallbackTopic} through guided steps and interactive checkpoints.`);
  }

  return {
    scene,
    timeline,
    narration,
    text: chunks.join('\n')
  };
}

function groupSentences(sentences = [], maxSentencesPerSegment = 3, maxSegments = 128) {
  const groups = [];
  for (let index = 0; index < sentences.length; index += maxSentencesPerSegment) {
    if (groups.length >= maxSegments) break;
    groups.push(sentences.slice(index, index + maxSentencesPerSegment));
  }
  return groups;
}

function estimateDurationMs(segmentText, config) {
  const words = normalizeText(segmentText).split(' ').filter(Boolean).length;
  const minutes = words / Math.max(1, Number(config.wordsPerMinute || 140));
  const rawDuration = Math.round(minutes * 60000);
  return clamp(rawDuration || config.minSegmentDurationMs, config.minSegmentDurationMs, config.maxSegmentDurationMs);
}

function inferDifficulty(text = '', index = 0) {
  const words = normalizeText(text).split(' ').filter(Boolean);
  const avgWordLength = words.length
    ? words.reduce((sum, word) => sum + word.length, 0) / words.length
    : 0;

  if (avgWordLength >= 7 || words.length >= 36) return NARRATION_DIFFICULTIES[2];
  if (avgWordLength >= 5 || words.length >= 20) return NARRATION_DIFFICULTIES[1];
  return index % 2 === 0 ? NARRATION_DIFFICULTIES[0] : NARRATION_DIFFICULTIES[1];
}

function inferLearningObjective(text = '', fallback = '') {
  const cleaned = normalizeText(text);
  if (!cleaned) return fallback || 'Understand the current concept.';

  const firstSentence = splitIntoSentences(cleaned)[0] || cleaned;
  return firstSentence.length > 160 ? `${firstSentence.slice(0, 157)}...` : firstSentence;
}

function buildObjectCatalog(scene = {}) {
  const objects = [];

  asArray(scene.objects).forEach((objectValue, index) => {
    const id = String(objectValue?.id || `object-${index + 1}`);
    const label = normalizeText(objectValue?.name || objectValue?.label || objectValue?.title || id);
    objects.push({ id, label: label.toLowerCase() });
  });

  asArray(scene.hotspots).forEach((item, index) => {
    const id = String(item?.id || `hotspot-${index + 1}`);
    const label = normalizeText(item?.label || item?.title || id);
    objects.push({ id, label: label.toLowerCase() });
  });

  return objects;
}

function findRelatedSceneObjects(text = '', objectCatalog = []) {
  const normalized = normalizeText(text).toLowerCase();
  const ids = new Set();

  objectCatalog.forEach((entry) => {
    if (!entry.label) return;
    if (normalized.includes(entry.label)) {
      ids.add(entry.id);
    }
  });

  return [...ids];
}

function mapTimelineRefs(segmentIndex = 0, timeline = {}) {
  const clips = asArray(timeline.clips);
  const markers = asArray(timeline.markers);
  const events = asArray(timeline.events);

  const clip = clips[segmentIndex] || clips[Math.max(0, clips.length - 1)] || null;
  const marker = markers[segmentIndex] || markers[Math.max(0, markers.length - 1)] || null;

  return {
    clipId: clip?.id || null,
    markerId: marker?.id || null,
    eventIds: events
      .filter((event) => {
        const time = toFiniteNumber(event?.time ?? event?.timeMs, 0);
        const clipStart = toFiniteNumber(clip?.start, 0);
        const clipEnd = toFiniteNumber(clip?.end, clipStart + toFiniteNumber(clip?.duration, 0));
        if (!clip) return false;
        return time >= clipStart && time <= clipEnd;
      })
      .map((event) => event.id)
  };
}

function buildCuesForSegment(segment, segmentIndex, segmentCount) {
  const cues = [];
  const baseTime = toFiniteNumber(segment.timestampMs, 0);

  cues.push({
    id: `${segment.id}-pause`,
    type: 'pause-point',
    timestampMs: baseTime + Math.round(segment.durationMs * 0.85),
    durationMs: 300,
    segmentId: segment.id,
    payload: {
      reason: 'comprehension-check'
    }
  });

  cues.push({
    id: `${segment.id}-emphasis`,
    type: 'emphasis-point',
    timestampMs: baseTime + Math.round(segment.durationMs * 0.4),
    durationMs: 450,
    segmentId: segment.id,
    payload: {
      objective: segment.learningObjective
    }
  });

  if (segment.text.includes('?') || segmentIndex % 3 === 2) {
    cues.push({
      id: `${segment.id}-quiz`,
      type: 'quiz-point',
      timestampMs: baseTime + Math.round(segment.durationMs * 0.9),
      durationMs: 600,
      segmentId: segment.id,
      payload: {
        prompt: `Check understanding for ${segment.learningObjective}`
      }
    });
  }

  if (segmentIndex === segmentCount - 1 || segmentIndex % 4 === 3) {
    cues.push({
      id: `${segment.id}-recap`,
      type: 'recap-point',
      timestampMs: baseTime + Math.round(segment.durationMs * 0.95),
      durationMs: 650,
      segmentId: segment.id,
      payload: {
        summary: segment.learningObjective
      }
    });
  }

  if (segment.relatedSceneObjectIds.length > 0) {
    cues.push({
      id: `${segment.id}-interaction`,
      type: 'interaction-point',
      timestampMs: baseTime + Math.round(segment.durationMs * 0.55),
      durationMs: 700,
      segmentId: segment.id,
      payload: {
        targetObjectIds: segment.relatedSceneObjectIds
      }
    });
  }

  return cues.filter((cue) => NARRATION_CUE_TYPES.includes(cue.type));
}

function projectCuesByDomain(cues = [], segments = []) {
  const bySegment = new Map(segments.map((segment) => [segment.id, segment]));

  const timelineCues = cues.map((cue) => {
    const segment = bySegment.get(cue.segmentId);
    return {
      ...cue,
      domain: 'timeline',
      clipId: segment?.relatedTimeline?.clipId || null,
      markerId: segment?.relatedTimeline?.markerId || null,
      eventIds: segment?.relatedTimeline?.eventIds || []
    };
  });

  const sceneGraphCues = cues.map((cue) => {
    const segment = bySegment.get(cue.segmentId);
    return {
      ...cue,
      domain: 'scene-graph',
      targetObjectIds: segment?.relatedSceneObjectIds || []
    };
  });

  const runtimeGraphCues = cues.map((cue) => {
    const segment = bySegment.get(cue.segmentId);
    return {
      ...cue,
      domain: 'runtime-graph',
      segmentState: {
        difficulty: segment?.difficulty || 'beginner',
        objective: segment?.learningObjective || ''
      }
    };
  });

  return {
    timeline: timelineCues,
    sceneGraph: sceneGraphCues,
    runtimeGraph: runtimeGraphCues,
    all: cues
  };
}

export function buildUniversalNarrationPackage(input = {}, options = {}) {
  const config = {
    ...DEFAULT_NARRATION_CONFIG,
    ...(isObject(options) ? options : {})
  };

  const { scene, timeline, text } = collectNarrationInputs(input);
  const sentences = splitIntoSentences(text);
  const grouped = groupSentences(sentences, config.maxSentencesPerSegment, config.maxSegments);
  const objectCatalog = buildObjectCatalog(scene);

  let timestampMs = 0;
  const segments = grouped.map((group, index) => {
    const segmentText = normalizeText(group.join(' '));
    const durationMs = estimateDurationMs(segmentText, config);
    const relatedSceneObjectIds = findRelatedSceneObjects(segmentText, objectCatalog);
    const relatedTimeline = mapTimelineRefs(index, timeline);

    const segment = {
      id: `narration-segment-${index + 1}`,
      index,
      text: segmentText,
      durationMs,
      timestampMs,
      learningObjective: inferLearningObjective(segmentText, `Learn concept step ${index + 1}.`),
      difficulty: inferDifficulty(segmentText, index),
      relatedSceneObjectIds,
      relatedTimeline,
      metadata: {
        sentenceCount: group.length,
        wordCount: segmentText.split(' ').filter(Boolean).length,
        cueIds: []
      }
    };

    timestampMs += durationMs;
    return segment;
  });

  const cues = segments.flatMap((segment, index) => buildCuesForSegment(segment, index, segments.length));

  const cueIdsBySegment = new Map();
  cues.forEach((cue) => {
    if (!cueIdsBySegment.has(cue.segmentId)) cueIdsBySegment.set(cue.segmentId, []);
    cueIdsBySegment.get(cue.segmentId).push(cue.id);
  });

  segments.forEach((segment) => {
    segment.metadata.cueIds = cueIdsBySegment.get(segment.id) || [];
  });

  const cuesByDomain = projectCuesByDomain(cues, segments);

  return {
    segments,
    cues: cuesByDomain,
    summary: {
      segmentCount: segments.length,
      cueCount: cues.length,
      totalDurationMs: segments.reduce((sum, segment) => sum + segment.durationMs, 0),
      unknownStructureHandled: segments.length > 0
    }
  };
}

export function buildNarrationSegments(scenePlan = {}, teacherScript = '') {
  const narrationPackage = buildUniversalNarrationPackage({
    scene: scenePlan,
    timeline: scenePlan?.timelineData || scenePlan?.timeline || {},
    narration: scenePlan?.narration || {},
    lesson: teacherScript
  });

  return narrationPackage.segments.map((segment) => ({
    id: segment.id,
    line: segment.text,
    target: segment.relatedSceneObjectIds[0] || '',
    durationMs: segment.durationMs,
    labels: [segment.learningObjective, segment.difficulty],
    metadata: {
      timestampMs: segment.timestampMs,
      learningObjective: segment.learningObjective,
      difficulty: segment.difficulty,
      relatedSceneObjectIds: segment.relatedSceneObjectIds,
      cueIds: segment.metadata.cueIds
    }
  }));
}
