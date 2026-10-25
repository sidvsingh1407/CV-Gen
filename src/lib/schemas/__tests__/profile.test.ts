import { describe, it, expect } from 'vitest'
import { headerSchema, entrySchema, factSchema } from '../profile'
import { EntryType, FactKind } from '@prisma/client'

describe('Profile Schemas', () => {
  describe('headerSchema', () => {
    it('validates a correct header', () => {
      const valid = {
        fullName: 'John Doe',
        email: 'john@example.com',
        github: 'https://github.com/johndoe',
      }
      expect(headerSchema.parse(valid)).toEqual(valid)
    })

    it('rejects empty fullName', () => {
      const invalid = { fullName: '' }
      expect(() => headerSchema.parse(invalid)).toThrow('Full name cannot be empty')
    })

    it('rejects invalid email', () => {
      const invalid = { fullName: 'John', email: 'not-an-email' }
      expect(() => headerSchema.parse(invalid)).toThrow('Invalid email')
    })

    it('rejects invalid URL', () => {
      const invalid = { fullName: 'John', github: 'github.com/johndoe' }
      expect(() => headerSchema.parse(invalid)).toThrow('Invalid URL')
    })
  })

  describe('entrySchema', () => {
    it('validates correct entry with full dates', () => {
      const valid = {
        type: EntryType.experience,
        title: 'Software Engineer',
        start: '2020-01-01',
        end: '2023-12-31',
      }
      expect(entrySchema.parse(valid)).toMatchObject(valid)
    })

    it('validates correct entry with partial dates', () => {
      const valid = {
        type: EntryType.experience,
        title: 'Software Engineer',
        start: '2020-01',
        end: 'Ongoing',
      }
      expect(entrySchema.parse(valid)).toMatchObject(valid)
    })

    it('rejects invalid date formats', () => {
      expect(() =>
        entrySchema.parse({ type: EntryType.experience, title: 'Job', start: '2020/01/01' }),
      ).toThrow()
      expect(() =>
        entrySchema.parse({ type: EntryType.experience, title: 'Job', start: '2020-13' }),
      ).toThrow()
      expect(() =>
        entrySchema.parse({ type: EntryType.experience, title: 'Job', start: '2020-02-30' }),
      ).toThrow() // Invalid calendar date
    })

    it('rejects end date before start date', () => {
      expect(() =>
        entrySchema.parse({
          type: EntryType.experience,
          title: 'Job',
          start: '2022-01',
          end: '2021-12',
        }),
      ).toThrow('End date cannot be earlier than start date')
    })
  })

  describe('factSchema', () => {
    it('validates valid fact', () => {
      const valid = {
        text: 'Increased performance by 50%',
        kind: FactKind.locked_number,
        evidenceNote: 'Metrics dashboard',
      }
      expect(factSchema.parse(valid)).toEqual(valid)
    })

    it('rejects empty or whitespace text', () => {
      expect(() => factSchema.parse({ text: '' })).toThrow()
      expect(() => factSchema.parse({ text: '   ' })).toThrow()
    })
  })
})
