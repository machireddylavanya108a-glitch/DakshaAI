import SceneManager from './SceneManager';

function getTeacherLessonContext() {
  try {
    const storageKeys = Object.keys(localStorage || {});
    const teacherSessionKey = storageKeys.find((key) => key.startsWith('daksha:ai-teacher:session:'));
    if (!teacherSessionKey) return '';

    const parsed = JSON.parse(localStorage.getItem(teacherSessionKey) || '{}');
    const topic = parsed?.topic || '';
    const chapter = Number.isFinite(parsed?.chapterIndex) ? parsed.chapterIndex : null;
    return `${topic} ${chapter !== null ? `chapter ${chapter + 1}` : ''}`.trim();
  } catch (error) {
    console.error('Unable to read AI teacher context:', error);
    return '';
  }
}

export default function SceneLoader({ content, sourceType = 'typed-topic', sourcePayload = '', userId, onSceneReady, onPlanReady, onStatusChange }) {
  const lessonContext = `${sourcePayload || ''} ${getTeacherLessonContext()}`.trim();

  return (
    <SceneManager
      content={content}
      sourceType={sourceType}
      lessonContext={lessonContext}
      userId={userId}
      onSceneReady={(scene, plan, sceneId) => {
        onSceneReady?.(scene, sceneId);
        onPlanReady?.(plan);
      }}
      onStatusChange={onStatusChange}
    />
  );
}
