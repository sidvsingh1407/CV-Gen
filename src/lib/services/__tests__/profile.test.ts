import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import prisma from '../../db/index'
import {
  getProfile,
  createProfile,
  updateProfileHeader,
  createEntry,
  getEntry,
  deleteEntry,
  createFact,
  updateFact,
  deleteFact,
  ProfileServiceError,
} from '../profile'
import { EntryType, FactKind } from '@prisma/client'

describe('Profile Service', () => {
  let user1Id: string
  let user2Id: string

  beforeEach(async () => {
    await prisma.user.deleteMany({})

    const user1 = await prisma.user.create({ data: { email: 'user1@example.com' } })
    const user2 = await prisma.user.create({ data: { email: 'user2@example.com' } })

    user1Id = user1.id
    user2Id = user2.id
  })

  afterAll(async () => {
    await prisma.user.deleteMany({})
  })

  describe('Profile Operations', () => {
    it('creates and retrieves a profile', async () => {
      await createProfile(user1Id, { fullName: 'User One' })
      const profile = await getProfile(user1Id)
      expect(profile).not.toBeNull()
      expect(profile?.header).toMatchObject({ fullName: 'User One' })
    })

    it('updates profile header preserving other fields', async () => {
      await createProfile(user1Id, { fullName: 'User One', github: 'http://github.com/one' })
      await updateProfileHeader(user1Id, { fullName: 'User One Updated' })

      const profile = await getProfile(user1Id)
      expect(profile?.header).toMatchObject({
        fullName: 'User One Updated',
        github: 'http://github.com/one',
      })
    })
  })

  describe('Entry Operations', () => {
    it('creates and retrieves an entry', async () => {
      await createProfile(user1Id, { fullName: 'User One' })
      const entry = await createEntry(user1Id, {
        type: EntryType.experience,
        title: 'Engineer',
        start: '2020-01',
        end: '2021-01',
      })

      const retrieved = await getEntry(user1Id, entry.id)
      expect(retrieved.id).toEqual(entry.id)
      expect(retrieved.title).toEqual('Engineer')
    })

    it('prevents user2 from reading user1 entry', async () => {
      await createProfile(user1Id, { fullName: 'User One' })
      await createProfile(user2Id, { fullName: 'User Two' })
      const entry = await createEntry(user1Id, {
        type: EntryType.experience,
        title: 'Engineer',
      })

      await expect(getEntry(user2Id, entry.id)).rejects.toThrow(ProfileServiceError)
    })

    it('deletes an entry and cascades facts', async () => {
      await createProfile(user1Id, { fullName: 'User One' })
      const entry = await createEntry(user1Id, { type: EntryType.experience, title: 'Engineer' })
      await createFact(user1Id, entry.id, { text: 'Did a thing' })

      let facts = await prisma.fact.findMany({ where: { entryId: entry.id } })
      expect(facts.length).toBe(1)

      await deleteEntry(user1Id, entry.id)

      facts = await prisma.fact.findMany({ where: { entryId: entry.id } })
      expect(facts.length).toBe(0)
    })
  })

  describe('Fact Operations', () => {
    it('prevents updating text of locked_number fact', async () => {
      await createProfile(user1Id, { fullName: 'User One' })
      const entry = await createEntry(user1Id, { type: EntryType.experience, title: 'Engineer' })
      const fact = await createFact(user1Id, entry.id, {
        text: 'Increased sales by 50%',
        kind: FactKind.locked_number,
      })

      await expect(
        updateFact(user1Id, fact.id, { text: 'Increased sales by 60%' }),
      ).rejects.toThrow('Cannot update text of a locked_number fact')

      // But updating evidenceNote should work
      const updated = await updateFact(user1Id, fact.id, { evidenceNote: 'Dashboard link' })
      expect(updated.evidenceNote).toEqual('Dashboard link')
      expect(updated.text).toEqual('Increased sales by 50%')
    })

    it('enforces ownership when deleting facts', async () => {
      await createProfile(user1Id, { fullName: 'User One' })
      await createProfile(user2Id, { fullName: 'User Two' })
      const entry = await createEntry(user1Id, { type: EntryType.experience, title: 'Engineer' })
      const fact = await createFact(user1Id, entry.id, { text: 'Fact' })

      await expect(deleteFact(user2Id, fact.id)).rejects.toThrow(ProfileServiceError)
    })
  })
})
