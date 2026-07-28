import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyKnowledgeFilters,
  getLibraryMetrics,
  normalizeKnowledgeItem,
  safeTopicTitle
} from '../utils/knowledgeLibraryUtils.js';

test('safeTopicTitle marks unknown screenshot-style topics', () => {
  assert.equal(safeTopicTitle('Screenshot (35).png'), 'Topic not detected yet');
  assert.equal(safeTopicTitle('React state management'), 'React state management');
});

test('applyKnowledgeFilters searches multiple fields and supports mode/tab filters', () => {
  const items = [
    normalizeKnowledgeItem({ id: '1', title: 'React Hooks', sourceType: 'code', category: 'Technology', tags: ['hooks'], topics: ['state'], keywords: ['useEffect'], summary: 'Hooks summary' }),
    normalizeKnowledgeItem({ id: '2', title: 'Organic Chemistry Notes', sourceType: 'document', category: 'Science', tags: ['chemistry'], topics: ['molecules'], keywords: ['reaction'], summary: 'Chemistry summary' }),
    normalizeKnowledgeItem({ id: '3', title: 'Distributed Systems Course', sourceType: 'course', category: 'Technology', tags: ['systems'], topics: ['consensus'], keywords: ['fault tolerance'], summary: 'Course summary', completionStatus: 'In progress' })
  ];

  const queryFiltered = applyKnowledgeFilters(items, { query: 'useEffect', mode: 'All', tab: 'All', filters: {} });
  assert.equal(queryFiltered.length, 1);
  assert.equal(queryFiltered[0].id, '1');

  const modeFiltered = applyKnowledgeFilters(items, { query: '', mode: 'Courses', tab: 'All', filters: {} });
  assert.equal(modeFiltered.length, 1);
  assert.equal(modeFiltered[0].id, '3');

  const statusFiltered = applyKnowledgeFilters(items, {
    query: '',
    mode: 'All',
    tab: 'All',
    filters: { completionStatus: 'In progress', category: 'All', sourceType: 'All', difficulty: 'All', language: 'All', dateAdded: 'Any time', favorites: false }
  });
  assert.equal(statusFiltered.length, 1);
  assert.equal(statusFiltered[0].id, '3');
});

test('getLibraryMetrics computes compact dashboard counters', () => {
  const items = [
    normalizeKnowledgeItem({ id: '1', title: 'Course item', sourceType: 'course', saved: true, bookmarked: true, favorite: true, lastOpenedAt: new Date().toISOString() }),
    normalizeKnowledgeItem({ id: '2', title: 'Book item', sourceType: 'book', saved: true, bookmarked: false, favorite: false, lastOpenedAt: '' })
  ];

  const metrics = getLibraryMetrics(items);
  assert.equal(metrics.totalItems, 2);
  assert.equal(metrics.savedItems, 2);
  assert.equal(metrics.activeCourses, 1);
  assert.equal(metrics.bookmarks, 1);
  assert.equal(metrics.recentlyViewed, 1);
});
