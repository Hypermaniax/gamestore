// "How it works" section — three honest steps, no invented promises.

import { CreditCard, KeyRound, MousePointerClick } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    title: 'Choose an account',
    text: 'Compare rank, items, and account details. Every listing is unique.',
    Icon: MousePointerClick,
  },
  {
    number: '02',
    title: 'Pay securely',
    text: 'QRIS or virtual account, verified automatically before handover.',
    Icon: CreditCard,
  },
  {
    number: '03',
    title: 'Start playing',
    text: 'Reveal your private credentials and enjoy a 14-day warranty.',
    Icon: KeyRound,
  },
]

const INCLUDED = [
  ['14d', 'Warranty'],
  ['QRIS+', 'Payments'],
  ['Private', 'Credentials'],
]

export function HowItWorks() {
  return (
    <section
      id="how"
      className="relative mx-5 mb-20 overflow-hidden rounded-[2.75rem] bg-[#0d1417] text-white sm:mx-8 lg:mx-12 lg:mb-28"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[.16] [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_72%)]" />
        <div className="absolute -left-32 -top-40 size-[420px] rounded-full bg-brand/10 blur-[120px]" />
        <div className="absolute -bottom-48 right-0 size-[380px] rounded-full bg-brand/[.06] blur-[100px]" />
      </div>

      <div className="relative grid lg:grid-cols-[.92fr_1.08fr]">
        <div className="flex flex-col justify-between border-b border-white/10 p-8 sm:p-12 lg:border-b-0 lg:border-r lg:p-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.22em] text-white/60">
              <span className="size-1.5 rounded-full bg-brand" />
              How it works
            </p>

            <h2 className="mt-8 max-w-md font-display text-[clamp(2.8rem,5vw,4.8rem)] font-bold leading-[.88] tracking-[-.07em]">
              Three steps.
              <br />
              Zero <span className="text-brand">guesswork.</span>
            </h2>

            <p className="mt-6 max-w-md text-sm leading-6 text-white/50 sm:text-base">
              From the first click to your first match, every step is clear and protected. No
              hidden fees, no vague listings, no waiting in the dark.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-5">
            {INCLUDED.map(([value, label], index) => (
              <div key={label} className={index === 0 ? 'pr-4' : index === 1 ? 'px-4' : 'pl-4'}>
                <p className="font-display text-xl font-bold tracking-[-.04em] text-white sm:text-2xl">
                  {value}
                </p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-[.16em] text-white/35 sm:text-[10px]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-3">
          {STEPS.map(({ number, title, text, Icon }) => (
            <article
              key={number}
              className="group relative flex min-h-[300px] flex-col overflow-hidden border-b border-white/10 p-8 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] last:border-b-0 hover:bg-white/[.035] sm:min-h-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:p-9"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-3 -top-6 font-display text-[7rem] font-bold leading-none tracking-[-.1em] text-white/[.035] transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:text-brand/10"
              >
                {number}
              </span>

              <span className="relative grid size-11 place-items-center rounded-2xl bg-white/[.06] text-brand ring-1 ring-white/10 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:bg-brand group-hover:text-brand-ink">
                <Icon className="size-5" strokeWidth={1.6} />
              </span>

              <div className="relative mt-auto pt-20">
                <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[.2em] text-white/30">
                  Step / {number}
                </p>
                <h3 className="font-display text-lg font-bold tracking-[-.03em] sm:text-xl">
                  {title}
                </h3>
                <p className="mt-3 text-xs leading-5 text-white/45">{text}</p>
              </div>

              <span className="absolute inset-x-8 bottom-0 h-px origin-left scale-x-0 bg-brand transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-x-100" />
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
