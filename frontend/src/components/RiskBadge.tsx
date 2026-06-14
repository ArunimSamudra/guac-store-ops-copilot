export default function RiskBadge({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100)
  const color =
    value > 0.7 ? 'bg-red-100 text-red-700' :
    value > 0.4 ? 'bg-yellow-100 text-yellow-700' :
    'bg-green-100 text-green-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label ? `${label} ${pct}%` : `${pct}%`}
    </span>
  )
}
