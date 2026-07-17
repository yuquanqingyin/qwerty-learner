import Layout from '@/components/Layout'
import { NavLink } from 'react-router-dom'
import IconArrowRight from '~icons/tabler/arrow-right'
import IconHeadphones from '~icons/tabler/headphones'
import IconKeyboard from '~icons/tabler/keyboard'

const entryCards = [
  {
    to: '/dictation',
    title: '创建听写任务',
    description: '选择单元和单词，完成整组听写后统一查看答案。',
    action: '开始创建',
    icon: IconHeadphones,
    iconClassName: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
    cardClassName: 'hover:border-indigo-300 hover:shadow-indigo-100 dark:hover:border-indigo-700 dark:hover:shadow-none',
  },
  {
    to: '/practice',
    title: '个人练习',
    description: '按照自己的节奏进行跟打练习，逐个学习单词、音标和释义。',
    action: '进入个人练习',
    icon: IconKeyboard,
    iconClassName: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
    cardClassName: 'hover:border-emerald-300 hover:shadow-emerald-100 dark:hover:border-emerald-700 dark:hover:shadow-none',
  },
] as const

export default function HomePage() {
  return (
    <Layout>
      <section className="flex w-full flex-1 items-start justify-center overflow-y-auto px-5 py-12 sm:px-8 md:items-center">
        <div className="w-full max-w-5xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold tracking-[0.24em] text-indigo-500">ENGLISH LISTENING &amp; DICTATION</p>
            <h1 className="mt-4 text-3xl font-bold text-slate-800 dark:text-white sm:text-4xl">英语听力听写练习</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500 dark:text-slate-400">
              请选择今天要进行的练习。听写任务和个人练习均可使用七年级英语上、下册词书。
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {entryCards.map((entry) => {
              const EntryIcon = entry.icon

              return (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  className={`group flex min-h-[15rem] touch-manipulation flex-col rounded-3xl border-2 border-slate-100 bg-white p-7 shadow-lg shadow-slate-100 transition duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none ${entry.cardClassName}`}
                >
                  <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${entry.iconClassName}`}>
                    <EntryIcon className="h-7 w-7" />
                  </span>
                  <h2 className="mt-6 text-2xl font-bold text-slate-800 dark:text-white">{entry.title}</h2>
                  <p className="mt-3 flex-1 text-base leading-7 text-slate-500 dark:text-slate-400">{entry.description}</p>
                  <span className="mt-6 flex min-h-[3rem] items-center gap-2 text-base font-semibold text-indigo-600 dark:text-indigo-300">
                    {entry.action}
                    <IconArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </NavLink>
              )
            })}
          </div>
        </div>
      </section>
    </Layout>
  )
}
