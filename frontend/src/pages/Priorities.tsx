import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPriorities } from '../api/client'
import type { OrderRec, Priorities, ProductionRec } from '../types'
import RiskBadge from '../components/RiskBadge'
import ConfidenceBadge from '../components/ConfidenceBadge'
import ReasonPill from '../components/ReasonPill'

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {count === 0 ? (
          <p className="text-sm text-gray-400 italic">None right now</p>
        ) : children}
      </div>
    </div>
  )
}

function OrderCard({ rec, linkTo }: { rec: OrderRec; linkTo: string }) {
  return (
    <Link to={linkTo} className="flex-shrink-0 w-64 bg-white rounded-lg border border-gray-200 p-4 hover:border-green-400 hover:shadow-sm transition-all block">
      <p className="font-medium text-gray-900 text-sm mb-1">{rec.product_name}</p>
      <p className="text-xs text-gray-500 mb-3">{rec.department}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {rec.stockout_risk > 0.6 && <RiskBadge value={rec.stockout_risk} label="Stockout" />}
        {rec.waste_risk > 0.7 && <RiskBadge value={rec.waste_risk} label="Waste" />}
        <ConfidenceBadge value={rec.confidence} />
      </div>
      <div className="flex flex-wrap gap-1">
        {rec.reason_codes.map(c => <ReasonPill key={c} code={c} />)}
      </div>
      {rec.delta_from_yesterday !== 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {rec.delta_from_yesterday > 0 ? '+' : ''}{rec.delta_from_yesterday} cases vs yesterday
        </p>
      )}
    </Link>
  )
}

function ProductionCard({ rec }: { rec: ProductionRec }) {
  const constraint = rec.ingredient_constraints[0]
  return (
    <Link to="/production" className="flex-shrink-0 w-64 bg-white rounded-lg border border-red-200 p-4 hover:border-red-400 hover:shadow-sm transition-all block">
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium text-gray-900 text-sm">{rec.product_name}</p>
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">Blocked</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{rec.time_window}</p>
      {constraint && (
        <p className="text-xs text-red-600">
          Needs {constraint.needed_lbs} lbs {constraint.ingredient_name} · only {constraint.available_lbs} lbs available
        </p>
      )}
      <p className="text-xs text-gray-500 mt-2">{rec.notes}</p>
    </Link>
  )
}

export default function PrioritiesPage() {
  const [data, setData] = useState<Priorities | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPriorities().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  if (!data) return <p className="text-red-500">Failed to load priorities.</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Today's Priorities</h1>
        <p className="text-sm text-gray-500">Riverside Fresh Market · Store S042 · Order deadline 11:00 AM</p>
      </div>

      <Section title="Urgent Orders" count={data.urgent_orders.length}>
        {data.urgent_orders.map(r => <OrderCard key={r.product_id} rec={r} linkTo="/ordering" />)}
      </Section>

      <Section title="Production Blocks" count={data.production_blocks.length}>
        {data.production_blocks.map(r => <ProductionCard key={`${r.product_id}-${r.time_window}`} rec={r} />)}
      </Section>

      <Section title="Waste Risks" count={data.waste_risks.length}>
        {data.waste_risks.map(r => <OrderCard key={r.product_id} rec={r} linkTo="/ordering" />)}
      </Section>

      <Section title="Manager Review" count={data.manager_review.length}>
        {data.manager_review.map(r => <OrderCard key={r.product_id} rec={r} linkTo="/ordering" />)}
      </Section>
    </div>
  )
}
