import { dueOn, formatDate } from './dates';

describe('due dates', () => {
  it('counts backward and forward from the target date', () => {
    expect(dueOn('2026-12-01', 60)).toBe('2026-10-02');
    expect(dueOn('2026-12-01', 0)).toBe('2026-12-01');
    expect(dueOn('2026-12-01', -14)).toBe('2026-12-15');
    expect(formatDate('2026-12-01')).toContain('2026');
  });
});
