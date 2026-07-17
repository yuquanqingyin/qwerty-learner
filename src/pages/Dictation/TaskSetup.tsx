import type { DictationOrder, DictationTaskConfig } from './types'
import { LANG_PRON_MAP } from '@/resources/soundResource'
import type { Dictionary, Word } from '@/typings'
import { getDictionaryChapterName } from '@/utils/dictionaryChapter'
import range from '@/utils/range'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import IconCheck from '~icons/tabler/check'
import IconSearch from '~icons/tabler/search'
import IconX from '~icons/tabler/x'

type TaskSetupProps = {
  dictionaries: Dictionary[]
  dictionary: Dictionary
  chapter: number
  chapterWords: Word[]
  isLoading: boolean
  error?: Error
  onDictionaryChange: (dictionaryID: string) => void
  onChapterChange: (chapter: number) => void
  onStart: (config: DictationTaskConfig) => void
}

const touchButtonClassName =
  'min-h-[3rem] touch-manipulation rounded-xl border px-4 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200'

export default function TaskSetup({
  dictionaries,
  dictionary,
  chapter,
  chapterWords,
  isLoading,
  error,
  onDictionaryChange,
  onChapterChange,
  onStart,
}: TaskSetupProps) {
  const [order, setOrder] = useState<DictationOrder>('sequential')
  const [selectedWordIndexes, setSelectedWordIndexes] = useState<number[]>([])
  const [rangeStart, setRangeStart] = useState(1)
  const [rangeEnd, setRangeEnd] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPhonetic, setShowPhonetic] = useState(true)
  const [showTranslation, setShowTranslation] = useState(true)
  const wordListRef = useRef<HTMLDivElement>(null)
  const wordButtonRefs = useRef<Array<HTMLButtonElement | null>>([])
  const hasMultipleDictionaries = dictionaries.length > 1
  const stepOffset = hasMultipleDictionaries ? 1 : 0

  useEffect(() => {
    const allIndexes = chapterWords.map((_, index) => index)
    setSelectedWordIndexes(allIndexes)
    setRangeStart(1)
    setRangeEnd(Math.max(chapterWords.length, 1))
    setSearchTerm('')
  }, [chapter, chapterWords])

  const selectedWordIndexSet = useMemo(() => new Set(selectedWordIndexes), [selectedWordIndexes])
  const searchKeyword = searchTerm.trim().toLocaleLowerCase()
  const matchedWordIndex = useMemo(() => {
    if (!searchKeyword) return null

    const exactMatchIndex = chapterWords.findIndex((word) => word.name.toLocaleLowerCase() === searchKeyword)
    if (exactMatchIndex >= 0) return exactMatchIndex

    const partialMatchIndex = chapterWords.findIndex((word) => {
      const searchableText = `${word.name} ${word.trans.join(' ')}`.toLocaleLowerCase()
      return searchableText.includes(searchKeyword)
    })
    return partialMatchIndex >= 0 ? partialMatchIndex : null
  }, [chapterWords, searchKeyword])

  useEffect(() => {
    if (matchedWordIndex === null || isLoading) return

    const animationFrame = window.requestAnimationFrame(() => {
      const list = wordListRef.current
      const target = wordButtonRefs.current[matchedWordIndex]
      if (!list || !target) return

      const listRect = list.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const centeredTop = list.scrollTop + targetRect.top - listRect.top - (list.clientHeight - target.clientHeight) / 2
      list.scrollTo({ top: Math.max(centeredTop, 0), behavior: 'smooth' })
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [isLoading, matchedWordIndex, searchKeyword])

  const pronunciationType = useMemo(() => {
    const languageConfig = LANG_PRON_MAP[dictionary.language]
    const index = dictionary.defaultPronIndex ?? languageConfig.defaultPronIndex
    return (languageConfig.pronunciation[index] ?? languageConfig.pronunciation[0]).pron
  }, [dictionary])

  const toggleWord = (index: number) => {
    setSelectedWordIndexes((old) => (old.includes(index) ? old.filter((item) => item !== index) : [...old, index].sort((a, b) => a - b)))
  }

  const selectAllWords = () => {
    setSelectedWordIndexes(chapterWords.map((_, index) => index))
  }

  const selectRange = () => {
    const first = Math.max(1, Math.min(rangeStart, rangeEnd))
    const last = Math.min(chapterWords.length, Math.max(rangeStart, rangeEnd))
    setRangeStart(first)
    setRangeEnd(last)
    setSelectedWordIndexes(range(first - 1, last, 1))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (selectedWordIndexes.length === 0) return

    onStart({
      dictionary,
      chapter,
      wordIndexes: selectedWordIndexes,
      order,
      showPhonetic,
      showTranslation,
      pronunciationType,
    })
  }

  return (
    <form className="w-full max-w-6xl rounded-3xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:p-8" onSubmit={handleSubmit}>
      <div className="mb-7">
        <p className="text-sm font-medium text-indigo-500">DICTATION TASK</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">创建听写任务</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
          选择单元和要听写的单词。答题过程中不会公布对错，全部完成后统一查看答案。
        </p>
      </div>

      {hasMultipleDictionaries ? (
        <fieldset>
          <legend className="text-base font-semibold text-slate-800 dark:text-white">1. 选择单词本</legend>
          <div className="mt-3 max-h-52 overflow-y-auto overscroll-contain rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dictionaries.map((item) => {
                const selected = item.id === dictionary.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    className={`min-h-[4.5rem] touch-manipulation rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 ${
                      selected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                        : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800'
                    }`}
                    onClick={() => onDictionaryChange(item.id)}
                  >
                    <span className="block font-semibold text-slate-800 dark:text-white">{item.name}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      {item.description} · {item.length} 词
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </fieldset>
      ) : (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
          <p className="text-xs font-semibold tracking-wider text-indigo-500">当前测试词书</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{dictionary.description}</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">共 {dictionary.length} 词</span>
          </div>
        </section>
      )}

      <fieldset className="mt-7">
        <legend className="text-base font-semibold text-slate-800 dark:text-white">{1 + stepOffset}. 选择单元</legend>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">点击单元按钮切换，列表可上下滑动。</p>
        <div className="mt-3 max-h-48 overflow-y-auto overscroll-contain rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8">
            {range(0, dictionary.chapterCount, 1).map((index) => {
              const selected = index === chapter
              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={selected}
                  className={`${touchButtonClassName} ${
                    selected
                      ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                  onClick={() => onChapterChange(index)}
                >
                  {getDictionaryChapterName(dictionary, index)}
                </button>
              )
            })}
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <legend className="text-base font-semibold text-slate-800 dark:text-white">{2 + stepOffset}. 选择听写单词</legend>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              已选择 <span className="font-semibold text-indigo-600 dark:text-indigo-300">{selectedWordIndexes.length}</span> /{' '}
              {chapterWords.length} 个
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${touchButtonClassName} border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300`}
              onClick={selectAllWords}
            >
              全部选择
            </button>
            <button
              type="button"
              className={`${touchButtonClassName} border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200`}
              onClick={() => setSelectedWordIndexes([])}
            >
              清空选择
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">快速选择连续部分</span>
          <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            从第
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(chapterWords.length, 1)}
              value={rangeStart}
              onChange={(event) => setRangeStart(Number(event.target.value))}
              className="h-12 w-20 rounded-xl border border-slate-200 bg-white px-3 text-center text-base text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            到第
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={Math.max(chapterWords.length, 1)}
              value={rangeEnd}
              onChange={(event) => setRangeEnd(Number(event.target.value))}
              className="h-12 w-20 rounded-xl border border-slate-200 bg-white px-3 text-center text-base text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <button
            type="button"
            className={`${touchButtonClassName} border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600`}
            disabled={chapterWords.length === 0}
            onClick={selectRange}
          >
            选择该区间
          </button>
        </div>

        <div className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
          <label htmlFor="dictation-word-search" className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300">
            搜索本单元单词
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="dictation-word-search"
                type="search"
                value={searchTerm}
                placeholder="输入英文单词或中文释义"
                autoComplete="off"
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault()
                }}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white py-2 pl-12 pr-12 text-base text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-indigo-950"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="清除搜索"
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 touch-manipulation items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 dark:hover:bg-slate-700 dark:hover:text-white"
                  onClick={() => setSearchTerm('')}
                >
                  <IconX className="h-5 w-5" />
                </button>
              )}
            </div>
            <span className="min-w-24 text-sm text-slate-500 dark:text-slate-400">
              {searchKeyword
                ? matchedWordIndex === null
                  ? '未找到匹配单词'
                  : `已定位到第 ${matchedWordIndex + 1} 个`
                : `共 ${chapterWords.length} 个`}
            </span>
          </div>
        </div>

        <div
          ref={wordListRef}
          className="mt-3 max-h-80 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
        >
          {isLoading && <p className="py-10 text-center text-sm text-slate-500">正在加载本单元单词…</p>}
          {error && <p className="py-10 text-center text-sm text-rose-500">词书加载失败，请刷新后重试。</p>}
          {!isLoading && !error && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {chapterWords.map((word, index) => {
                const selected = selectedWordIndexSet.has(index)
                const isSearchMatch = index === matchedWordIndex
                return (
                  <button
                    key={`${word.name}-${index}`}
                    ref={(element) => {
                      wordButtonRefs.current[index] = element
                    }}
                    type="button"
                    aria-pressed={selected}
                    aria-current={isSearchMatch ? 'true' : undefined}
                    onClick={() => toggleWord(index)}
                    className={`flex min-h-[4.5rem] touch-manipulation items-center gap-3 rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 ${
                      selected
                        ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/60'
                        : 'border-slate-200 bg-white opacity-65 dark:border-slate-700 dark:bg-slate-900'
                    } ${isSearchMatch ? 'ring-4 ring-amber-300 dark:ring-amber-500' : ''}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                        selected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {selected ? <IconCheck className="h-5 w-5" /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-base font-semibold text-slate-800 dark:text-white">{word.name}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
                        {word.trans.join('；') || '暂无释义'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="text-base font-semibold text-slate-800 dark:text-white">{3 + stepOffset}. 设置听写方式</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ['sequential', '按词书顺序'],
              ['random', '随机顺序'],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`${touchButtonClassName} flex cursor-pointer items-center justify-center ${
                order === value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name="order"
                value={value}
                checked={order === value}
                onChange={() => setOrder(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900 sm:grid-cols-2">
        <TouchCheckbox checked={showPhonetic} label="听写时显示音标" onChange={setShowPhonetic} />
        <TouchCheckbox checked={showTranslation} label="听写时显示中文释义" onChange={setShowTranslation} />
      </div>

      <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {!isLoading && !error && selectedWordIndexes.length > 0 && `本次将听写 ${selectedWordIndexes.length} 个单词`}
          {!isLoading && !error && selectedWordIndexes.length === 0 && '请至少选择一个单词'}
        </div>
        <button
          type="submit"
          disabled={isLoading || !!error || selectedWordIndexes.length === 0}
          className="my-btn-primary min-h-[3.25rem] min-w-[10rem] touch-manipulation text-base disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          创建并开始
        </button>
      </div>
    </form>
  )
}

function TouchCheckbox({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label
      className={`flex min-h-[3.25rem] cursor-pointer touch-manipulation items-center gap-3 rounded-xl border px-4 text-sm font-medium transition ${
        checked
          ? 'border-indigo-300 bg-white text-indigo-600 dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-300'
          : 'border-transparent text-slate-600 dark:text-slate-300'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
      />
      {label}
    </label>
  )
}
