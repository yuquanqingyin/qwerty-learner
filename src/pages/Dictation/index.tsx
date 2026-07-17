import DictationResult from './DictationResult'
import DictationSession from './DictationSession'
import TaskSetup from './TaskSetup'
import type { DictationAnswer, DictationTaskConfig } from './types'
import Layout from '@/components/Layout'
import { DEFAULT_DICTIONARY_ID } from '@/constants'
import { dictionaries, idDictionaryMap } from '@/resources/dictionary'
import { currentChapterAtom } from '@/store'
import type { Word } from '@/typings'
import { getDictionaryChapterRange } from '@/utils/dictionaryChapter'
import shuffle from '@/utils/shuffle'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import IconArrowLeft from '~icons/tabler/arrow-left'

type Phase = 'setup' | 'session' | 'result'

export default function DictationPage() {
  const currentChapter = useAtomValue(currentChapterAtom)
  const [selectedDictionaryID, setSelectedDictionaryID] = useState<string>(DEFAULT_DICTIONARY_ID)
  const [selectedChapter, setSelectedChapter] = useState(Math.max(currentChapter, 0))
  const [phase, setPhase] = useState<Phase>('setup')
  const [config, setConfig] = useState<DictationTaskConfig | null>(null)
  const [taskWords, setTaskWords] = useState<Word[]>([])
  const [answers, setAnswers] = useState<DictationAnswer[]>([])
  const navigate = useNavigate()

  const dictionary = idDictionaryMap[selectedDictionaryID] ?? idDictionaryMap[DEFAULT_DICTIONARY_ID]
  const { data: wordList, error, isLoading } = useSWR(dictionary.url, wordListFetcher)

  useEffect(() => {
    if (selectedChapter >= dictionary.chapterCount) {
      setSelectedChapter(0)
    }
  }, [dictionary.chapterCount, selectedChapter])

  const chapterWords = useMemo(() => {
    if (!wordList) return []

    const { start, end } = getDictionaryChapterRange(dictionary, selectedChapter)
    return wordList.slice(start, end).map((word) => ({
      ...word,
      trans: Array.isArray(word.trans) ? word.trans.filter((item) => typeof item === 'string') : [],
    }))
  }, [dictionary, selectedChapter, wordList])

  const startTask = useCallback(
    (nextConfig: DictationTaskConfig) => {
      const selectedWords = nextConfig.wordIndexes.map((index) => chapterWords[index]).filter((word): word is Word => !!word)
      const orderedWords = nextConfig.order === 'random' ? shuffle([...selectedWords]) : selectedWords
      setConfig(nextConfig)
      setTaskWords(orderedWords)
      setAnswers([])
      setPhase('session')
    },
    [chapterWords],
  )

  const handleComplete = useCallback((nextAnswers: DictationAnswer[]) => {
    setAnswers(nextAnswers)
    setPhase('result')
  }, [])

  const handleDictionaryChange = useCallback((dictionaryID: string) => {
    setSelectedDictionaryID(dictionaryID)
    setSelectedChapter(0)
  }, [])

  const retryTask = useCallback(() => {
    if (config) startTask(config)
  }, [config, startTask])

  return (
    <Layout>
      <div className="relative flex w-full flex-1 items-start justify-center overflow-y-auto px-4 pb-12 pt-20 sm:px-6 sm:py-20">
        <button
          type="button"
          aria-label="返回首页"
          className="fixed left-3 top-3 z-20 flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-full bg-white/95 px-4 font-medium text-slate-600 shadow-sm transition hover:text-indigo-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 dark:bg-slate-800/95 dark:text-slate-200 sm:left-8 sm:top-6"
          onClick={() => navigate('/')}
        >
          <IconArrowLeft className="h-5 w-5" />
          返回首页
        </button>

        {phase === 'setup' && (
          <TaskSetup
            dictionaries={dictionaries}
            dictionary={dictionary}
            chapter={selectedChapter}
            chapterWords={chapterWords}
            isLoading={isLoading}
            error={error}
            onDictionaryChange={handleDictionaryChange}
            onChapterChange={setSelectedChapter}
            onStart={startTask}
          />
        )}

        {phase === 'session' && config && taskWords.length > 0 && (
          <DictationSession config={config} words={taskWords} onCancel={() => setPhase('setup')} onComplete={handleComplete} />
        )}

        {phase === 'result' && config && (
          <DictationResult
            config={config}
            answers={answers}
            onRetry={retryTask}
            onCreateAnother={() => setPhase('setup')}
            onBackHome={() => navigate('/')}
          />
        )}
      </div>
    </Layout>
  )
}
