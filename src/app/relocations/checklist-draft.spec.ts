import { checklistSelection, type DraftTask } from './checklist-draft';

describe('checklist selection', () => {
  it('omits tasks that were deselected and keeps edits on the rest', () => {
    const drafts: DraftTask[] = [
      {
        selected: true,
        code: 'give-notice',
        title: ' Give notice ',
        daysBeforeMove: '10',
        phase: 'Housing',
        priority: 'High',
        dependsOnCodes: [],
      },
      {
        selected: false,
        code: 'book-movers',
        title: 'Book movers',
        daysBeforeMove: '30',
        phase: 'Moving',
        priority: 'Normal',
        dependsOnCodes: ['give-notice'],
      },
    ];

    expect(checklistSelection(drafts)).toEqual({
      tasks: [
        {
          code: 'give-notice',
          title: 'Give notice',
          daysBeforeMove: 10,
          phase: 'Housing',
          priority: 'High',
        },
      ],
    });
  });
});
