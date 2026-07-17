export const EXPLICIT_SPACE = '␣'

export const CHAPTER_LENGTH = 20

/** Add another dictionary id here when a new textbook is ready for students. */
export const ENABLED_DICTIONARY_IDS = ['english-grade7-1-2022', 'english-grade7-2-2022'] as const
export const DEFAULT_DICTIONARY_ID = ENABLED_DICTIONARY_IDS[0]

export const DISMISS_START_CARD_DATE_KEY = 'dismissStartCardDate'

export const DONATE_DATE = 'donateDate'

export const CONFETTI_DEFAULTS = {
  colors: ['#5D8C7B', '#F2D091', '#F2A679', '#D9695F', '#8C4646'],
  shapes: ['square'],
  ticks: 500,
} as confetti.Options

export const defaultFontSizeConfig = {
  foreignFont: 48,
  translateFont: 18,
}
