import { daysBeforeMessage, preferenceProblem, reminderKindLabel } from './labels';

describe('reminder preferences', () => {
  it('accepts a lead time from the day itself through 90 days', () => {
    expect(preferenceProblem(0)).toBeNull();
    expect(preferenceProblem(90)).toBeNull();
    expect(preferenceProblem(3)).toBeNull();
  });

  it('rejects a lead time outside that range', () => {
    expect(preferenceProblem(-1)).toBe(daysBeforeMessage);
    expect(preferenceProblem(91)).toBe(daysBeforeMessage);
    expect(preferenceProblem(1.5)).toBe(daysBeforeMessage);
    expect(preferenceProblem(Number.NaN)).toBe(daysBeforeMessage);
  });

  it('names each reminder kind', () => {
    expect(reminderKindLabel('TaskDue')).toBe('Task');
    expect(reminderKindLabel('DocumentExpiration')).toBe('Document');
    expect(reminderKindLabel('Milestone')).toBe('Milestone');
    expect(reminderKindLabel('Appointment')).toBe('Appointment');
  });
});
