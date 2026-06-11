// CTH bot's BotGuardsConfig. This file is the SOURCE OF TRUTH for what the
// shared @sinanagency/bot-guards lib filters, classifies, and routes for
// THIS bot. The lib has zero knowledge of CTH; this config is what makes the
// lib behave like a CTH bot.
//
// Updating this file is the legitimate way to change CTH bot behavior at
// the lib boundary. DO NOT add bot-specific patterns to the lib itself.

import type { BotGuardsConfig } from '../bot-guards/index.js'

// Banned patterns for CTH outbound text. Anchored in CTH's eight laws.
const EM_DASH_OR_EN_DASH = /[—–]/                          // No-em-dashes law
const NETLIFY_MENTION = /\bnetlify\b/i                     // Deploy-target law (CTH is Vercel)
const NEGATIVE_URGENCY = /\b(?:limited time|act now|only \d+ left|hurry up)\b/i  // anti-manipulation

// Brand names that MUST NEVER appear in CTH bot output. Includes:
//  - Other Sinanagency bots (Sasa, Nisria, Jensen, Stephen)
//  - The historical 4Q-framework leak vocabulary
//  - Internal infra mentions
const FORBIDDEN_BRANDS = [
  'Sasa',
  'Nisria',
  'Jensen',
  'Stephen',
  '4Q framework',
  'Canada Made',
  'Sinan Agency',
  'sinanagency',
] as const

const INTENT_ENUM = [
  // CTH-specific intents — chosen by surveying admin-chat.ts + handover.ts
  'ticket_lookup',          // "where's my ticket?", "I bought 3 tickets"
  'vendor_status',          // "is my stall confirmed?", "what's my stall code?"
  'vendor_application_q',   // questions about the application process
  'event_info',             // "what time does the festival open?", "where is it?"
  'human_handover_request', // "talk to a human", "speak to someone"
  'opt_out',                // STOP keyword family
  'opt_in',                 // START / yes keyword family
  'admin_command',          // master-admin commands (handled by admin-chat.ts)
  'open_conversation',      // fallback — anything else, send to festival brain LLM
] as const

export const CTH_BOT_GUARDS_CONFIG: BotGuardsConfig = {
  botName: 'Cape Town Halaal Assistant',
  bannedPatterns: [EM_DASH_OR_EN_DASH, NETLIFY_MENTION, NEGATIVE_URGENCY],
  forbiddenBrands: [...FORBIDDEN_BRANDS],
  intentEnum: [...INTENT_ENUM],
  pendingKinds: ['vendor_clarifying', 'ticket_clarifying'],
  reaskPhrase: 'Can you share a bit more so I can help with that?',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
}
