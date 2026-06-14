import type { ChatMessage, OrderRec, Priorities, Product, ProductDetails, ProductionRec, SSEEvent } from '../types'

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`

export async function fetchPriorities(): Promise<Priorities> {
  const r = await fetch(`${BASE}/priorities`)
  if (!r.ok) throw new Error('Failed to fetch priorities')
  return r.json()
}

export async function fetchProducts(): Promise<Product[]> {
  const r = await fetch(`${BASE}/products`)
  if (!r.ok) throw new Error('Failed to fetch products')
  return r.json()
}

export async function fetchProductDetails(productId: string, signal?: AbortSignal): Promise<ProductDetails> {
  const r = await fetch(`${BASE}/product/${productId}/details`, { signal })
  if (!r.ok) throw new Error('Failed to fetch product details')
  return r.json()
}

export async function fetchOrderRecommendations(sortBy?: string, signal?: AbortSignal): Promise<OrderRec[]> {
  const url = sortBy ? `${BASE}/order/recommendations?sort_by=${sortBy}` : `${BASE}/order/recommendations`
  const r = await fetch(url, { signal })
  if (!r.ok) throw new Error('Failed to fetch order recommendations')
  return r.json()
}

export async function fetchProductionRecommendations(params?: { time_window?: string; product_id?: string }): Promise<ProductionRec[]> {
  const qs = new URLSearchParams(params as Record<string, string>).toString()
  const r = await fetch(`${BASE}/production/recommendations${qs ? `?${qs}` : ''}`)
  if (!r.ok) throw new Error('Failed to fetch production recommendations')
  return r.json()
}

export async function* streamChat(messages: ChatMessage[]): AsyncGenerator<SSEEvent> {
  const resp = await fetch(`${BASE}/copilot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  if (!resp.ok) throw new Error('Chat request failed')

  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop()!
    for (const part of parts) {
      if (part.startsWith('data: ')) {
        yield JSON.parse(part.slice(6)) as SSEEvent
      }
    }
    if (done) break
  }
}
