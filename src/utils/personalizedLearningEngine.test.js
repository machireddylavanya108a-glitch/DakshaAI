import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPersonalizedLearningPlan } from './personalizedLearningEngine.js';

test('buildPersonalizedLearningPlan produces a contextual roadmap without generic foundations templates', () => {
  const plan = buildPersonalizedLearningPlan({
    interviewAnswers: {
      learnTopic: 'React performance tuning',
      currentLevel: 'Intermediate',
      dailyStudyTime: '45 minutes',
      learningStyle: 'Hands-on',
      endGoal: 'Become a frontend engineer',
      careerGoal: 'Senior frontend engineer',
      location: 'Bengaluru',
      preferredLanguage: 'English',
      existingKnowledge: 'Hooks and state management',
      reason: 'I want to improve interview readiness and build portfolio work'
    },
    sourceContext: 'pdf',
    sourceLabel: 'react-performance.pdf',
    sourceSummary: 'Optimize rendering, memoization, suspense, and bundle splitting.',
    skillHint: 'React performance tuning'
  });

  assert.equal(plan.topic, 'React performance tuning');
  assert.ok(plan.plan.dailySchedule.length >= 3);
  assert.ok(plan.plan.weeklyMilestones.length >= 2);
  assert.ok(plan.plan.monthlyMilestones.length >= 1);
  assert.ok(plan.plan.projects.length >= 2);
  assert.ok(plan.plan.portfolio.length >= 2);
  assert.ok(plan.plan.career.length >= 2);
  assert.ok(plan.plan.salaryDisclaimer.includes('salary'));
  assert.ok(plan.plan.internship.length >= 2);
  assert.ok(plan.plan.freelancing.length >= 2);
  assert.ok(plan.plan.business.length >= 2);
  assert.ok(!plan.plan.dailySchedule.some((item) => /Foundations|Core Concepts/i.test(item.topic)));
  assert.ok(plan.plan.dailySchedule[0].tasks.some((task) => task.includes('react-performance.pdf') || task.includes('rendering')));
});
