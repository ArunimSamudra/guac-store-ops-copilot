import { useEffect, useState } from 'react'
import { fetchProductionRecommendations } from '../api/client'
import type { ProductionRec } from '../types'

const STATUS_STYLES: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  sufficient: 'bg-green-100 text-green-700',
  elevated: 'bg-blue-100 text-blue-700',
  reduced: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-100 text-red-700',
}

function IngredientConstraintCallout({ rec }: { rec: ProductionRec }) {
  if (!rec.ingredient_constraints.length) return null
  return (
    <div className="mt-2 space-y-1">
      {rec.ingredient_constraints.map(c => (
        <div key={c.ingredient_id} className="text-xs bg-red-50 border border-red-200 rounded px-3 py-2 text-red-700">
          Needs <strong>{c.needed_lbs} lbs</strong> {c.ingredient_name}
          {' · '}Only <strong>{c.available_lbs} lbs</strong> available
          {c.shortfall_lbs > 0 && <> · <strong className="text-red-800">Shortfall: {c.shortfall_lbs} lbs</strong></>}
        </div>
      ))}
    </div>
  )
}

function WindowGroup({ window, recs }: { window: string; recs: ProductionRec[] }) {
  const [open, setOpen] = useState(true)
  const hasBlock = recs.some(r => r.status === 'blocked')

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{open ? '▾' : '▸'}</span>
          <span>{window}</span>
          {hasBlock && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">⚠ Blocked</span>}
        </div>
        <span className="text-gray-400 text-xs">{recs.length} item{recs.length !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-500 text-xs">Product</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">On Hand</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Forecast</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Produce</th>
                <th className="text-right px-4 py-2 font-medium text-gray-500 text-xs">Prep (min)</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500 text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {recs.map(r => (
                <tr key={`${r.product_id}-${r.time_window}`} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.product_name}</p>
                    {r.notes && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
                    <IngredientConstraintCallout rec={r} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">{r.current_prepared_qty}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">{r.forecasted_demand}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{r.recommended_production_qty}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{r.prep_time_minutes}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[r.status] ?? STATUS_STYLES.normal}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function Production() {
  const [recs, setRecs] = useState<ProductionRec[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProductionRecommendations().then(setRecs).finally(() => setLoading(false))
  }, [])

  const grouped = recs.reduce<Record<string, ProductionRec[]>>((acc, r) => {
    if (!acc[r.time_window]) acc[r.time_window] = []
    acc[r.time_window].push(r)
    return acc
  }, {})

  const sortedWindows = Object.keys(grouped).sort()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Production Plan</h1>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : (
        sortedWindows.map(w => (
          <WindowGroup key={w} window={w} recs={grouped[w]} />
        ))
      )}
    </div>
  )
}
