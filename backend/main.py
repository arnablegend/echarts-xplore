import asyncio
import json
import random
from datetime import datetime
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI(title="ECharts demo API")


@app.get("/api/sales")
def sales():
    return {"labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], "values": [38, 52, 47, 69, 61, 78]}


@app.get("/api/chart-option")
def chart_option():
    return {
        "title": {"text": "Option supplied by FastAPI", "textStyle": {"fontSize": 14, "fontWeight": 600, "color": "#19213d"}},
        "tooltip": {"trigger": "axis"},
        "grid": {"left": 42, "right": 20, "top": 48, "bottom": 32},
        "xAxis": {"type": "category", "data": ["North", "East", "South", "West"], "axisLine": {"lineStyle": {"color": "#dce0ea"}}},
        "yAxis": {"type": "value", "splitLine": {"lineStyle": {"color": "#eef0f6"}}},
        "series": [{"type": "bar", "data": [82, 64, 91, 73], "barWidth": 28, "itemStyle": {"color": "#7167f9", "borderRadius": [6, 6, 0, 0]}}],
    }


async def stream_points() -> AsyncIterator[str]:
    while True:
        point = {"label": datetime.now().strftime("%H:%M:%S"), "value": random.randint(32, 92)}
        yield f"data: {json.dumps(point)}\n\n"
        await asyncio.sleep(1)


@app.get("/api/stream")
async def stream():
    return StreamingResponse(stream_points(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
