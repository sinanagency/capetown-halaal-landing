// Required document slots displayed in the Vendor Hub. Mirrors
// REQUIRED_DOC_TYPES in /api/admin/vendors/[id]/doc-action/route.ts.
//
// Keep these two in sync. Slot keys are the marker that flows into
// portal.docs[].type via the existing exhibitor upload flow.

export const REQUIRED_DOC_TYPES = [
  'halal_cert',
  'public_liability',
  'food_handler_cert',
  'id_document',
  'business_reg',
] as const

export type RequiredDocType = (typeof REQUIRED_DOC_TYPES)[number]

export const REQUIRED_DOC_LABELS: Record<RequiredDocType, string> = {
  halal_cert: 'Halal certificate',
  public_liability: 'Public liability cover',
  food_handler_cert: 'Food handler certificate',
  id_document: 'ID document',
  business_reg: 'Business registration',
}
