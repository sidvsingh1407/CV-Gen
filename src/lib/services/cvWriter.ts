import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { JdParsedResult } from '../schemas/jdParser'
import { CvSelectorOutput, SelectedEntryRecord } from '../schemas/cvSelector'
import { preferencesSchema, SUPPORTED_SECTIONS } from '../schemas/preferences'
import { ProfileEntryWithFacts } from './cvSelector'
import {
  CvDraftOutput,
  DraftSection,
  DraftItem,
  DraftItemWarning,
  DraftHeader,
} from '../schemas/cvDraft'

export type WriterInput = {
  jd: JdParsedResult
  selection: CvSelectorOutput
  profileEntries: ProfileEntryWithFacts[]
  headerData?: DraftHeader
  preferences?: z.infer<typeof preferencesSchema>
}

// Map entry types to section IDs
const typeToSectionMap: Record<string, (typeof SUPPORTED_SECTIONS)[number]> = {
  experience: 'experience',
  project: 'projects',
  freelance: 'freelance',
  education: 'education',
  certification: 'certifications',
  skill: 'skills',
  position: 'positions',
  volunteer: 'volunteer',
}

const sectionHeadings: Record<(typeof SUPPORTED_SECTIONS)[number], string> = {
  header: 'Header',
  summary: 'Professional Summary',
  experience: 'Experience',
  projects: 'Projects',
  freelance: 'Freelance Work',
  certifications: 'Certifications',
  education: 'Education',
  skills: 'Skills',
  positions: 'Positions of Responsibility',
  volunteer: 'Volunteer Experience',
}

function checkBannedCharacters(text: string, bannedChars: string[]): string[] {
  const found: string[] = []
  for (const char of bannedChars) {
    if (text.includes(char)) {
      found.push(char)
    }
  }
  return found
}

function formatDateRange(start?: string | null, end?: string | null): string | undefined {
  if (!start) return undefined
  if (!end) return `${start} - Present`
  return `${start} - ${end}`
}

export function generateCvDraft(input: WriterInput): CvDraftOutput {
  const { jd, selection, profileEntries, headerData, preferences } = input

  const sectionOrder = preferences?.sectionOrder || [...SUPPORTED_SECTIONS]
  const bannedCharacters = preferences?.bannedCharacters || []
  const globalWarnings: string[] = []
  const sections: DraftSection[] = []

  // Create a lookup for full entries to get un-selected properties (like dates, title)
  const entryLookup = new Map<string, ProfileEntryWithFacts>()
  for (const entry of profileEntries) {
    entryLookup.set(entry.id, entry)
  }

  // Group selected entries by section
  const sectionItemsMap = new Map<string, SelectedEntryRecord[]>()
  for (const section of sectionOrder) {
    sectionItemsMap.set(section, [])
  }

  let hasOnRequestContent = false

  for (const selectedEntry of selection.selectedEntries) {
    const fullEntry = entryLookup.get(selectedEntry.sourceEntryId)
    if (!fullEntry) continue

    // Enforce visibility explicitly just in case selection passed it
    if (selectedEntry.visibility === 'never' || fullEntry.visibility === 'never') {
      continue
    }

    if (selectedEntry.visibility === 'on_request' || fullEntry.visibility === 'on_request') {
      hasOnRequestContent = true
      continue // Withhold on_request content as per instructions
    }

    const sectionId = typeToSectionMap[selectedEntry.entryType]
    if (sectionId && sectionItemsMap.has(sectionId)) {
      sectionItemsMap.get(sectionId)!.push(selectedEntry)
    }
  }

  if (hasOnRequestContent) {
    globalWarnings.push(
      'Some conditional (on_request) content was withheld from this draft as authorization is required.',
    )
  }

  // Construct sections based on order
  for (const sectionId of sectionOrder) {
    if (sectionId === 'header' || sectionId === 'summary') {
      continue // Handled separately
    }

    const selectedForSection = sectionItemsMap.get(sectionId) || []
    if (selectedForSection.length === 0) continue

    const draftItems: DraftItem[] = []

    for (const record of selectedForSection) {
      const fullEntry = entryLookup.get(record.sourceEntryId)!

      const itemWarnings: DraftItemWarning[] = []
      const foundBanned = checkBannedCharacters(
        fullEntry.title + (fullEntry.organization || ''),
        bannedCharacters,
      )
      if (foundBanned.length > 0) {
        itemWarnings.push({
          type: 'banned_character',
          message: `Entry title/organization contains banned strings: ${foundBanned.join(', ')}`,
        })
      }

      // We create a parent DraftItem for the entry itself (its heading), and then child items for facts.
      // But according to the schema, sections have a flat array of items.
      // We will model the entry as an item with `title`, `organization`, and `dateString`,
      // and its text will represent its primary description. Then we add facts as subsequent items or append them.
      // A more standard approach for flat items: Each fact is an item, and they share the same title/org/date context.

      for (const fact of record.selectedFacts) {
        const factWarnings: DraftItemWarning[] = []
        const factBanned = checkBannedCharacters(fact.text, bannedCharacters)
        if (factBanned.length > 0) {
          factWarnings.push({
            type: 'banned_character',
            message: `Fact contains banned strings: ${factBanned.join(', ')}`,
          })
        }

        if (!fact.isVerified) {
          // Optional: add a warning if it's unverified, though verificationStatus covers this
        }

        draftItems.push({
          id: uuidv4(),
          text: fact.text,
          sourceEntryId: fullEntry.id,
          sourceFactIds: [fact.id],
          verificationStatus: fact.isVerified ? 'verified' : 'unverified',
          matchedRequirementIds: record.matchedRequirementIds,
          warnings: [...itemWarnings, ...factWarnings],
          title: fullEntry.title,
          organization: fullEntry.organization || undefined,
          dateString: formatDateRange(fullEntry.start, fullEntry.end),
        })
      }

      // If the entry has no selected facts but was selected (e.g. skill entry), create an item for the entry itself
      if (record.selectedFacts.length === 0) {
        draftItems.push({
          id: uuidv4(),
          text: fullEntry.title,
          sourceEntryId: fullEntry.id,
          sourceFactIds: [], // no specific facts
          verificationStatus: 'unknown',
          matchedRequirementIds: record.matchedRequirementIds,
          warnings: itemWarnings,
          title: fullEntry.title,
          organization: fullEntry.organization || undefined,
          dateString: formatDateRange(fullEntry.start, fullEntry.end),
        })
      }
    }

    if (draftItems.length > 0) {
      sections.push({
        sectionId,
        heading: sectionHeadings[sectionId],
        items: draftItems,
      })
    }
  }

  const hasSufficientContent = sections.length > 0

  return {
    schemaVersion: 1,
    status: hasSufficientContent ? 'draft_ready' : 'insufficient_content',
    targetRole: jd.jobTitle,
    header: headerData || null,
    sections,
    warnings: globalWarnings,
    formatting: preferences?.formatting,
    tone: preferences?.tone,
    pageMode: preferences?.pageMode,
  }
}
