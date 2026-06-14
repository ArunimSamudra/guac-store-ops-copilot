import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fetchProductDetails } from '../api/client'
import type { ProductDetails } from '../types'
import RiskBadge from './RiskBadge'
import ConfidenceBadge from './ConfidenceBadge'
import ReasonPill from './ReasonPill'

export default function ProductDetailPanel({ productId, onClose }: { productId: string; onClose: () => void }) {
  const [data, setData] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [overrideQty, setOverrideQty] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetchProductDetails(productId, controller.signal)
      .then(setData)
      .catch(err => { if (err.name !== 'AbortError') throw err })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [productId])

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 text-sm">{data?.product.name ?? '…'}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
        </div>
      ) : !data ? (
        <p className="p-4 text-red-500 text-sm">Failed to load.</p>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Badges */}
          {data.order_recommendation && (
            <div className="flex flex-wrap gap-2">
              <RiskBadge value={data.order_recommendation.stockout_risk} label="Stockout" />
              <RiskBadge value={data.order_recommendation.waste_risk} label="Waste" />
              <ConfidenceBadge value={data.order_recommendation.confidence} />
            </div>
          )}

          {/* Recommendation */}
          {data.order_recommendation && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-gray-500">Recommended:</span> <strong>{data.order_recommendation.recommended_order_cases} cases</strong></p>
              <p><span className="text-gray-500">Forecasted demand:</span> {data.order_recommendation.forecasted_demand} units</p>
              <p><span className="text-gray-500">Yesterday:</span> {data.order_recommendation.yesterday_recommended_cases} cases
                {data.order_recommendation.delta_from_yesterday !== 0 && (
                  <span className={data.order_recommendation.delta_from_yesterday > 0 ? 'text-green-600' : 'text-red-600'}>
                    {' '}({data.order_recommendation.delta_from_yesterday > 0 ? '+' : ''}{data.order_recommendation.delta_from_yesterday})
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {data.order_recommendation.reason_codes.map(c => <ReasonPill key={c} code={c} />)}
              </div>
              {data.order_recommendation.notes && (
                <p className="text-gray-500 text-xs pt-1">{data.order_recommendation.notes}</p>
              )}
            </div>
          )}

          {/* Inventory */}
          {data.inventory && (
            <div className="text-sm space-y-1">
              <p className="font-medium text-gray-700">Inventory</p>
              <p className="text-gray-500">Floor: {data.inventory.floor_stock} · Backroom: {data.inventory.backroom_stock} · Est. total: {data.inventory.current_stock_estimate}</p>
            </div>
          )}

          {/* Sales chart */}
          {data.sales_last_7_days.length > 0 && (
            <div>
              <p className="font-medium text-gray-700 text-sm mb-2">Last 7 days sales</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data.sales_last_7_days} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [v, 'Units sold']} labelFormatter={l => l} />
                  <Bar dataKey="units_sold" radius={[3, 3, 0, 0]}>
                    {data.sales_last_7_days.map((_, i) => (
                      <Cell key={i} fill={i === data.sales_last_7_days.length - 1 ? '#16a34a' : '#86efac'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Signals */}
          {data.signals.length > 0 && (
            <div>
              <p className="font-medium text-gray-700 text-sm mb-2">Active signals</p>
              <div className="space-y-2">
                {data.signals.map(s => (
                  <div key={s.id} className="text-xs bg-amber-50 border border-amber-200 rounded p-2">
                    <p className="font-medium text-amber-800">{s.title}</p>
                    <p className="text-amber-700 mt-0.5">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual override */}
          <div>
            <p className="font-medium text-gray-700 text-sm mb-2">Manual override</p>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Override qty (cases)"
                value={overrideQty}
                onChange={e => setOverrideQty(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <textarea
                placeholder="Reason for override…"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
              />
            </div>
          </div>

          {/* Ask copilot */}
          <button
            onClick={() => navigate('/copilot', { state: { prefill: `Why did the recommendation for ${data.product.name} change?` } })}
            className="w-full text-sm text-green-700 border border-green-300 rounded py-2 hover:bg-green-50 transition-colors"
          >
            Ask copilot about this item →
          </button>
        </div>
      )}
    </div>
  )
}
