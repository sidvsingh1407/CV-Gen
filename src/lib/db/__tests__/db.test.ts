import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import prisma from '../index'
import { Prisma } from '@prisma/client'

describe('Database Integrations', () => {
  beforeAll(async () => {
    // Clean up
  })

  afterEach(async () => {
    // Cleanup everything
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should enforce unique user emails', async () => {
    const email = `unique-${Date.now()}@example.com`

    await prisma.user.create({
      data: { email },
    })

    await expect(
      prisma.user.create({
        data: { email },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError)
  })

  it('should enforce one profile per user', async () => {
    const user = await prisma.user.create({
      data: { email: `profile-${Date.now()}@example.com` },
    })

    await prisma.profile.create({
      data: {
        userId: user.id,
        header: { fullName: 'Test' },
      },
    })

    await expect(
      prisma.profile.create({
        data: {
          userId: user.id,
          header: { fullName: 'Test 2' },
        },
      }),
    ).rejects.toThrow(Prisma.PrismaClientKnownRequestError)
  })

  it('should enforce negative daily_run_count constraint via Postgres check', async () => {
    // This tests the custom check constraint added in the raw SQL migration
    await expect(
      prisma.user.create({
        data: {
          email: `negative-run-${Date.now()}@example.com`,
          dailyRunCount: -1,
        },
      }),
    ).rejects.toThrow(Prisma.PrismaClientUnknownRequestError)
  })

  it('should successfully store valid enum values', async () => {
    const user = await prisma.user.create({
      data: { email: `enum-${Date.now()}@example.com` },
    })

    const run = await prisma.run.create({
      data: {
        userId: user.id,
        jdText: 'Test JD',
        company: 'ACME Corp',
        roleTitle: 'Engineer',
        contextMode: 'campus',
        threshold: 70,
        status: 'pending',
      },
    })

    expect(run.status).toBe('pending')
    expect(run.contextMode).toBe('campus')
  })

  it('should preserve fact check verbatim and not transform locked_number', async () => {
    const user = await prisma.user.create({
      data: { email: `fact-${Date.now()}@example.com` },
    })

    const profile = await prisma.profile.create({
      data: { userId: user.id, header: {} },
    })

    const entry = await prisma.entry.create({
      data: {
        profileId: profile.id,
        type: 'project',
        title: 'Backend Rewrite',
      },
    })

    const fact = await prisma.fact.create({
      data: {
        entryId: entry.id,
        text: 'Reduced latency by 40%',
        kind: 'locked_number',
      },
    })

    expect(fact.kind).toBe('locked_number')
    expect(fact.text).toBe('Reduced latency by 40%')
  })

  it('should cascade delete user records (Profiles, Entries, Runs, etc)', async () => {
    const user = await prisma.user.create({
      data: { email: `cascade-${Date.now()}@example.com` },
    })

    const profile = await prisma.profile.create({
      data: { userId: user.id, header: {} },
    })

    const run = await prisma.run.create({
      data: {
        userId: user.id,
        jdText: 'Test JD',
        company: 'ACME Corp',
        roleTitle: 'Engineer',
        threshold: 50,
      },
    })

    // Assert records exist
    let p = await prisma.profile.findUnique({ where: { id: profile.id } })
    let r = await prisma.run.findUnique({ where: { id: run.id } })
    expect(p).not.toBeNull()
    expect(r).not.toBeNull()

    // Delete user
    await prisma.user.delete({ where: { id: user.id } })

    // Assert cascade worked
    p = await prisma.profile.findUnique({ where: { id: profile.id } })
    r = await prisma.run.findUnique({ where: { id: run.id } })
    expect(p).toBeNull()
    expect(r).toBeNull()
  })

  it('should reject invalid retries via Postgres check constraint', async () => {
    const user = await prisma.user.create({
      data: { email: `retry-${Date.now()}@example.com` },
    })

    const run = await prisma.run.create({
      data: {
        userId: user.id,
        jdText: 'Test JD',
        company: 'ACME Corp',
        roleTitle: 'Engineer',
        threshold: 50,
      },
    })

    const cv = await prisma.cvVersion.create({
      data: {
        runId: run.id,
        cv: {},
      },
    })

    await expect(
      prisma.checkLog.create({
        data: {
          runId: run.id,
          cvVersionId: cv.id,
          bulletId: 'bullet_1',
          layer1Result: true,
          layer2Verdict: 'supported',
          retries: -1, // invalid via DB CHECK constraint
        },
      }),
    ).rejects.toThrow(Prisma.PrismaClientUnknownRequestError)
  })
})
