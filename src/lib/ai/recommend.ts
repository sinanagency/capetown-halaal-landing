// =============================================================================
// lib/ai/recommend.ts
//
// Combines completeness score + dupe candidates + sector suggestions into a
// single nudge the bulk-review UI shows next to each row. The recommendation
// is ALWAYS a suggestion. Samreen (the operator) clicks; we do not auto-act.
//
// Rules (first matching wins):
//   1. completeness_score < 40 AND no business_description  -> reject_spam
//   2. dupe_candidates.length > 0                            -> review (force human look)
//   3. missing critical (no phone OR no email)               -> info_request
//   4. completeness_score >= 80 AND no dupes                 -> approve
//   5. otherwise                                             -> review
//
// The reason string is plain text, comma-separated, no em-dashes (law 7).
// =============================================================================

import type { CompletenessResult } from './completeness-scorer'
import type { DupeCandidate } from './dupe-detector'
import type { SectorSuggestion } from './sector-classifier'

export type Recommendation = 'approve' | 'info_request' | 'review' | 'reject_spam'

export interface RecommendInput {
  completeness: CompletenessResult
  dupes: DupeCandidate[]
  sectors: SectorSuggestion[]
  // Raw signals the rules inspect directly
  has_business_description: boolean
  has_phone: boolean
  has_email: boolean
}

export interface RecommendOutput {
  recommendation: Recommendation
  recommendation_reason: string
}

function joinReason(parts: string[]): string {
  return parts.filter((p) => p.length > 0).join(', ')
}

export function decideRecommendation(input: RecommendInput): RecommendOutput {
  const { completeness, dupes, sectors, has_business_description, has_phone, has_email } = input
  const topSector = sectors[0]
  const sectorBit = topSector && topSector.value !== 'unknown'
    ? `sector looks like ${topSector.value} (${Math.round(topSector.confidence * 100)}% confidence)`
    : ''

  // 1. reject_spam: very low signal + no description
  if (completeness.score < 40 && !has_business_description) {
    return {
      recommendation: 'reject_spam',
      recommendation_reason: joinReason([
        `completeness ${completeness.score} of 100`,
        'no business description',
        completeness.missing.length > 0 ? `missing ${completeness.missing.join('/')}` : '',
      ]),
    }
  }

  // 2. dupes always force a human look
  if (dupes.length > 0) {
    const onPhone = dupes.filter((d) => d.match_on === 'phone_last9').length
    const onEmail = dupes.filter((d) => d.match_on === 'email').length
    const bits: string[] = []
    if (onPhone > 0) bits.push(`${onPhone} phone match${onPhone === 1 ? '' : 'es'}`)
    if (onEmail > 0) bits.push(`${onEmail} email match${onEmail === 1 ? '' : 'es'}`)
    return {
      recommendation: 'review',
      recommendation_reason: joinReason([
        `duplicate candidate found: ${bits.join(' and ')}`,
        `completeness ${completeness.score} of 100`,
        sectorBit,
      ]),
    }
  }

  // 3. info_request: missing a critical contact channel
  if (!has_phone || !has_email) {
    const missing: string[] = []
    if (!has_phone) missing.push('phone')
    if (!has_email) missing.push('email')
    return {
      recommendation: 'info_request',
      recommendation_reason: joinReason([
        `missing ${missing.join(' and ')}`,
        `completeness ${completeness.score} of 100`,
      ]),
    }
  }

  // 4. approve: high completeness, no dupe
  if (completeness.score >= 80) {
    return {
      recommendation: 'approve',
      recommendation_reason: joinReason([
        `completeness ${completeness.score} of 100`,
        'no duplicate match',
        sectorBit,
      ]),
    }
  }

  // 5. default: human review
  return {
    recommendation: 'review',
    recommendation_reason: joinReason([
      `completeness ${completeness.score} of 100`,
      completeness.missing.length > 0 ? `missing ${completeness.missing.join('/')}` : '',
      sectorBit,
    ]),
  }
}
