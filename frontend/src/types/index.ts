export interface Product {
  product_id: string
  name: string
  department: string
  unit_type: string
  case_size: number
  shelf_life_hours: number
  safety_stock: number
  display_min: number
  is_prepared: boolean
}

export interface InventoryItem {
  product_id: string
  floor_stock: number
  backroom_stock: number
  current_stock_estimate: number
  last_adjustment_time: string
  adjustment_reason: string
}

export interface OrderRec {
  product_id: string
  product_name: string
  department: string
  forecasted_demand: number
  recommended_order_cases: number
  current_stock: number | null
  confidence: number
  stockout_risk: number
  waste_risk: number
  reason_codes: string[]
  yesterday_recommended_cases: number
  delta_from_yesterday: number
  notes: string
}

export interface IngredientConstraint {
  ingredient_id: string
  ingredient_name: string
  needed_lbs: number
  available_lbs: number
  shortfall_lbs: number
}

export interface ProductionRec {
  product_id: string
  product_name: string
  department: string
  time_window: string
  current_prepared_qty: number
  forecasted_demand: number
  recommended_production_qty: number
  prep_time_minutes: number
  ingredient_constraints: IngredientConstraint[]
  status: 'normal' | 'sufficient' | 'elevated' | 'reduced' | 'blocked'
  notes: string
}

export interface ExternalSignal {
  id: string
  type: string
  title: string
  description: string
  affected_products: string[]
  severity: 'low' | 'medium' | 'high'
  active: boolean
}

export interface Priorities {
  urgent_orders: OrderRec[]
  production_blocks: ProductionRec[]
  waste_risks: OrderRec[]
  manager_review: OrderRec[]
}

export interface ProductDetails {
  product: Product
  inventory: InventoryItem | null
  order_recommendation: OrderRec | null
  production_recommendations: ProductionRec[]
  sales_last_7_days: { date: string; units_sold: number; notes?: string }[]
  signals: ExternalSignal[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ToolCallRecord {
  tool_name: string
  args: Record<string, unknown>
  result: unknown
}

export type SSEEvent =
  | { type: 'tool_start'; tool_name: string; args: Record<string, unknown> }
  | { type: 'tool_done'; tool_name: string; result: unknown }
  | { type: 'text_delta'; text: string }
  | { type: 'done'; tool_calls_made: ToolCallRecord[] }
