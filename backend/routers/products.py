import json
import os
from fastapi import APIRouter, HTTPException

router = APIRouter()
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load(filename: str):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)


@router.get("/products")
def get_products():
    return _load("products.json")


@router.get("/product/{product_id}/details")
def get_product_details(product_id: str):
    products = _load("products.json")
    product = next((p for p in products if p["product_id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    inventory = _load("inventory.json")
    inv = next((i for i in inventory if i["product_id"] == product_id), None)

    order_recs = _load("ordering_recommendations.json")
    order_rec = next((r for r in order_recs if r["product_id"] == product_id), None)

    prod_recs = _load("production_recommendations.json")
    production = [p for p in prod_recs if p["product_id"] == product_id]

    sales = _load("sales_history.json")
    last_7_days = sales.get(product_id, [])[-7:]

    signals_data = _load("external_signals.json")
    applicable_signals = [
        s for s in signals_data["signals"]
        if product_id in s.get("affected_products", [])
    ]

    return {
        "product": product,
        "inventory": inv,
        "order_recommendation": order_rec,
        "production_recommendations": production,
        "sales_last_7_days": last_7_days,
        "signals": applicable_signals,
    }
