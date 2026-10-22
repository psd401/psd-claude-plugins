// ABOUTME: Tests for what the pane shows: how threads are grouped and sorted, each row's text,
// ABOUTME: message bodies with every link's real address shown, and the choices for filing.

import { describe, expect, test } from 'claude-code/testing'

import { AUTHOR_COLORS, authorColor, bodyMarkdown, fileChoices, groupThreads, oneLine, rowParts, when } from '../hooks/pane'
import { BELL_SCHEDULE, T1, T2, T3, T4, thread, LUNCH_MENU } from './world'

const NOTES = 'dir:/Users/a/notes'

describe('groups', () => {
  test('this project, unfiled, each other project, then archived', () => {
    const groups = groupThreads(
      [
        thread({ thread_id: T1, projects: [LUNCH_MENU] }),
        thread({ thread_id: T2, projects: [BELL_SCHEDULE, LUNCH_MENU] }),
        thread({ thread_id: T3 }),
      ],
      [thread({ thread_id: T4, archived: true, projects: [BELL_SCHEDULE] })],
      BELL_SCHEDULE,
    )
    expect(groups.map(g => [g.id, g.title, g.threads.map(t => t.thread_id)])).toEqual([
      ['here', 'This project', [T2]],
      ['unfiled', 'Unfiled', [T3]],
      [`project:${LUNCH_MENU}`, 'lunch-menu', [T1, T2]],
      ['archived', 'Archived', [T4]],
    ])
  })

  test('this project and unfiled show even when empty; archived shows before it is loaded', () => {
    expect(groupThreads([], null, BELL_SCHEDULE).map(g => [g.id, g.threads.length])).toEqual([
      ['here', 0],
      ['unfiled', 0],
      ['archived', 0],
    ])
  })

  test('waiting threads come first, then the latest activity', () => {
    const [here] = groupThreads(
      [
        thread({ thread_id: T1, last_activity: '2026-10-07T10:00:00+00:00' }),
        thread({ thread_id: T2, last_activity: '2026-10-07T09:00:00+00:00', waiting_on_you: true }),
        thread({ thread_id: T3, last_activity: '2026-10-07T11:00:00+00:00' }),
      ],
      null,
      'dir:/elsewhere',
    ).slice(1)
    expect(here?.threads.map(t => t.thread_id)).toEqual([T2, T3, T1])
  })

  test('groups count what waits in them', () => {
    const groups = groupThreads([thread({ thread_id: T1, waiting_on_you: true }), thread({ thread_id: T2 })], null, BELL_SCHEDULE)
    expect(groups.find(g => g.id === 'unfiled')?.waiting).toBe(1)
  })
})

describe('rows', () => {
  const now = Date.parse('2026-10-07T20:00:00Z')

  test('a waiting thread shows who wrote last and how many are new', () => {
    const row = rowParts(thread({ thread_id: T1, waiting_on_you: true, unread_to_you: 2, unread: 3 }), now)
    expect(row.title).toBe('Schema review')
    expect(row.by).toBe('wren')
    expect(row.count).toBe('3 new')
  })

  test('a read thread has no count', () => {
    expect(rowParts(thread({ thread_id: T1 }), now).count).toBeNull()
  })

  test('a thread marked unread has no count: its mark already says it waits', () => {
    expect(rowParts(thread({ thread_id: T1, waiting_on_you: true, marked_unread: true }), now).count).toBeNull()
  })

  test('new messages not addressed to the person are counted, though the thread does not wait', () => {
    expect(rowParts(thread({ thread_id: T1, unread: 2 }), now).count).toBe('2 new')
  })

  test('times today are clock times; older ones are dates', () => {
    expect(when('2026-10-07T19:05:00Z', now)).toMatch(/^\d{1,2}:\d{2}$/)
    expect(when('2026-09-01T19:05:00Z', now)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/)
  })

  test('text from other people is kept to one plain line', () => {
    expect(oneLine('a\nb\tc\u0007d\u202ee')).toBe('a b c d e')
  })
})

describe('message bodies', () => {
  // A link's text can disguise where it goes, so no link forms at all: the markdown shows as
  // written, address included. Escaping beats finding links, which can't match the renderer.
  const formsNoLink = (markdown: string) => !/(^|[^\\])(\\\\)*[\[\]<]/.test(markdown)

  test('a link shows as written, its real address included', () => {
    const body = bodyMarkdown('See [the docs](https://evil.example/x).')
    expect(body).toBe('See \\[the docs\\](https://evil.example/x).')
    expect(formsNoLink(body)).toBe(true)
  })

  const tricks = [
    'See [the docs][1].\n\n[1]: https://evil.example/x',
    '[a [nested] link](https://evil.example/x)',
    '[parens](https://evil.example/a(b))',
    '<a href="https://evil.example/x">the docs</a>',
    '<https://evil.example/x>',
    '\\[escaped](https://evil.example/x)',
    '![image](https://evil.example/x.png)',
  ]
  for (const trick of tricks) {
    test(`no link forms from ${JSON.stringify(trick)}`, () => {
      const body = bodyMarkdown(trick)
      expect(formsNoLink(body)).toBe(true)
      expect(body).toContain('evil.example')
    })
  }

  test('control characters are dropped, newlines and tabs kept', () => {
    expect(bodyMarkdown('a\u0007b\n\tc\u202ed')).toBe('ab\n\tcd')
  })

  test('long bodies are cut to what the pane can draw', () => {
    const body = bodyMarkdown('x'.repeat(20_000))
    expect(body.length).toBeLessThanOrEqual(10_000)
    expect(body).toContain('read it with Claude for the rest')
  })
})

describe('filing choices', () => {
  test('lists projects to add, known here or seen in the inbox, and ones to remove', () => {
    const inbox = [thread({ thread_id: T2, projects: [LUNCH_MENU] }), thread({ thread_id: T3, suggested_project: 'git:github.com/psd401/library-site' })]
    const choices = fileChoices(thread({ thread_id: T1, projects: [NOTES] }), [BELL_SCHEDULE, NOTES], inbox)
    expect(choices).toEqual([
      { value: `add:${BELL_SCHEDULE}`, label: 'File in bell-schedule' },
      { value: `add:${LUNCH_MENU}`, label: 'File in lunch-menu' },
      { value: 'add:git:github.com/psd401/library-site', label: 'File in library-site' },
      { value: `remove:${NOTES}`, label: 'Remove from notes' },
    ])
  })

  test('two projects with one name are told apart by key', () => {
    const other = 'git:gitlab.example.org/team/bell-schedule'
    const labels = fileChoices(thread({ thread_id: T1 }), [BELL_SCHEDULE, other], []).map(c => c.label)
    expect(labels).toEqual([`File in ${BELL_SCHEDULE}`, `File in ${other}`])
  })
})

describe('author colors', () => {
  const participants = ['wren@example.com', 'parker@example.com', 'casey@example.com']

  test('each person in a thread gets their own color, the same every time', () => {
    const colors = participants.map(p => authorColor(p, participants))
    expect(new Set(colors).size).toBe(3)
    expect(authorColor('wren@example.com', participants)).toBe(colors[0]!)
  })

  test('colors come from the theme, and repeat past the palette', () => {
    const many = Array.from({ length: AUTHOR_COLORS.length + 1 }, (_, i) => `p${i}@example.com`)
    expect(AUTHOR_COLORS).toContain(authorColor(many[0]!, many))
    expect(authorColor(many[AUTHOR_COLORS.length]!, many)).toBe(authorColor(many[0]!, many))
  })

  test('someone no longer in the thread still gets a color', () => {
    expect(AUTHOR_COLORS).toContain(authorColor('gone@example.com', participants))
  })
})
