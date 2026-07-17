import type { DictationAnswer, DictationTaskConfig } from './types'
import { getDictationPhonetic, isDictationAnswerCorrect } from './types'
import { getDictionaryChapterName } from '@/utils/dictionaryChapter'
import { useMemo } from 'react'

type DictationResultProps = {
  config: DictationTaskConfig
  answers: DictationAnswer[]
  onRetry: () => void
  onCreateAnother: () => void
  onBackHome: () => void
}

export default function DictationResult({ config, answers, onRetry, onCreateAnother, onBackHome }: DictationResultProps) {
  const stats = useMemo(() => {
    const correct = answers.filter(isDictationAnswerCorrect).length
    const skipped = answers.filter((answer) => answer.skipped).length
    return { correct, skipped, wrong: answers.length - correct - skipped }
  }, [answers])

  return (
    <div className="w-full max-w-6xl rounded-3xl bg-white p-8 shadow-xl dark:bg-gray-800">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-500">DICTATION RESULT</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">听写完成</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {config.dictionary.name} · {getDictionaryChapterName(config.dictionary, config.chapter)} · {answers.length} 题
          </p>
        </div>
        <div className="flex gap-3 text-center">
          <ResultStat label="正确" value={stats.correct} className="text-emerald-500" />
          <ResultStat label="错误" value={stats.wrong} className="text-rose-500" />
          <ResultStat label="跳过" value={stats.skipped} className="text-amber-500" />
        </div>
      </div>

      <div className="mt-8 max-h-[55vh] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3">题号</th>
              <th className="px-4 py-3">结果</th>
              <th className="px-4 py-3">你的答案</th>
              <th className="px-4 py-3">正确答案</th>
              {config.showPhonetic && <th className="px-4 py-3">音标</th>}
              {config.showTranslation && <th className="px-4 py-3">中文释义</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {answers.map((answer, index) => {
              const correct = isDictationAnswerCorrect(answer)
              return (
                <tr key={`${answer.word.name}-${index}`} className="text-slate-700 dark:text-slate-200">
                  <td className="px-4 py-4">{index + 1}</td>
                  <td
                    className={`px-4 py-4 font-medium ${
                      correct ? 'text-emerald-500' : answer.skipped ? 'text-amber-500' : 'text-rose-500'
                    }`}
                  >
                    {correct ? '正确' : answer.skipped ? '跳过' : '错误'}
                  </td>
                  <td className="px-4 py-4 font-mono">{answer.input || '—'}</td>
                  <td className="px-4 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-300">{answer.word.name}</td>
                  {config.showPhonetic && (
                    <td className="px-4 py-4">{getDictationPhonetic(answer.word, config.pronunciationType) || '—'}</td>
                  )}
                  {config.showTranslation && <td className="max-w-md px-4 py-4">{answer.word.trans.join('；') || '—'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          className="my-btn-primary min-h-[3.25rem] touch-manipulation bg-slate-400 hover:bg-slate-500"
          onClick={onBackHome}
        >
          返回主页
        </button>
        <button
          type="button"
          className="my-btn-primary min-h-[3.25rem] touch-manipulation bg-indigo-400 hover:bg-indigo-500"
          onClick={onCreateAnother}
        >
          重新创建任务
        </button>
        <button type="button" className="my-btn-primary min-h-[3.25rem] touch-manipulation" onClick={onRetry}>
          使用相同设置再听一次
        </button>
      </div>
    </div>
  )
}

function ResultStat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="min-w-20 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
      <div className={`text-2xl font-bold ${className}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  )
}
