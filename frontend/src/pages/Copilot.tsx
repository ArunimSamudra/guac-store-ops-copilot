import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamChat } from '../api/client'
import type { ChatMessage, ToolCallRecord } from '../types'

const SUGGESTED = [
  "What should I focus on before the 11am deadline?",
  "Can I produce the full quantity of pulled pork sandwiches?",
  "Should I still order the rotisserie chicken even with the promo ending?",
  "Why is sourdough flagged for urgent ordering?",
]

interface AssistantMessage {
  role: 'assistant'
  content: string
  toolCalls: ToolCallRecord[]
}

interface UserMessage {
  role: 'user'
  content: string
}

type DisplayMessage = UserMessage | AssistantMessage

function ToolCallTrace({ calls }: { calls: ToolCallRecord[] }) {
  const [open, setOpen] = useState(false)
  if (!calls.length) return null
  return (
    <div className="mt-2 text-xs border border-gray-200 rounded overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors text-left"
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>Tools used ({calls.length} call{calls.length !== 1 ? 's' : ''})</span>
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {calls.map((c, i) => (
            <div key={i} className="px-3 py-2">
              <p className="font-mono font-medium text-gray-700">{c.tool_name}</p>
              {Object.keys(c.args).length > 0 && (
                <p className="text-gray-400 mt-0.5">args: {JSON.stringify(c.args)}</p>
              )}
              <p className="text-gray-400 mt-0.5 truncate">→ {JSON.stringify(c.result).slice(0, 120)}…</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActiveTools({ tools }: { tools: { name: string; done: boolean }[] }) {
  if (!tools.length) return null
  return (
    <div className="flex flex-col gap-1 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-500 w-fit">
      {tools.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          {t.done
            ? <span className="text-green-500">✓</span>
            : <span className="animate-spin inline-block">⟳</span>}
          <span className="font-mono">{t.name}</span>
        </div>
      ))}
    </div>
  )
}

export default function Copilot() {
  const location = useLocation()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [apiMessages, setApiMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolStream, setToolStream] = useState<{ name: string; done: boolean }[]>([])
  const [displayedText, setDisplayedText] = useState('')
  const streamBufferRef = useRef('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isStreaming) return
    let rafId: number
    const tick = () => {
      setDisplayedText(prev => {
        const target = streamBufferRef.current
        if (prev.length >= target.length) return prev
        return target.slice(0, Math.min(prev.length + 8, target.length))
      })
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isStreaming])

  // Accept prefill from navigation state
  useEffect(() => {
    if (location.state?.prefill) {
      setInput(location.state.prefill)
    }
  }, [location.state])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolStream])

  async function submit(text: string) {
    if (!text.trim() || isStreaming) return

    const userMsg: ChatMessage = { role: 'user', content: text.trim() }
    const newApiMessages = [...apiMessages, userMsg]

    setMessages(prev => [...prev, { role: 'user', content: text.trim() }])
    setApiMessages(newApiMessages)
    setInput('')
    setIsStreaming(true)
    setToolStream([])
    streamBufferRef.current = ''
    setDisplayedText('')

    try {
      let finalResponse = ''
      let finalToolCalls: ToolCallRecord[] = []

      for await (const event of streamChat(newApiMessages)) {
        if (event.type === 'tool_start') {
          setToolStream(prev => [...prev, { name: event.tool_name, done: false }])
        } else if (event.type === 'tool_done') {
          setToolStream(prev => prev.map(t => t.name === event.tool_name ? { ...t, done: true } : t))
        } else if (event.type === 'text_delta') {
          finalResponse += event.text
          streamBufferRef.current += event.text
        } else if (event.type === 'done') {
          finalToolCalls = event.tool_calls_made
        }
      }

      const assistantApiMsg: ChatMessage = { role: 'assistant', content: finalResponse }
      setApiMessages(prev => [...prev, assistantApiMsg])
      setMessages(prev => [...prev, { role: 'assistant', content: finalResponse, toolCalls: finalToolCalls }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', toolCalls: [] }])
    } finally {
      setIsStreaming(false)
      setToolStream([])
      streamBufferRef.current = ''
      setDisplayedText('')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <h1 className="text-xl font-bold text-gray-900 mb-4 shrink-0">Ops Copilot</h1>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🥑</p>
            <p className="text-sm">Ask me anything about today's store operations.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl ${m.role === 'user' ? 'bg-green-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm' : 'w-full'}`}>
              {m.role === 'user' ? (
                <p>{m.content}</p>
              ) : (
                <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="text-sm text-gray-800 prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-table:text-xs prose-td:py-1 prose-th:py-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                  <ToolCallTrace calls={(m as AssistantMessage).toolCalls} />
                </div>
              )}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 w-full max-w-2xl">
              <ActiveTools tools={toolStream} />
              {displayedText ? (
                <div className="text-sm text-gray-800 prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-table:text-xs prose-td:py-1 prose-th:py-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedText}</ReactMarkdown>
                  <span className="inline-block w-[2px] h-[1em] bg-gray-400 ml-0.5 align-middle animate-pulse rounded-sm" />
                </div>
              ) : (toolStream.length === 0 || toolStream.every(t => t.done)) && (
                <span className="text-sm text-gray-400">Thinking…</span>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested chips */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {SUGGESTED.map(q => (
            <button
              key={q}
              onClick={() => submit(q)}
              disabled={isStreaming}
              className="text-xs border border-gray-300 rounded-full px-3 py-1.5 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); submit(input) }}
        className="flex gap-2 shrink-0"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isStreaming}
          placeholder="Ask about today's orders, production, or inventory…"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}
