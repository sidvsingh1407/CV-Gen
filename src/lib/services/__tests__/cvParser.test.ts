import { describe, it, expect } from 'vitest'
import { parseCvText } from '../cvParser'
import { EntryType, FactKind } from '@prisma/client'

describe('DeterministicCvParser', () => {
  it('handles empty string', () => {
    const draft = parseCvText('')
    expect(draft.header.fullName).toBe('')
    expect(draft.entries).toEqual([])
  })

  it('extracts basic header info', () => {
    const text = `
      John Doe
      johndoe@example.com
      (555) 123-4567
      github.com/johndoe
      linkedin.com/in/johndoe
    `
    const draft = parseCvText(text)
    expect(draft.header.fullName).toBe('John Doe')
    expect(draft.header.email).toBe('johndoe@example.com')
    expect(draft.header.phone).toBe('(555) 123-4567')
    expect(draft.header.github).toBe('https://github.com/johndoe')
    expect(draft.header.linkedin).toBe('https://www.linkedin.com/in/johndoe')
  })

  it('extracts experience sections', () => {
    const text = `
      John Doe

      EXPERIENCE
      Software Engineer
      Tech Corp
      Jan 2020 - Present
      - Built a new microservice in Node.js
      - Improved performance by 20%
    `
    const draft = parseCvText(text)
    expect(draft.entries.length).toBe(1)

    const entry = draft.entries[0]
    expect(entry.type).toBe(EntryType.experience)
    expect(entry.title).toBe('Software Engineer')
    expect(entry.organization).toBe('Tech Corp')
    expect(entry.start).toBe('2020-01')
    expect(entry.end).toBe('Ongoing')
    expect(entry.facts.length).toBe(2)
    expect(entry.facts[0].text).toBe('Built a new microservice in Node.js')
    expect(entry.facts[0].kind).toBe(FactKind.free_text)
  })

  it('extracts education sections', () => {
    const text = `
      EDUCATION
      B.Sc. Computer Science
      University of Tech
      Sep 2015 - May 2019
      - Graduated with Honors
    `
    const draft = parseCvText(text)
    expect(draft.entries.length).toBe(1)

    const entry = draft.entries[0]
    expect(entry.type).toBe(EntryType.education)
    expect(entry.title).toBe('B.Sc. Computer Science')
    expect(entry.organization).toBe('University of Tech')
    expect(entry.start).toBe('2015-01')
    expect(entry.end).toBe('2019-01')
  })

  it('falls back to default name if none found', () => {
    const text = `
      EXPERIENCE
      Developer
      2020 - 2021
    `
    const draft = parseCvText(text)
    expect(draft.header.fullName).toBe('Unknown Name (Please Edit)')
  })
})
