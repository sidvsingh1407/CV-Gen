import prisma from '../db/index'
import { preferencesSchema } from '../schemas/preferences'
import { Prisma } from '@prisma/client'

export class PreferencesServiceError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
    this.name = 'PreferencesServiceError'
  }
}

export async function getPreferences(userId: string) {
  const ruleSettings = await prisma.ruleSettings.findUnique({
    where: { userId },
  })

  if (!ruleSettings) {
    // Return parsed defaults
    return preferencesSchema.parse({})
  }

  // Parse existing settings to ensure defaults are populated for any missing fields
  return preferencesSchema.parse(ruleSettings.settings)
}

export async function updatePreferences(userId: string, data: Record<string, unknown>) {
  // First get current preferences to use as base for partial update
  const currentPreferences = await getPreferences(userId)

  // We are going to do a deep merge for formatting
  const newFormatting = {
    ...currentPreferences.formatting,
    ...((data.formatting as Record<string, unknown>) || {}),
    margins: {
      ...currentPreferences.formatting.margins,
      ...(((data.formatting as Record<string, unknown>)?.['margins'] as Record<string, unknown>) ||
        {}),
    },
  }

  const updatedSettings = {
    ...currentPreferences,
    ...data,
    formatting: newFormatting,
  }

  if (data.excludedEntryIds && Array.isArray(data.excludedEntryIds)) {
    // Verify ownership
    const profile = await prisma.profile.findUnique({ where: { userId } })
    if (profile) {
      const ownedEntries = await prisma.entry.findMany({
        where: { profileId: profile.id, id: { in: data.excludedEntryIds } },
        select: { id: true },
      })
      const ownedEntryIds = ownedEntries.map((e) => e.id)
      const invalidIds = data.excludedEntryIds.filter((id) => !ownedEntryIds.includes(id))

      if (invalidIds.length > 0) {
        throw new PreferencesServiceError(
          `Invalid or unauthorized entry exclusions: ${invalidIds.join(', ')}`,
          'INVALID_EXCLUSION',
        )
      }
    } else {
      if (data.excludedEntryIds.length > 0) {
        throw new PreferencesServiceError('Profile not found', 'NOT_FOUND')
      }
    }
  }

  // Ensure fully validated before storing
  const finalSettings = preferencesSchema.parse(updatedSettings)

  const result = await prisma.ruleSettings.upsert({
    where: { userId },
    update: { settings: finalSettings as Prisma.InputJsonValue },
    create: {
      userId,
      settings: finalSettings as Prisma.InputJsonValue,
    },
  })

  return preferencesSchema.parse(result.settings)
}
