import { useEffect, useState } from 'react'
import { fetchOrderRecommendations } from '../api/client'
import type { OrderRec } from '../types'
import RiskBadge from '../components/RiskBadge'
import ConfidenceBadge from '../components/ConfidenceBadge'
import ProductDetailPanel from '../components/ProductDetailPanel'

type SortKey = 'stockout_risk' | 'waste_risk' | 'delta_from_yesterday'

const SORT_LABELS: Record<SortKey, string> = {
  stockout_risk: 'Stockout Risk',
  waste_risk: 'Waste Risk',
  delta_from_yesterday: 'Δ vs Yesterday',
}

export default function Ordering() {
  const [recs, setRecs] = useState<OrderRec[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('stockout_risk')
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    fetchOrderRecommendations(sortBy, controller.signal)
      .then(setRecs)
      .catch(err => { if (err.name !== 'AbortError') throw err })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [sortBy])

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Order Recommendations</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Sort by:</span>
          {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
            <button
              key={k}
              onClick={() => setSortBy(k)}
              className={`px-3 py-1 rounded border text-xs font-medium transition-colors ${
                sortBy === k
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
            >
              {SORT_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Dept</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Rec. Cases</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">In Stock</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Forecast</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Stockout</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Waste</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Confidence</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Δ Yesterday</th>
              </tr>
            </thead>
            <tbody>
              {recs.map(r => (
                <tr
                  key={r.product_id}
                  onClick={() => setSelected(r.product_id)}
                  className={`border-b border-gray-100 cursor-pointer transition-colors ${
                    selected === r.product_id ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{r.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">{r.department}</td>
                  <td className="px-4 py-3 text-right font-mono">{r.recommended_order_cases}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-500">{r.current_stock ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{r.forecasted_demand}</td>
                  <td className="px-4 py-3 text-center"><RiskBadge value={r.stockout_risk} /></td>
                  <td className="px-4 py-3 text-center"><RiskBadge value={r.waste_risk} /></td>
                  <td className="px-4 py-3 text-center"><ConfidenceBadge value={r.confidence} /></td>
                  <td className={`px-4 py-3 text-right font-mono ${
                    r.delta_from_yesterday > 0 ? 'text-green-600' :
                    r.delta_from_yesterday < 0 ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {r.delta_from_yesterday > 0 ? '+' : ''}{r.delta_from_yesterday}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelected(null)} />
          <ProductDetailPanel productId={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  )
}
