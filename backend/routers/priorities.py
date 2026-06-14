import json
import os
from fastapi import APIRouter

router = APIRouter()
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load(filename: str):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)


@router.get("/priorities")
def get_priorities():
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
