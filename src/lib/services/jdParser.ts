import { JdInput, JdParsedResult, jdInputSchema, jdParsedSchema } from '../schemas/jdParser'

function extractListItems(text: string): string[] {
  const lines = text.split('\n')
  const items: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    // Match common bullet points (- , * , • , \d. )
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/) || trimmed.match(/^\d+\.\s+(.+)/)
    if (bulletMatch) {
      items.push(bulletMatch[1].trim())
    } else if (trimmed.length > 0 && !trimmed.endsWith(':')) {
      // Only add non-bullet lines if they are not just section headings, and look substantial.
      // Often JD sections without bullets are comma separated or just sentences.
      // This is a simple heuristic.
      if (trimmed.length > 20 || trimmed.includes(',')) {
        items.push(trimmed)
      }
    }
  }
  // Deduplicate while preserving order
  return Array.from(new Set(items))
}

export function parseJd(text: string): JdParsedResult {
  const normalizedText = text.replace(/\r\n/g, '\n').trim()

  const result: JdParsedResult = {
    schemaVersion: 1,
    jobTitle: null,
    companyName: null,
    location: null,
    workArrangement: 'unknown',
    employmentType: 'unknown',
    seniority: 'unknown',
    requiredSkills: [],
    preferredSkills: [],
    responsibilities: [],
    requiredQualifications: [],
    preferredQualifications: [],
    experienceRequirement: null,
    educationRequirement: null,
    salaryRange: null,
    benefits: [],
    keywords: [],
    unparsedSections: [],
    warnings: [],
  }

  // 1. Identify common fields from the whole text using regex heuristics.
  // Job Title, Company, Location are very hard without structural cues (like HTML or specific markdown).
  // We'll look for common patterns at the beginning of the text.

  const lines = normalizedText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Heuristics for top-level info
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const lowerLine = lines[i].toLowerCase()

    // Work Arrangement
    if (lowerLine.includes('remote') && result.workArrangement === 'unknown') {
      result.workArrangement = 'remote'
    } else if (lowerLine.includes('hybrid') && result.workArrangement === 'unknown') {
      result.workArrangement = 'hybrid'
    } else if (
      lowerLine.includes('onsite') ||
      (lowerLine.includes('on-site') && result.workArrangement === 'unknown')
    ) {
      result.workArrangement = 'onsite'
    }

    // Employment Type
    if (
      (lowerLine.includes('full time') || lowerLine.includes('full-time')) &&
      result.employmentType === 'unknown'
    ) {
      result.employmentType = 'full_time'
    } else if (
      (lowerLine.includes('part time') || lowerLine.includes('part-time')) &&
      result.employmentType === 'unknown'
    ) {
      result.employmentType = 'part_time'
    } else if (lowerLine.includes('contract') && result.employmentType === 'unknown') {
      result.employmentType = 'contract'
    } else if (lowerLine.includes('internship') && result.employmentType === 'unknown') {
      result.employmentType = 'internship'
    }

    // Seniority
    if (lowerLine.includes('senior') && result.seniority === 'unknown') {
      result.seniority = 'senior'
    } else if (lowerLine.includes('manager') && result.seniority === 'unknown') {
      result.seniority = 'manager'
    } else if (lowerLine.includes('director') && result.seniority === 'unknown') {
      result.seniority = 'director'
    } else if (lowerLine.includes('lead') && result.seniority === 'unknown') {
      result.seniority = 'lead'
    } else if (lowerLine.includes('intern') && result.seniority === 'unknown') {
      result.seniority = 'intern'
    } else if (lowerLine.includes('executive') && result.seniority === 'unknown') {
      result.seniority = 'executive'
    } else if (lowerLine.includes('entry level') && result.seniority === 'unknown') {
      result.seniority = 'entry'
    }
  }

  // Very naive salary extraction
  const salaryRegex =
    /\$?\s*([\d,]+)\s*(?:-|to)\s*\$?\s*([\d,]+)\s*(?:per\s+|p\/|\/\s*)?(year|yr|month|mo|hr|hour)?/i
  const salaryMatch = normalizedText.match(salaryRegex)
  if (salaryMatch) {
    const min = parseInt(salaryMatch[1].replace(/,/g, ''), 10)
    const max = parseInt(salaryMatch[2].replace(/,/g, ''), 10)
    let payPeriod = salaryMatch[3] ? salaryMatch[3].toLowerCase() : undefined

    // normalize pay period
    if (payPeriod === 'yr') payPeriod = 'year'
    if (payPeriod === 'mo') payPeriod = 'month'
    if (payPeriod === 'hr') payPeriod = 'hour'

    if (!isNaN(min) && !isNaN(max)) {
      result.salaryRange = {
        min,
        max,
        currency: normalizedText.slice(salaryMatch.index, salaryMatch.index! + 5).includes('$')
          ? 'USD'
          : undefined,
        payPeriod,
      }
    }
  }

  // 2. Section detection.
  // We look for common headings.
  const headings = [
    {
      key: 'responsibilities',
      regex: /^responsibilities|^what you.*ll do|^what you.*ll be doing|^your role/i,
    },
    { key: 'requirements', regex: /^requirements|^what you need|^qualifications/i },
    { key: 'preferred', regex: /^preferred qualifications|^nice to have|^bonus points/i },
    { key: 'skills', regex: /^skills|^technologies/i },
    { key: 'benefits', regex: /^benefits|^perks|^what we offer/i },
    { key: 'about_role', regex: /^about the role|^the role/i },
  ]

  let currentSection = 'unparsed'
  let sectionContent: string[] = []
  const unparsedSectionsMap: { heading?: string; content: string[] }[] = []

  const commitSection = () => {
    if (sectionContent.length === 0) return

    const content = sectionContent.join('\n')

    switch (currentSection) {
      case 'responsibilities':
        result.responsibilities.push(...extractListItems(content))
        break
      case 'requirements':
        // Heuristic to split skills vs general qualifications if possible, but mostly dump into qualifications.
        // Same for experience and education.
        const reqs = extractListItems(content)
        result.requiredQualifications.push(...reqs)

        // Try to extract years of experience
        const expMatch = content.match(/(\d+)(?:\+|-?\d+)?\s+years?(?:\s+of)?\s+experience/i)
        if (expMatch && !result.experienceRequirement) {
          result.experienceRequirement = expMatch[0]
        }
        // Try to extract education
        if (
          (content.toLowerCase().includes('bachelor') || content.toLowerCase().includes('b.s.')) &&
          !result.educationRequirement
        ) {
          result.educationRequirement = "Bachelor's Degree"
        } else if (
          (content.toLowerCase().includes('master') || content.toLowerCase().includes('m.s.')) &&
          !result.educationRequirement
        ) {
          result.educationRequirement = "Master's Degree"
        }
        break
      case 'preferred':
        result.preferredQualifications.push(...extractListItems(content))
        break
      case 'skills':
        result.requiredSkills.push(...extractListItems(content))
        break
      case 'benefits':
        result.benefits.push(...extractListItems(content))
        break
      case 'about_role':
        unparsedSectionsMap.push({ heading: 'About the Role', content: sectionContent })
        break
      default:
        if (currentSection === 'unparsed') {
          if (
            unparsedSectionsMap.length === 0 ||
            unparsedSectionsMap[unparsedSectionsMap.length - 1].heading
          ) {
            unparsedSectionsMap.push({ content: sectionContent })
          } else {
            unparsedSectionsMap[unparsedSectionsMap.length - 1].content.push(...sectionContent)
          }
        } else {
          unparsedSectionsMap.push({ heading: currentSection, content: sectionContent })
        }
        break
    }
  }

  for (const line of lines) {
    let isHeading = false
    if (line.length < 60 && !line.match(/^[-*•\d]/)) {
      // Looks like a heading
      for (const heading of headings) {
        // Exact match or ends with colon
        const cleaned = line.replace(/:$/, '').trim()
        if (heading.regex.test(cleaned)) {
          commitSection()
          currentSection = heading.key
          sectionContent = []
          isHeading = true
          break
        }
      }
    }

    if (!isHeading) {
      sectionContent.push(line)
    }
  }
  commitSection()

  // Process unparsed sections
  for (const sec of unparsedSectionsMap) {
    if (sec.content.length > 0) {
      result.unparsedSections.push({
        heading: sec.heading,
        text: sec.content.join('\n'),
      })
    }
  }

  // Deduplicate
  result.requiredSkills = Array.from(new Set(result.requiredSkills))
  result.preferredSkills = Array.from(new Set(result.preferredSkills))
  result.responsibilities = Array.from(new Set(result.responsibilities))
  result.requiredQualifications = Array.from(new Set(result.requiredQualifications))
  result.preferredQualifications = Array.from(new Set(result.preferredQualifications))
  result.benefits = Array.from(new Set(result.benefits))

  // Warnings
  if (result.responsibilities.length === 0 && result.requiredQualifications.length === 0) {
    result.warnings.push(
      'Could not definitively extract responsibilities or requirements. The text may lack clear section headings.',
    )
  }
  if (!result.jobTitle) {
    result.warnings.push('Job title could not be confidently identified.')
  }

  return jdParsedSchema.parse(result)
}

export function parseJdService(input: unknown): JdParsedResult {
  const validatedInput = jdInputSchema.parse(input)
  return parseJd(validatedInput.text)
}
