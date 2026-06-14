import json
import os
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load(filename: str):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)


@router.get("/order/recommendations")
def get_order_recommendations(
    sort_by: Optional[str] = Query(None, description="stockout_risk | waste_risk | delta_from_yesterday")
):
    recs = _load("ordering_recommendations.json")
    inv_map = {i["product_id"]: i["current_stock_estimate"] for i in _load("inventory.json")}
    for r in recs:
        r["current_stock"] = inv_map.get(r["product_id"])
    if sort_by in ("stockout_risk", "waste_risk"):
        recs = sorted(recs, key=lambda r: r.get(sort_by, 0), reverse=True)
    elif sort_by == "delta_from_yesterday":
        recs = sorted(recs, key=lambda r: abs(r.get("delta_from_yesterday", 0)), reverse=True)
    return recs
