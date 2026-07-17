import { CHAPTER_LENGTH } from '@/constants'
import type { Dictionary } from '@/typings'

export function getDictionaryChapterRange(dictionary: Dictionary, chapterIndex: number): { start: number; end: number } {
  const chapter = dictionary.chapters?.[chapterIndex]
  if (chapter) {
    return {
      start: Math.max(0, chapter.start),
      end: Math.min(dictionary.length, chapter.end),
    }
  }

  return {
    start: chapterIndex * CHAPTER_LENGTH,
    end: Math.min(dictionary.length, (chapterIndex + 1) * CHAPTER_LENGTH),
  }
}

export function getDictionaryChapterName(dictionary: Dictionary, chapterIndex: number): string {
  return dictionary.chapters?.[chapterIndex]?.name ?? `单元 ${chapterIndex + 1}`
}
