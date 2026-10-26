import { EntryType, FactKind, Visibility } from '@prisma/client'
import { headerSchema, entrySchema, factSchema } from '../schemas/profile'
import { z } from 'zod'

export interface DraftProfile {
  header: z.infer<typeof headerSchema>
  entries: (z.infer<typeof entrySchema> & { facts: z.infer<typeof factSchema>[] })[]
}

export interface CvParserProvider {
  parse(text: string): DraftProfile
}

export class DeterministicCvParser implements CvParserProvider {
  parse(text: string): DraftProfile {
    const draft: DraftProfile = {
      header: { fullName: '', email: '', phone: '', linkedin: '', github: '', portfolio: '' },
      entries: [],
    }

    if (!text || text.trim() === '') return draft

    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    const possibleName = lines[0]
    if (
      possibleName &&
      possibleName.split(' ').length <= 4 &&
      !this.isSectionHeading(possibleName)
    ) {
      draft.header.fullName = possibleName
    }

    const fullText = lines.join(' ')
    const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
    if (emailMatch) draft.header.email = emailMatch[0]

    const phoneMatch = fullText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
    if (phoneMatch) draft.header.phone = phoneMatch[0]

    const linkedinMatch = fullText.match(/linkedin\.com\/in\/[\w-]+\/?/i)
    if (linkedinMatch) draft.header.linkedin = `https://www.${linkedinMatch[0]}`

    const githubMatch = fullText.match(/github\.com\/[\w-]+\/?/i)
    if (githubMatch) draft.header.github = `https://${githubMatch[0]}`

    let currentSection: string | null = null
    let currentSectionLines: string[] = []
    const sections: Record<string, string[]> = {}

    for (const line of lines) {
      const heading = this.isSectionHeading(line)
      if (heading) {
        if (currentSection) sections[currentSection] = currentSectionLines
        currentSection = heading
        currentSectionLines = []
      } else {
        if (currentSection) currentSectionLines.push(line)
      }
    }
    if (currentSection) sections[currentSection] = currentSectionLines

    if (sections['experience']) draft.entries.push(...this.parseExperience(sections['experience']))
    if (sections['education']) draft.entries.push(...this.parseEducation(sections['education']))
    if (sections['skills']) draft.entries.push(...this.parseSkills(sections['skills']))
    if (sections['projects']) draft.entries.push(...this.parseProjects(sections['projects']))
    if (sections['certifications'])
      draft.entries.push(...this.parseCertifications(sections['certifications']))

    if (!draft.header.fullName) draft.header.fullName = 'Unknown Name (Please Edit)'

    return draft
  }

  private isSectionHeading(line: string): string | null {
    const l = line.toLowerCase().replace(/[^a-z]/g, '')
    if (l === 'experience' || l === 'workexperience' || l === 'employment') return 'experience'
    if (l === 'education' || l === 'academicbackground') return 'education'
    if (l === 'skills' || l === 'technologies' || l === 'technicalskills') return 'skills'
    if (l === 'projects' || l === 'personalprojects') return 'projects'
    if (l === 'certifications' || l === 'licenses') return 'certifications'
    if (l === 'awards' || l === 'honors') return 'awards'
    if (l === 'volunteer' || l === 'volunteering') return 'volunteer'
    return null
  }

  private parseExperience(lines: string[]) {
    const entries: any[] = []
    let currentEntry: any = null

    for (const line of lines) {
      const dateMatch = this.extractDates(line)
      if (dateMatch) {
        if (currentEntry && (currentEntry.title !== 'Unknown Title' || currentEntry.start)) {
          entries.push(currentEntry)
        }
        const possibleTitle = line.replace(dateMatch.raw, '').trim()
        if (
          currentEntry &&
          currentEntry.title !== 'Unknown Title' &&
          !currentEntry.start &&
          !possibleTitle
        ) {
          currentEntry.start = dateMatch.start
          currentEntry.end = dateMatch.end
        } else {
          currentEntry = {
            type: EntryType.experience,
            title: possibleTitle || 'Unknown Title',
            organization: '',
            start: dateMatch.start,
            end: dateMatch.end,
            visibility: Visibility.always,
            displayOrder: entries.length,
            placement: null,
            facts: [],
          }
        }
      } else if (currentEntry) {
        if (!currentEntry.organization && !line.startsWith('-') && !line.startsWith('•')) {
          currentEntry.organization = line
        } else if (line.startsWith('-') || line.startsWith('•')) {
          currentEntry.facts.push({
            text: line.replace(/^[-•]\s*/, '').trim(),
            kind: FactKind.free_text,
            evidenceNote: null,
          })
        } else {
          currentEntry.facts.push({
            text: line.trim(),
            kind: FactKind.free_text,
            evidenceNote: null,
          })
        }
      } else {
        currentEntry = {
          type: EntryType.experience,
          title: line,
          organization: '',
          start: null,
          end: null,
          visibility: Visibility.always,
          displayOrder: entries.length,
          placement: null,
          facts: [],
        }
      }
    }
    if (currentEntry && !entries.includes(currentEntry)) entries.push(currentEntry)
    return entries
  }

  private parseEducation(lines: string[]) {
    const entries: any[] = []
    let currentEntry: any = null

    for (const line of lines) {
      const dateMatch = this.extractDates(line)
      if (dateMatch) {
        if (currentEntry && (currentEntry.title !== 'Unknown Degree' || currentEntry.start)) {
          entries.push(currentEntry)
        }
        const possibleTitle = line.replace(dateMatch.raw, '').trim()
        if (
          currentEntry &&
          currentEntry.title !== 'Unknown Degree' &&
          !currentEntry.start &&
          !possibleTitle
        ) {
          currentEntry.start = dateMatch.start
          currentEntry.end = dateMatch.end
        } else {
          currentEntry = {
            type: EntryType.education,
            title: possibleTitle || 'Unknown Degree',
            organization: '',
            start: dateMatch.start,
            end: dateMatch.end,
            visibility: Visibility.always,
            displayOrder: entries.length,
            placement: null,
            facts: [],
          }
        }
      } else if (currentEntry) {
        if (!currentEntry.organization && !line.startsWith('-') && !line.startsWith('•')) {
          currentEntry.organization = line
        } else {
          currentEntry.facts.push({
            text: line.replace(/^[-•]\s*/, '').trim(),
            kind: FactKind.free_text,
            evidenceNote: null,
          })
        }
      } else {
        currentEntry = {
          type: EntryType.education,
          title: line,
          organization: '',
          start: null,
          end: null,
          visibility: Visibility.always,
          displayOrder: entries.length,
          placement: null,
          facts: [],
        }
      }
    }
    if (currentEntry && !entries.includes(currentEntry)) entries.push(currentEntry)
    return entries
  }

  private parseSkills(lines: string[]) {
    const entries: any[] = []
    let currentEntry: any = null

    for (const line of lines) {
      if (line.includes(':')) {
        if (currentEntry) entries.push(currentEntry)
        const [category, skills] = line.split(':')
        currentEntry = {
          type: EntryType.skill,
          title: category.trim(),
          organization: null,
          start: null,
          end: null,
          visibility: Visibility.always,
          displayOrder: entries.length,
          placement: null,
          facts: skills
            .split(',')
            .map((s) => ({ text: s.trim(), kind: FactKind.free_text, evidenceNote: null }))
            .filter((s: any) => s.text),
        }
      } else {
        if (!currentEntry) {
          currentEntry = {
            type: EntryType.skill,
            title: 'Skills',
            organization: null,
            start: null,
            end: null,
            visibility: Visibility.always,
            displayOrder: entries.length,
            placement: null,
            facts: [],
          }
        }
        currentEntry.facts.push(
          ...line
            .split(',')
            .map((s: string) => ({
              text: s.replace(/^[-•]\s*/, '').trim(),
              kind: FactKind.free_text,
              evidenceNote: null,
            }))
            .filter((s: any) => s.text),
        )
      }
    }
    if (currentEntry && !entries.includes(currentEntry)) entries.push(currentEntry)
    return entries
  }

  private parseProjects(lines: string[]) {
    const entries: any[] = []
    let currentEntry: any = null

    for (const line of lines) {
      const dateMatch = this.extractDates(line)
      if (dateMatch) {
        if (currentEntry && !entries.includes(currentEntry)) entries.push(currentEntry)
        currentEntry = {
          type: EntryType.project,
          title: line.replace(dateMatch.raw, '').trim() || 'Unknown Project',
          organization: null,
          start: dateMatch.start,
          end: dateMatch.end,
          visibility: Visibility.always,
          displayOrder: entries.length,
          placement: null,
          facts: [],
        }
      } else if (currentEntry) {
        currentEntry.facts.push({
          text: line.replace(/^[-•]\s*/, '').trim(),
          kind: FactKind.free_text,
          evidenceNote: null,
        })
      } else {
        currentEntry = {
          type: EntryType.project,
          title: line,
          organization: null,
          start: null,
          end: null,
          visibility: Visibility.always,
          displayOrder: entries.length,
          placement: null,
          facts: [],
        }
      }
    }
    if (currentEntry && !entries.includes(currentEntry)) entries.push(currentEntry)
    return entries
  }

  private parseCertifications(lines: string[]) {
    const entries: any[] = []
    let currentEntry: any = null

    for (const line of lines) {
      const dateMatch = this.extractDates(line)
      if (dateMatch) {
        if (currentEntry && !entries.includes(currentEntry)) entries.push(currentEntry)
        currentEntry = {
          type: EntryType.certification,
          title: line.replace(dateMatch.raw, '').trim() || 'Unknown Certification',
          organization: null,
          start: dateMatch.start,
          end: dateMatch.end,
          visibility: Visibility.always,
          displayOrder: entries.length,
          placement: null,
          facts: [],
        }
      } else if (currentEntry) {
        currentEntry.facts.push({
          text: line.replace(/^[-•]\s*/, '').trim(),
          kind: FactKind.free_text,
          evidenceNote: null,
        })
      } else {
        currentEntry = {
          type: EntryType.certification,
          title: line,
          organization: null,
          start: null,
          end: null,
          visibility: Visibility.always,
          displayOrder: entries.length,
          placement: null,
          facts: [],
        }
      }
    }
    if (currentEntry && !entries.includes(currentEntry)) entries.push(currentEntry)
    return entries
  }

  private extractDates(text: string): { start: string; end: string; raw: string } | null {
    const datePattern =
      /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(\d{4})\s*(?:-|to|–)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+)?(\d{4}|Present|Current|Ongoing)/i
    const match = text.match(datePattern)

    if (match) {
      const startYear = match[1]
      const endYear = match[2]

      let end = endYear
      if (['present', 'current', 'ongoing'].includes(endYear.toLowerCase())) {
        end = 'Ongoing'
      } else {
        end = `${endYear}-01`
      }

      return {
        start: `${startYear}-01`,
        end: end,
        raw: match[0],
      }
    }

    const singleYearPattern = /\b(19|20)\d{2}\b/
    const singleYearMatch = text.match(singleYearPattern)
    if (singleYearMatch) {
      return {
        start: `${singleYearMatch[0]}-01`,
        end: `${singleYearMatch[0]}-01`,
        raw: singleYearMatch[0],
      }
    }
    return null
  }
}

export function parseCvText(text: string): DraftProfile {
  const parser = new DeterministicCvParser()
  return parser.parse(text)
}
