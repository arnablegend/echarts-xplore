import asyncio
import json
import random
from datetime import datetime
from typing import AsyncIterator

import pandas as pd
import pyarrow as pa
import numpy as np
from fastapi import FastAPI
from fastapi import Query
from fastapi.responses import Response, StreamingResponse

app = FastAPI(title="Plotly.js demo API")
SAMPLE_SIZES = tuple(1_000 + ((200_000 - 1_000) * index) // 9 for index in range(10))


@app.get("/api/sales")
def sales():
    return {"labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], "values": [38, 52, 47, 69, 61, 78]}


@app.get("/api/chart-option")
def chart_option():
    return {
        "data": [{"type": "bar", "x": ["North", "East", "South", "West"], "y": [82, 64, 91, 73], "marker": {"color": "#7167f9"}, "hovertemplate": "%{x}: %{y}<extra></extra>"}],
        "layout": {
            "title": {"text": "Figure supplied by FastAPI", "font": {"size": 14, "color": "#19213d"}, "x": 0, "xanchor": "left"},
            "margin": {"l": 42, "r": 18, "t": 44, "b": 34}, "paper_bgcolor": "transparent", "plot_bgcolor": "transparent",
            "font": {"family": "DM Sans, sans-serif", "color": "#65708b", "size": 11}, "showlegend": False,
            "xaxis": {"fixedrange": True, "showgrid": False, "linecolor": "#dce0ea"}, "yaxis": {"fixedrange": True, "gridcolor": "#eef0f6"},
        },
    }


@app.get("/api/samples")
def samples():
    """Return the available DataFrame sample indices and row counts."""
    return {"samples": [{"index": index, "rows": rows} for index, rows in enumerate(SAMPLE_SIZES)]}


def arrow_response(table: pa.Table, sample_index: int) -> Response:
    """Serialize an Arrow table using the shared browser-facing IPC contract."""
    output = pa.BufferOutputStream()
    with pa.ipc.new_stream(output, table.schema) as writer:
        writer.write_table(table)
    return Response(
        content=output.getvalue().to_pybytes(),
        media_type="application/vnd.apache.arrow.stream",
        headers={"Content-Disposition": f'inline; filename="sample-{sample_index}.arrow"'},
    )


def random_x_values(row_count: int, sample_index: int) -> np.ndarray:
    """Return repeatable, uniformly distributed float64 X values in [0, 50]."""
    return np.random.default_rng(10_000 + sample_index).uniform(0.0, 50.0, row_count)


@app.get("/api/dataframe/pandas")
def pandas_dataframe_sample(sample_index: int = Query(0, ge=0, le=len(SAMPLE_SIZES) - 1)):
    """Build with pandas, convert to Arrow, then send a typed IPC stream."""
    row_count = SAMPLE_SIZES[sample_index]
    dataframe = pd.DataFrame({
        "x": random_x_values(row_count, sample_index),
        "y": pd.Series(range(1, row_count + 1), dtype="int64"),
    })
    return arrow_response(pa.Table.from_pandas(dataframe, preserve_index=False), sample_index)


@app.get("/api/dataframe/pyarrow")
def pyarrow_dataframe_sample(sample_index: int = Query(0, ge=0, le=len(SAMPLE_SIZES) - 1)):
    """Build the equivalent typed Arrow table without materializing a pandas DataFrame."""
    row_count = SAMPLE_SIZES[sample_index]
    x_values = pa.array(random_x_values(row_count, sample_index), type=pa.float64())
    y_values = pa.array(range(1, row_count + 1), type=pa.int64())
    return arrow_response(pa.table({"x": x_values, "y": y_values}), sample_index)


@app.get("/api/dataframe")
def dataframe_sample(sample_index: int = Query(0, ge=0, le=len(SAMPLE_SIZES) - 1)):
    """Compatibility alias for the pandas-backed sample endpoint."""
    return pandas_dataframe_sample(sample_index)


async def stream_points() -> AsyncIterator[str]:
    while True:
        point = {"label": datetime.now().strftime("%H:%M:%S"), "value": random.randint(32, 92)}
        yield f"data: {json.dumps(point)}\n\n"
        await asyncio.sleep(1)


@app.get("/api/stream")
async def stream():
    return StreamingResponse(stream_points(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
