# Guac Store Ops Copilot

This is a prototype exploring what an AI-native operator interface could look like for grocery store ordering and production planning workflows, inspired by Guac's store operations product. The copilot does not replicate Guac's forecasting model — it sits on top of static mock forecast data to demonstrate an interface and interaction pattern: a conversational assistant that can synthesize signals across multiple products and domains, with every number it cites grounded in a tool call rather than the model's memory.

## What It Does

Ask the copilot what to focus on before the order deadline and it reasons across every product at once — waste risks, stockout risks, blocked production runs — and surfaces the tensions between them rather than treating each item in isolation. You can ask by department, by urgency, or open-ended ("what's going to be a problem at lunch?") and get a synthesized answer instead of a filtered table.

Every number in a copilot response comes from a tool call, not the model's memory. When it says "max producible is 3 units" or "stockout risk is 74%," it fetched that figure from the data at query time. The tool call trace is visible inline so you can verify exactly which data the answer is based on. This also means the copilot stays consistent with what the Ordering and Production pages show — it reads the same source.

You can ask about ordering and production in the same conversation. Questions like "should I order more pork shoulder?" require knowing whether the production run is blocked and why — the copilot holds that context across the whole session rather than treating ordering and production as separate workflows.

## Screens

**Priorities** — the default landing page; surfaces urgent orders, production blocks, waste risks, and items flagged for manager review in a single glance.

**Ordering Workspace** — tabular view of all products with forecasted demand, recommended order cases, stockout and waste risk scores, confidence levels, and reason codes.

**Production Plan** — timeline view of production recommendations by product and time window, with ingredient constraint status and blocked-run indicators.

**Copilot** — conversational interface where operators can ask free-text questions; the model responds using tool calls against live mock data, with the tool trace visible inline.

## Architecture

```
[React + TypeScript + Vite + Tailwind]
        |
        | HTTP (SSE streaming)
        v
[FastAPI (Python)]
        |
        |-- reads --> [Mock JSON data files]
        |
        |-- tool call loop --> [Anthropic API]
                                    |
                              calls tools
                                    |
                              reads mock data
                                    |
                              returns grounded response
```

When a message arrives at `/api/copilot/chat`, the backend sends it to `claude-sonnet-4-6` with the tool definitions attached. If the model responds with `stop_reason: tool_use`, the backend executes the requested tools against the mock JSON files, appends the results to the message history, and sends the next turn. This loop continues for up to 10 turns until the model produces a final text response, which is streamed back to the frontend as server-sent events. The frontend renders the tool call trace in real time so the operator can see exactly what data the answer is based on.

Tool calling is used instead of RAG or context stuffing because the underlying data is structured (JSON records with typed fields), not documents. Passing the raw JSON into the context on every request would waste tokens and remove the auditability boundary — the operator couldn't tell which specific field drove a recommendation. Tools enforce grounding by making each data access explicit and inspectable.

## LLM Tools

- `get_store_priorities` — returns today's urgent orders, production blocks, waste risks, and items needing manager review, computed from the ordering and production data
- `get_order_recommendation` — returns the ordering recommendation for a product or all products: recommended cases, forecasted demand, stockout/waste risk, confidence, and reason codes
- `get_production_plan` — returns production recommendations filtered by product and/or time window, with status (normal, elevated, reduced, blocked, sufficient)
- `get_inventory_state` — returns current floor stock, backroom stock, and estimated total on-hand for a product or all products
- `get_external_signals` — returns active external signals affecting the store today: weather, promotions, local events, and supply issues
- `search_products` — searches for products by name or department using a text query
- `get_ingredient_availability` — for a prepared food product, returns ingredient availability and the maximum producible quantity given current inventory and active constraints

## Mock Data

- `products.json` — product catalog: 16 items across Deli, Seafood, Bakery, Produce, Meat, Dairy, and Center Store with shelf life, case size, and safety stock parameters
- `ordering_recommendations.json` — pre-computed ordering recommendations for all 16 products: forecasted demand, recommended cases, stockout/waste risk scores, confidence, and reason codes
- `production_recommendations.json` — production recommendations by product and time window, including ingredient constraints and blocked-run status
- `external_signals.json` — four active signals for today: rain forecast, rotisserie chicken promo ending, school half-day, and pork shoulder delivery shortage
- `inventory.json` — current floor and backroom stock estimates for all products
- `recipes.json` — ingredient lists for prepared food items, used to compute max producible quantities
- `sales_history.json` — recent sales history used as context for demand signals
- `store_config.json` — store name, store ID, order deadline, and timezone

## How to Run

### Backend
```bash
cd backend
pip install -r requirements.txt
# create a .env file with ANTHROPIC_API_KEY=your_key_here
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173. Start on the Copilot page and ask: "What should I focus on before the 11am order deadline?"

## Limitations

- Mock data only — no real store, POS, or inventory system; numbers are hand-crafted for the demo scenario
- Single store, single day — not designed for multi-store or multi-day workflows
- No authentication or user roles — anyone with access to the URL can read and query all data
- Copilot quality depends on mock data realism — edge cases and unusual scenarios are not covered

## What This Is Not

This is not an attempt to replicate Guac's forecasting model, their recommendation algorithm, or their production system. Guac's forecasting is trained on real store data across hundreds of variables and years of transaction history. This prototype uses static mock data to demonstrate an interface and interaction pattern — specifically, what it feels like to have a conversational layer on top of structured store operations data. The forecasting approach is out of scope and not the point.

## Future Work

- **MCP server**: expose the tool functions as an MCP server so any MCP-compatible client (Claude Desktop, other agents) can connect without going through the FastAPI layer
- **Mobile-first UI**: Guac's real product runs on Zebra scanners and tablets — the interface needs responsive design and touch-friendly controls to be useful in a real store environment
- **Evals**: measure copilot answer quality against known-correct answers for the demo scenario, so changes to prompts or tool definitions can be validated objectively
- **Real integrations**: replace the mock JSON files with a real POS or inventory system feed, even a read-only one, to test whether the grounding model holds under real data variability
- **Forecast anomaly investigation**: let operators ask why a recommendation changed day-over-day (e.g., "why is sourdough up 2 cases from yesterday?"), drilling into the signal chain rather than just surfacing the current recommendation
