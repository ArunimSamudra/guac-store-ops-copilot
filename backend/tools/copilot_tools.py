import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
_TOOLS_FILE = os.path.join(os.path.dirname(__file__), "tools.json")


def _load(filename: str):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)


def _compute_priorities():
    recs = _load("ordering_recommendations.json")
    prod = _load("production_recommendations.json")

    urgent_orders = [r for r in recs if r.get("stockout_risk", 0) > 0.6]
    production_blocks = [p for p in prod if p.get("status") == "blocked"]
    waste_risks = [r for r in recs if r.get("waste_risk", 0) > 0.7]
    manager_review = [
        r for r in recs
        if r.get("confidence", 1) < 0.65 or abs(r.get("delta_from_yesterday", 0)) >= 3
    ]

    return {
        "urgent_orders": urgent_orders,
        "production_blocks": production_blocks,
        "waste_risks": waste_risks,
        "manager_review": manager_review,
    }


def get_store_priorities(_args: dict) -> dict:
    return _compute_priorities()


def get_order_recommendation(args: dict) -> dict:
    product_id = args.get("product_id")
    recs = _load("ordering_recommendations.json")
    results = [r for r in recs if r["product_id"] == product_id] if product_id else recs
    return {"recommendations": results}


def get_production_plan(args: dict) -> dict:
    product_id = args.get("product_id")
    time_window = args.get("time_window")
    prod = _load("production_recommendations.json")
    results = prod
    if product_id:
        results = [p for p in results if p["product_id"] == product_id]
    if time_window:
        results = [p for p in results if p["time_window"] == time_window]
    return {"production_plan": results}


def get_inventory_state(args: dict) -> dict:
    product_id = args.get("product_id")
    inv = _load("inventory.json")
    results = [i for i in inv if i["product_id"] == product_id] if product_id else inv
    return {"inventory": results}


def get_external_signals(_args: dict) -> dict:
    return _load("external_signals.json")


def search_products(args: dict) -> dict:
    query = args.get("query", "").lower()
    products = _load("products.json")
    results = [
        p for p in products
        if query in p["name"].lower() or query in p["department"].lower()
    ]
    return {"products": results}


def get_ingredient_availability(args: dict) -> dict:
    product_id = args.get("product_id")
    recipes = _load("recipes.json")
    inventory = _load("inventory.json")
    prod_recs = _load("production_recommendations.json")
    inv_map = {i["product_id"]: i for i in inventory}

    recipe = next((r for r in recipes if r["product_id"] == product_id), None)
    if not recipe:
        return {"error": f"No recipe found for product {product_id}"}

    # Use ingredient_constraints from production recs if available (pre-computed for demo)
    blocked_recs = [
        p for p in prod_recs
        if p["product_id"] == product_id and p.get("ingredient_constraints")
    ]
    if blocked_recs:
        rep = blocked_recs[0]
        constraints = rep["ingredient_constraints"]
        rec_qty = rep.get("recommended_production_qty", 0)
        if rec_qty > 0 and constraints:
            max_producible = min(
                int(c["available_lbs"] / (c["needed_lbs"] / rec_qty))
                if c["needed_lbs"] > 0 else 999
                for c in constraints
            )
        else:
            max_producible = rec_qty
        return {
            "product_id": product_id,
            "product_name": recipe["product_name"],
            "ingredient_constraints": constraints,
            "max_producible": max_producible,
            "notes": rep.get("notes", ""),
        }

    # Fallback: compute from raw inventory + recipe
    ingredient_status = []
    max_producible = float("inf")

    for ing in recipe["ingredients"]:
        inv = inv_map.get(ing["ingredient_id"])
        available = inv["current_stock_estimate"] if inv else 0
        needed_per_unit = ing["qty_per_unit"]
        can_make = int(available / needed_per_unit) if needed_per_unit > 0 else 999
        max_producible = min(max_producible, can_make)

        ingredient_status.append({
            "ingredient_id": ing["ingredient_id"],
            "name": ing["name"],
            "qty_per_unit": needed_per_unit,
            "unit": ing["unit"],
            "available": available,
            "can_make": can_make,
            "sufficient": available >= needed_per_unit,
        })

    return {
        "product_id": product_id,
        "product_name": recipe["product_name"],
        "ingredients": ingredient_status,
        "max_producible": int(max_producible) if max_producible != float("inf") else 999,
    }


with open(_TOOLS_FILE) as _f:
    TOOLS = json.load(_f)

_TOOL_DISPATCH = {
    "get_store_priorities": get_store_priorities,
    "get_order_recommendation": get_order_recommendation,
    "get_production_plan": get_production_plan,
    "get_inventory_state": get_inventory_state,
    "get_external_signals": get_external_signals,
    "search_products": search_products,
    "get_ingredient_availability": get_ingredient_availability,
}


def execute_tool(name: str, args: dict):
    fn = _TOOL_DISPATCH.get(name)
    if fn is None:
        return {"error": f"Unknown tool: {name}"}
    return fn(args)
