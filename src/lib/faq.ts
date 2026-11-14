// FAQ content is authored as a static-page markdown document. Each level-2
// heading starts a question; everything until the next heading is its answer.

export type FaqItem = {
  question: string
  answer: string
}

export function parseFaqMarkdown(markdown: string): FaqItem[] {
  const items: FaqItem[] = []
  let question: string | null = null
  let answer: string[] = []

  function commit() {
    const body = answer.join('\n').trim()
    if (question && body) items.push({ question, answer: body })
  }

  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line)
    if (heading && !line.startsWith('###')) {
      commit()
      question = heading[1]
      answer = []
      continue
    }
    if (question) answer.push(line)
  }

  commit()
  return items
}
