const LABELS: Record<string, string> = {
  PROMO_ENDING_TODAY: 'Promo ending',
  DEMAND_HANGOVER_EXPECTED: 'Demand drop expected',
  HIGH_CURRENT_STOCK: 'High stock',
  RAIN_FORECAST: 'Rain forecast',
  LOWER_FOOT_TRAFFIC_EXPECTED: 'Lower foot traffic',
  SCHOOL_HALF_DAY: 'School half-day',
  LOW_BACKROOM_STOCK: 'Low backroom',
  LUNCH_SPIKE_EXPECTED: 'Lunch spike',
  INGREDIENT_SHORTAGE: 'Ingredient shortage',
  PRODUCTION_BLOCKED: 'Production blocked',
}

export default function ReasonPill({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
      {LABELS[code] ?? code}
    </span>
  )
}
