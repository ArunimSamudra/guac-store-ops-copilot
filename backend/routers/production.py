import json
import os
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load(filename: str):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)


@router.get("/production/recommendations")
def get_production_recommendations(
    time_window: Optional[str] = Query(None, description="Filter by time window e.g. 10:00"),
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
):
    recs = _load("production_recommendations.json")
    if time_window:
        recs = [r for r in recs if r["time_window"] == time_window]
    if product_id:
        recs = [r for r in recs if r["product_id"] == product_id]
    return recs
