import type { Dictionary, PronunciationType, Word } from '@/typings'

export type DictationOrder = 'sequential' | 'random'

export type DictationTaskConfig = {
  dictionary: Dictionary
  chapter: number
  wordIndexes: number[]
  order: DictationOrder
  showPhonetic: boolean
  showTranslation: boolean
  pronunciationType: PronunciationType
}

export type DictationAnswer = {
  word: Word
  input: string
  skipped: boolean
}

export function getDictationPhonetic(word: Word, pronunciationType: PronunciationType) {
  if (pronunciationType === 'uk') return word.ukphone
  if (pronunciationType === 'us') return word.usphone
  return word.notation ?? ''
}

export function getDictationPronunciationText(word: Word, language: Dictionary['language']) {
  if (language !== 'hapin') return word.name

  if (/[\u0400-\u04FF]/.test(word.notation ?? '')) {
    return word.notation ?? word.name
  }

  return word.trans[2] ?? word.name
}

export function isDictationAnswerCorrect(answer: DictationAnswer) {
  if (answer.skipped) return false

  const normalize = (value: string) => value.trim().toLocaleLowerCase()
  return normalize(answer.input) === normalize(answer.word.name)
}
