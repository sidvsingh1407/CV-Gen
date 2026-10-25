import prisma from '../db/index'
import { EntryType, FactKind, Visibility, Prisma } from '@prisma/client'

export class ProfileServiceError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
    this.name = 'ProfileServiceError'
  }
}

export async function getProfile(userId: string) {
  return await prisma.profile.findUnique({
    where: { userId },
    include: {
      entries: {
        include: {
          facts: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
    },
  })
}

export async function createProfile(userId: string, header: Record<string, unknown>) {
  return await prisma.profile.create({
    data: {
      userId,
      header: (header as Prisma.InputJsonValue) || { fullName: '' },
    },
  })
}

export async function updateProfileHeader(userId: string, header: Record<string, unknown>) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) {
    throw new ProfileServiceError('Profile not found', 'NOT_FOUND')
  }

  const newHeader = { ...(profile.header as Record<string, unknown>), ...header }

  return await prisma.profile.update({
    where: { userId },
    data: { header: newHeader as Prisma.InputJsonValue },
  })
}

export async function updateEducationSettings(userId: string, showMarks: boolean) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) {
    throw new ProfileServiceError('Profile not found', 'NOT_FOUND')
  }

  return await prisma.profile.update({
    where: { userId },
    data: { showMarks },
  })
}

export async function listEntries(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) return []

  return await prisma.entry.findMany({
    where: { profileId: profile.id },
    include: { facts: true },
    orderBy: { displayOrder: 'asc' },
  })
}

export async function createEntry(userId: string, data: Record<string, unknown>) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) {
    throw new ProfileServiceError('Profile not found', 'NOT_FOUND')
  }

  return await prisma.entry.create({
    data: {
      profileId: profile.id,
      type: data.type as EntryType,
      title: data.title as string,
      organization: data.organization as string | undefined,
      start: data.start as string | undefined,
      end: data.end as string | undefined,
      visibility: (data.visibility as Visibility) || Visibility.always,
      placement: data.placement as string | undefined,
      displayOrder: (data.displayOrder as number) || 0,
    },
  })
}

export async function getEntry(userId: string, entryId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) throw new ProfileServiceError('Profile not found', 'NOT_FOUND')

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { facts: true },
  })

  if (!entry || entry.profileId !== profile.id) {
    throw new ProfileServiceError('Entry not found or unauthorized', 'NOT_FOUND')
  }

  return entry
}

export async function updateEntry(userId: string, entryId: string, data: Record<string, unknown>) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) throw new ProfileServiceError('Profile not found', 'NOT_FOUND')

  const entry = await prisma.entry.findUnique({ where: { id: entryId } })
  if (!entry || entry.profileId !== profile.id) {
    throw new ProfileServiceError('Entry not found or unauthorized', 'NOT_FOUND')
  }

  // Filter keys that match Prisma.EntryUpdateInput manually to avoid arbitrary casting issues
  const safeData: Prisma.EntryUpdateInput = {}
  if ('title' in data) safeData.title = data.title as string
  if ('organization' in data) safeData.organization = data.organization as string
  if ('start' in data) safeData.start = data.start as string
  if ('end' in data) safeData.end = data.end as string
  if ('visibility' in data) safeData.visibility = data.visibility as Visibility
  if ('placement' in data) safeData.placement = data.placement as string
  if ('displayOrder' in data) safeData.displayOrder = data.displayOrder as number

  return await prisma.entry.update({
    where: { id: entryId },
    data: safeData,
  })
}

export async function deleteEntry(userId: string, entryId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) throw new ProfileServiceError('Profile not found', 'NOT_FOUND')

  const entry = await prisma.entry.findUnique({ where: { id: entryId } })
  if (!entry || entry.profileId !== profile.id) {
    throw new ProfileServiceError('Entry not found or unauthorized', 'NOT_FOUND')
  }

  return await prisma.entry.delete({ where: { id: entryId } })
}

export async function createFact(userId: string, entryId: string, data: Record<string, unknown>) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) throw new ProfileServiceError('Profile not found', 'NOT_FOUND')

  const entry = await prisma.entry.findUnique({ where: { id: entryId } })
  if (!entry || entry.profileId !== profile.id) {
    throw new ProfileServiceError('Entry not found or unauthorized', 'NOT_FOUND')
  }

  return await prisma.fact.create({
    data: {
      entryId: entry.id,
      text: data.text as string,
      kind: (data.kind as FactKind) || FactKind.free_text,
      evidenceNote: data.evidenceNote as string | undefined,
    },
  })
}

export async function updateFact(userId: string, factId: string, data: Record<string, unknown>) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) throw new ProfileServiceError('Profile not found', 'NOT_FOUND')

  const fact = await prisma.fact.findUnique({ where: { id: factId }, include: { entry: true } })
  if (!fact || fact.entry.profileId !== profile.id) {
    throw new ProfileServiceError('Fact not found or unauthorized', 'NOT_FOUND')
  }

  if (fact.kind === FactKind.locked_number && data.text && data.text !== fact.text) {
    throw new ProfileServiceError('Cannot update text of a locked_number fact', 'FORBIDDEN')
  }

  const safeData: Prisma.FactUpdateInput = {}
  if ('text' in data) safeData.text = data.text as string
  if ('kind' in data) safeData.kind = data.kind as FactKind
  if ('evidenceNote' in data) safeData.evidenceNote = data.evidenceNote as string

  return await prisma.fact.update({
    where: { id: factId },
    data: safeData,
  })
}

export async function deleteFact(userId: string, factId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) throw new ProfileServiceError('Profile not found', 'NOT_FOUND')

  const fact = await prisma.fact.findUnique({ where: { id: factId }, include: { entry: true } })
  if (!fact || fact.entry.profileId !== profile.id) {
    throw new ProfileServiceError('Fact not found or unauthorized', 'NOT_FOUND')
  }

  return await prisma.fact.delete({ where: { id: factId } })
}
