import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSkillAcademyMentorPlan } from '../utils/skillAcademyMentorEngine.js';

test('buildSkillAcademyMentorPlan creates personalized mentor modules', () => {
  const plan = buildSkillAcademyMentorPlan({
    skill: 'Python',
    interviewAnswers: {
      currentLevel: 'Beginner',
      endGoal: 'Get a job as a Python developer',
      dailyStudyTime: '1 hour',
      preferredLanguage: 'English',
      learningSpeed: 'Fast',
      reason: 'Career growth'
    }
  });

  assert.equal(plan.topic, 'Python');
  assert.ok(Array.isArray(plan.mentor.roadmap));
  assert.ok(Array.isArray(plan.mentor.dailySchedule));
  assert.ok(Array.isArray(plan.mentor.projects));
  assert.ok(Array.isArray(plan.mentor.assessments));
  assert.ok(Array.isArray(plan.mentor.portfolio));
  assert.ok(Array.isArray(plan.mentor.internshipRoadmap));
  assert.ok(Array.isArray(plan.mentor.careerRoadmap));
  assert.ok(Array.isArray(plan.mentor.freelancingRoadmap));
  assert.ok(Array.isArray(plan.mentor.startupRoadmap));
  assert.ok(Array.isArray(plan.mentor.certificationRoadmap));
  assert.ok(Array.isArray(plan.mentor.interviewPreparation));
  assert.ok(Array.isArray(plan.mentor.salaryRoadmap));
  assert.ok(Array.isArray(plan.mentor.industryRoadmap));
  assert.ok(plan.mentor.aiTeacherPlan);
  assert.ok(plan.mentor.threeDPlan);
});
