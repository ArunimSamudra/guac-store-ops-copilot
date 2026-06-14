export default function ConfidenceBadge({ value }: { value: number }) {
  const [label, color] =
    value >= 0.8 ? ['High', 'bg-blue-100 text-blue-700'] :
    value >= 0.65 ? ['Medium', 'bg-yellow-100 text-yellow-700'] :
    ['Low', 'bg-red-100 text-red-700']
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label} ({Math.round(value * 100)}%)
    </span>
  )
}
