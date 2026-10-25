import {
  appointmentDay,
  endBeforeStartMessage,
  eventProblem,
  fromLocalInput,
  marksOn,
  monthDays,
  titleRequiredMessage,
  toLocalInput,
  visibleMarks,
} from './schedule';

describe('calendar month', () => {
  it('starts the week on Monday and includes the neighbouring days', () => {
    const october = monthDays(2026, 10);

    expect(october).toHaveLength(35);
    expect(october[0]).toEqual({ date: '2026-09-28', inMonth: false });
    expect(october[3]).toEqual({ date: '2026-10-01', inMonth: true });
    expect(october[33]).toEqual({ date: '2026-10-31', inMonth: true });
    expect(october[34]).toEqual({ date: '2026-11-01', inMonth: false });
  });

  it('places a milestone on its date and an appointment on the local day', () => {
    const startsAt = new Date(2026, 10, 15, 22, 0).toISOString();
    const marks = marksOn(
      '2026-11-15',
      [
        {
          id: 'move',
          kind: 'Milestone',
          title: 'Move day',
          occursOn: '2026-12-01',
          startsAt: null,
        },
        {
          id: 'keys',
          kind: 'Appointment',
          title: 'Key handover',
          occursOn: null,
          startsAt,
        },
      ],
      [{ taskId: 'notice', title: 'Give notice', dueDate: '2026-11-15' }],
    );

    expect(appointmentDay(startsAt)).toBe('2026-11-15');
    expect(marks.map((mark) => mark.kind)).toEqual(['appointment', 'task']);
    expect(
      marksOn(
        '2026-12-01',
        [
          {
            id: 'move',
            kind: 'Milestone',
            title: 'Move day',
            occursOn: '2026-12-01',
            startsAt: null,
          },
        ],
        [],
      ),
    ).toEqual([{ id: 'move', kind: 'milestone', title: 'Move day' }]);
  });

  it('keeps extra marks off the day cell', () => {
    const marks = [
      { id: '1', kind: 'milestone' as const, title: 'One' },
      { id: '2', kind: 'appointment' as const, title: 'Two' },
      { id: '3', kind: 'task' as const, title: 'Three' },
    ];

    expect(visibleMarks(marks)).toEqual({
      shown: [marks[0], marks[1]],
      extra: 1,
    });
  });

  it('round-trips a local start time', () => {
    expect(toLocalInput(fromLocalInput('2026-11-15T09:30'))).toBe('2026-11-15T09:30');
  });

  it('rejects a blank title and an end that is not later', () => {
    expect(
      eventProblem({
        kind: 'Milestone',
        title: '  ',
        occursOn: '2026-12-01',
        startsAt: '',
        endsAt: '',
        location: '',
      }),
    ).toBe(titleRequiredMessage);
    expect(
      eventProblem({
        kind: 'Appointment',
        title: 'Key handover',
        occursOn: '',
        startsAt: '2026-11-15T15:00',
        endsAt: '2026-11-15T15:00',
        location: '',
      }),
    ).toBe(endBeforeStartMessage);
    expect(
      eventProblem({
        kind: 'Milestone',
        title: 'Move day',
        occursOn: '2026-12-01',
        startsAt: '',
        endsAt: '',
        location: '',
      }),
    ).toBeNull();
  });
});
