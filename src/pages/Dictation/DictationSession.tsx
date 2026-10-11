import type { DictationAnswer, DictationTaskConfig } from './types'
import { getDictationPhonetic, getDictationPronunciationText } from './types'
import usePronunciationSound from '@/hooks/usePronunciation'
import type { Word } from '@/typings'
import { getDictionaryChapterName } from '@/utils/dictionaryChapter'
import type { FormEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

type DictationSessionProps = {
  config: DictationTaskConfig
  words: Word[]
  onCancel: () => void
  onComplete: (answers: DictationAnswer[]) => void
}

export default function DictationSession({ config, words, onCancel, onComplete }: DictationSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [inputs, setInputs] = useState<string[]>(() => words.map(() => ''))
  const inputRef = useRef<HTMLInputElement>(null)
  const currentWord = words[currentIndex]
  const input = inputs[currentIndex] ?? ''
  const pronunciationText = getDictationPronunciationText(currentWord, config.dictionary.language)
  const { play, stop, isPlaying } = usePronunciationSound(pronunciationText, false, config.pronunciationType)
  const playRef = useRef(play)
  const stopRef = useRef(stop)

  useEffect(() => {
    playRef.current = play
    stopRef.current = stop
  }, [play, stop])

  useEffect(() => {
    inputRef.current?.focus()
    const timer = window.setTimeout(() => playRef.current(), 80)

    return () => {
      window.clearTimeout(timer)
      stopRef.current()
    }
  }, [currentIndex])

  useHotkeys(
    'ctrl+j',
    () => {
      play()
    },
    { enableOnFormTags: true, preventDefault: true },
    [play],
  )

  const goToPreviousWord = useCallback(() => {
    setCurrentIndex((old) => Math.max(old - 1, 0))
  }, [])

  const goToNextWord = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((old) => old + 1)
      return
    }

    const nextAnswers: DictationAnswer[] = words.map((word, index) => {
      const normalizedInput = (inputs[index] ?? '').trim()
      return {
        word,
        input: normalizedInput,
        skipped: normalizedInput.length === 0,
      }
    })
    onComplete(nextAnswers)
  }, [currentIndex, inputs, onComplete, words])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    goToNextWord()
  }

  const phonetic = getDictationPhonetic(currentWord, config.pronunciationType)
  const progress = ((currentIndex + 1) / words.length) * 100

  return (
    <div className="w-full max-w-4xl rounded-3xl bg-white p-6 shadow-xl dark:bg-gray-800 sm:p-8">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>
          {config.dictionary.name} · {getDictionaryChapterName(config.dictionary, config.chapter)}
        </span>
        <button type="button" className="min-h-11 touch-manipulation rounded-lg px-3 hover:text-indigo-500" onClick={onCancel}>
          返回任务设置
        </button>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-indigo-100 dark:bg-slate-700">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-3 text-center text-sm font-medium text-indigo-500">
        第 {currentIndex + 1} / {words.length} 题
      </p>

      <div className="flex min-h-72 flex-col items-center justify-center py-8 sm:min-h-96 sm:py-10">
        <button
          type="button"
          onClick={() => play()}
          className="min-h-[3.25rem] touch-manipulation rounded-full bg-indigo-50 px-6 py-3 font-medium text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
        >
          {isPlaying ? '正在播放…' : '重播发音（Ctrl + J）'}
        </button>

        {config.showPhonetic && phonetic && (
          <p className="mt-8 text-center font-mono text-3xl font-semibold tracking-wide text-slate-700 dark:text-slate-100 sm:text-4xl">
            [{phonetic}]
          </p>
        )}
        {config.showTranslation && (
          <p className="mt-7 max-w-3xl text-center text-2xl font-semibold leading-relaxed text-slate-800 dark:text-white sm:text-3xl sm:leading-relaxed">
            {currentWord.trans.join('；') || '暂无释义'}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => {
            const nextInput = event.target.value
            setInputs((old) => old.map((value, index) => (index === currentIndex ? nextInput : value)))
          }}
          autoComplete="off"
          spellCheck={false}
          aria-label="听写答案"
          placeholder="输入听到的单词；也可以留空进入下一题"
          className="h-14 w-full rounded-xl border-2 border-slate-200 bg-transparent px-5 text-center font-mono text-xl text-slate-800 outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:text-white"
        />
        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            disabled={currentIndex === 0}
            className="my-btn-primary min-h-[3.25rem] min-w-[8rem] touch-manipulation bg-slate-400 hover:bg-slate-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700"
            onClick={goToPreviousWord}
          >
            上一题
          </button>
          <button type="submit" className="my-btn-primary min-h-[3.25rem] min-w-[9rem] touch-manipulation">
            {currentIndex === words.length - 1 ? '完成听写' : '下一题'}
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">可以前后切换并修改答案；留空的题目会记为跳过，全部完成后统一判定。</p>
    </div>
  )
}
