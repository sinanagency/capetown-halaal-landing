/**
 * Unified z-index scale for the admin + exhibitor portals.
 *
 * Before this file existed, every overlay picked its own `z-NN` value. The
 * result: CommandK on z-100, drawers + modals colliding on z-50, the sidebar
 * mobile drawer also on z-50, ChaseComposer on z-50. Stacking order was a
 * guessing game during QA, and a routine "add a new modal" task could leave
 * one overlay visually below another with no obvious cause.
 *
 * Rule of thumb:
 *   - TOAST       : transient notifications (sit above the rest of the page)
 *   - DROPDOWN    : in-flow popovers anchored to a button (BulkToolbar menus)
 *   - DRAWER      : side-sliding drawers (DedupeDrawer, sticky section nav)
 *   - MODAL       : centred dialogs (WelcomeModal, ShortcutsOverlay, mobile sidebar)
 *   - OVERLAY     : full-screen blocking layers above modals (rare)
 *   - COMMAND_PALETTE : the global cmd+K palette, always on top.
 *
 * Tailwind cannot read TS at build time, so the constants below are the source
 * of truth. Components either:
 *   (a) reference the constants in inline `style={{ zIndex: Z_MODAL }}` (typed,
 *       no class-purging concerns), or
 *   (b) use the arbitrary-value class (e.g. `z-[50]`) — kept in sync with the
 *       constants below. If you change a number here, grep for the matching
 *       Tailwind class and update both. The scale is intentionally sparse so
 *       the search is cheap.
 */

export const Z_TOAST = 10
export const Z_DROPDOWN = 20
export const Z_DRAWER = 40
export const Z_MODAL = 50
export const Z_OVERLAY = 60
export const Z_COMMAND_PALETTE = 100

/**
 * Tailwind arbitrary-value strings. Use these in `className` when an inline
 * style is awkward (e.g. when the value also drives a `sticky` position class
 * that Tailwind handles in the same string).
 */
export const Z_CLASS = {
  toast: 'z-[10]',
  dropdown: 'z-[20]',
  drawer: 'z-[40]',
  modal: 'z-[50]',
  overlay: 'z-[60]',
  commandPalette: 'z-[100]',
} as const
