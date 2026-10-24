import { PrismaClient } from '@prisma/client'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/cv_generator_test?schema=public'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
})

describe('Database Integrations', () => {
  beforeAll(async () => {
    // Ensure we are connected
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // Clean up database before each test
    // Cascade delete on User will wipe out related records as well.
    await prisma.user.deleteMany()
  })

  it('should enforce unique user emails', async () => {
    const user1 = await prisma.user.create({
      data: { email: 'test@example.com' },
    })
    expect(user1).toBeDefined()

    await expect(
      prisma.user.create({
        data: { email: 'test@example.com' },
      }),
    ).rejects.toThrow(/Unique constraint failed on the fields: \(`email`\)/)
  })

  it('should enforce one profile per user', async () => {
    const user = await prisma.user.create({
      data: { email: 'test_profile@example.com' },
    })

    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        header: { name: 'Test User' },
      },
    })
    expect(profile).toBeDefined()

    await expect(
      prisma.profile.create({
        data: {
          userId: user.id,
          header: { name: 'Another Profile' },
        },
      }),
    ).rejects.toThrow(/Unique constraint failed on the fields: \(`user_id`\)/)
  })

  it('should enforce negative daily_run_count constraint via Postgres check', async () => {
    await expect(
      prisma.user.create({
        data: { email: 'negative@example.com', dailyRunCount: -1 },
      }),
    ).rejects.toThrow(/users_daily_run_count_check/)
  })

  it('should successfully store valid enum values', async () => {
    const user = await prisma.user.create({
      data: { email: 'enums@example.com' },
    })

    const profile = await prisma.profile.create({
      data: { userId: user.id, header: {} },
    })

    const entry = await prisma.entry.create({
      data: {
        profileId: profile.id,
        type: 'experience',
        title: 'Software Engineer',
        visibility: 'on_request',
      },
    })

    expect(entry.type).toBe('experience')
    expect(entry.visibility).toBe('on_request')
  })

  it('should preserve fact check verbatim and not transform locked_number', async () => {
    const user = await prisma.user.create({
      data: { email: 'fact@example.com' },
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

    // Suppose user specified "1,000.00" as a string or text. Postgres text shouldn't morph it.
    const textValue = '1,000.00'
    const fact = await prisma.fact.create({
      data: {
        entryId: entry.id,
        kind: 'locked_number',
        text: textValue,
      },
    })

    expect(fact.text).toBe(textValue) // The precise user string is preserved
  })

  it('should cascade delete user records (Profiles, Entries, Runs, etc)', async () => {
    const user = await prisma.user.create({
      data: { email: 'delete_me@example.com' },
    })

    const profile = await prisma.profile.create({
      data: { userId: user.id, header: {} },
    })

    await prisma.entry.create({
      data: {
        profileId: profile.id,
        type: 'skill',
        title: 'Testing',
      },
    })

    await prisma.run.create({
      data: {
        userId: user.id,
        company: 'Acme',
        jdText: 'Need testers',
        roleTitle: 'QA',
        threshold: 75,
      },
    })

    // Now delete the user
    await prisma.user.delete({
      where: { id: user.id },
    })

    // Verify cascade deleted dependents
    const foundProfile = await prisma.profile.findUnique({ where: { id: profile.id } })
    const foundEntries = await prisma.entry.findMany({ where: { profileId: profile.id } })
    const foundRuns = await prisma.run.findMany({ where: { userId: user.id } })

    expect(foundProfile).toBeNull()
    expect(foundEntries.length).toBe(0)
    expect(foundRuns.length).toBe(0)
  })

  it('should reject invalid retries via Postgres check constraint', async () => {
    const user = await prisma.user.create({
      data: { email: 'retries@example.com' },
    })

    const run = await prisma.run.create({
      data: {
        userId: user.id,
        company: 'Acme',
        jdText: 'JD',
        roleTitle: 'Role',
        threshold: 80,
      },
    })

    const cvVersion = await prisma.cvVersion.create({
      data: {
        runId: run.id,
        cv: {},
      },
    })

    await expect(
      prisma.checkLog.create({
        data: {
          runId: run.id,
          cvVersionId: cvVersion.id,
          bulletId: 'b-1',
          layer1Result: true,
          layer2Verdict: 'not_yet_checked',
          retries: -5,
        },
      }),
    ).rejects.toThrow(/check_logs_retries_check/)
  })
})
