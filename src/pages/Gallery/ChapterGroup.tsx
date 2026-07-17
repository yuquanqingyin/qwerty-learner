import ChapterButton from './ChapterButton'
import { currentChapterAtom, currentDictInfoAtom } from '@/store'
import { getDictionaryChapterRange } from '@/utils/dictionaryChapter'
import range from '@/utils/range'
import { useAtom, useAtomValue } from 'jotai'
import type React from 'react'

const ChapterGroup: React.FC<ChapterGroupProps> = () => {
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const dictionary = useAtomValue(currentDictInfoAtom)

  return (
    <main className="mr-4 grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {range(0, dictionary.chapterCount, 1).map((index) => {
        const { start, end } = getDictionaryChapterRange(dictionary, index)
        return (
          <ChapterButton
            wordCount={end - start}
            key={`${dictionary.id}-${index}`}
            selected={currentChapter === index}
            index={index}
            onClick={() => setCurrentChapter(index)}
          />
        )
      })}
    </main>
  )
}

export default ChapterGroup

export type ChapterGroupProps = {
  totalWords: number
}
