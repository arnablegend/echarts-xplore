import { useEffect, useMemo, useRef, useState } from "react";
import { tableFromIPC } from "apache-arrow";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts";
import Plotly from "plotly.js-dist-min";

type SalesResponse = { labels: string[]; values: number[] };
type StreamPoint = { label: string; value: number };
type PlotlyFigure = { data: PlotlyTrace[]; layout?: PlotlyLayout };
type PlotlyTrace = Record<string, unknown>;
type PlotlyLayout = Record<string, unknown>;
type ServerCharts = { plotly: PlotlyFigure; echarts: EChartsOption };
type DataSample = { index: number; rows: number };
type XYData = { x: number[]; y: number[] };
type ChartLibrary = "plotly" | "echarts";
type DataframeSource = "pandas" | "pyarrow";

const palette = ["#7167f9", "#2bc48a", "#f6b84b", "#e56b8d"];

function chartLayout(title: string): PlotlyLayout {
  return {
    title: { text: title, font: { size: 14, color: "#19213d" }, x: 0, xanchor: "left" },
    margin: { l: 42, r: 18, t: 44, b: 34 }, paper_bgcolor: "transparent", plot_bgcolor: "transparent",
    font: { family: "DM Sans, sans-serif", color: "#65708b", size: 11 },
    xaxis: { fixedrange: true, showgrid: false, linecolor: "#dce0ea", zeroline: false },
    yaxis: { fixedrange: true, gridcolor: "#eef0f6", zeroline: false },
    showlegend: false,
  };
}

function PlotlyChart({ figure, height = 245 }: { figure: PlotlyFigure; height?: number }) {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!element.current) return;
    const node = element.current;
    void Plotly.react(node, figure.data, { ...figure.layout, autosize: true }, { responsive: true, displayModeBar: false });
    const observer = new ResizeObserver(() => Plotly.Plots.resize(node));
    observer.observe(node);
    return () => { observer.disconnect(); Plotly.purge(node); };
  }, [figure]);

  return <div ref={element} style={{ height, width: "100%" }} />;
}

function EChartsChart({ option, height = 360 }: { option: EChartsOption; height?: number }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) return;
    const chart = echarts.init(element.current);
    chart.setOption(option);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [option]);
  return <div ref={element} style={{ height, width: "100%" }} />;
}

function LibraryChart({ library, figure, option, height = 245 }: { library: ChartLibrary; figure: PlotlyFigure; option: EChartsOption; height?: number }) {
  return library === "echarts" ? <EChartsChart option={option} height={height} /> : <PlotlyChart figure={figure} height={height} />;
}

function ReusableChart({ library, title, labels, values, color = palette[0] }: { library: ChartLibrary; title: string; labels: string[]; values: number[]; color?: string }) {
  const figure = useMemo<PlotlyFigure>(() => ({
    data: [{ type: "scatter", mode: "lines+markers", x: labels, y: values, line: { color, width: 3, shape: "spline" }, marker: { color, size: 7 }, fill: "tozeroy", fillcolor: `${color}20`, hovertemplate: "%{x}: %{y}<extra></extra>" }],
    layout: chartLayout(title),
  }), [title, labels, values, color]);
  const option = useMemo<EChartsOption>(() => ({
    title: { text: title, left: 0, textStyle: { fontSize: 14, fontWeight: 600, color: "#19213d" } }, tooltip: { trigger: "axis" }, grid: { left: 42, right: 20, top: 48, bottom: 32 },
    xAxis: { type: "category", data: labels, boundaryGap: false, axisLine: { lineStyle: { color: "#dce0ea" } } }, yAxis: { type: "value", splitLine: { lineStyle: { color: "#eef0f6" } } },
    series: [{ type: "line", data: values, smooth: true, symbolSize: 7, lineStyle: { color, width: 3 }, itemStyle: { color }, areaStyle: { color: `${color}22` } }],
  }), [title, labels, values, color]);
  return <LibraryChart library={library} figure={figure} option={option} />;
}

function ChartCard({ number, title, note, children }: { number: string; title: string; note: string; children: React.ReactNode }) {
  return <section className="chart-card"><div className="card-heading"><span>{number}</span><div><h2>{title}</h2><p>{note}</p></div></div>{children}</section>;
}

function DatasetChart({ library, dataset }: { library: ChartLibrary; dataset: XYData }) {
  const plotlyFigure = useMemo<PlotlyFigure>(() => ({
    data: [{ type: "scattergl", mode: "markers", x: dataset.y, y: dataset.x, marker: { color: palette[0], size: 3, opacity: 0.65 }, hovertemplate: "Y: %{x}<br>X: %{y:.3f}<extra></extra>" }],
    layout: { ...chartLayout("Pandas / Arrow DataFrame — Y vs X"), xaxis: { title: "Y (integer)" }, yaxis: { title: "X (float: 0–50)" }, dragmode: "zoom" },
  }), [dataset]);
  const echartOption = useMemo<EChartsOption>(() => ({
    animation: false,
    title: { text: "Pandas / Arrow DataFrame — Y vs X", left: 0, textStyle: { fontSize: 14, color: "#19213d" } },
    tooltip: { trigger: "axis" }, grid: { left: 54, right: 24, top: 46, bottom: 55 },
    xAxis: { type: "value", name: "Y (integer)", nameLocation: "middle", nameGap: 30, splitLine: { lineStyle: { color: "#eef0f6" } } },
    yAxis: { type: "value", name: "X (float: 0–50)", nameLocation: "middle", nameGap: 40, splitLine: { lineStyle: { color: "#eef0f6" } } },
    dataZoom: [{ type: "inside" }, { type: "slider", bottom: 2 }],
    series: [{ type: "scatter", data: dataset.x.map((x, index) => [dataset.y[index], x]), symbolSize: 3, progressive: 5_000, progressiveThreshold: 10_000, itemStyle: { color: palette[0], opacity: 0.65 } }],
  }), [dataset]);
  return library === "plotly" ? <PlotlyChart figure={plotlyFigure} height={390} /> : <EChartsChart option={echartOption} height={390} />;
}

export default function App() {
  const [visitors, setVisitors] = useState(58);
  const [sales, setSales] = useState<SalesResponse | null>(null);
  const [salesError, setSalesError] = useState("");
  const [cardWidth, setCardWidth] = useState(100);
  const [stream, setStream] = useState<StreamPoint[]>([]);
  const [connected, setConnected] = useState(false);
  const [serverCharts, setServerCharts] = useState<ServerCharts | null>(null);
  const [demoLibrary, setDemoLibrary] = useState<ChartLibrary>("echarts");
  const [samples, setSamples] = useState<DataSample[]>([]);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [library, setLibrary] = useState<ChartLibrary>("plotly");
  const [dataframeSource, setDataframeSource] = useState<DataframeSource>("pandas");
  const [dataset, setDataset] = useState<XYData | null>(null);
  const [datasetError, setDatasetError] = useState("");
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [loadTime, setLoadTime] = useState<number | null>(null);

  const basicFigure = useMemo<PlotlyFigure>(() => ({
    data: [{ type: "bar", x: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], y: [32, 48, 36, 58, 42, 64, 52], marker: { color: palette[0], line: { width: 0 } }, hovertemplate: "%{x}: %{y}<extra></extra>" }],
    layout: chartLayout("Weekly activity"),
  }), []);
  const basicOption = useMemo<EChartsOption>(() => ({
    title: { text: "Weekly activity", left: 0, textStyle: { fontSize: 14, fontWeight: 600, color: "#19213d" } }, tooltip: { trigger: "axis" }, grid: { left: 42, right: 20, top: 48, bottom: 32 },
    xAxis: { type: "category", data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], axisLine: { lineStyle: { color: "#dce0ea" } } }, yAxis: { type: "value", splitLine: { lineStyle: { color: "#eef0f6" } } },
    series: [{ type: "bar", data: [32, 48, 36, 58, 42, 64, 52], barWidth: 20, itemStyle: { color: palette[0], borderRadius: [5, 5, 0, 0] } }],
  }), []);
  const stateFigure = useMemo<PlotlyFigure>(() => ({
    data: [{ type: "scatter", mode: "lines+markers", x: ["08:00", "10:00", "12:00", "14:00", "16:00"], y: [34, 48, visitors - 10, visitors, visitors + 6], line: { color: palette[1], width: 3, shape: "spline" }, marker: { color: palette[1], size: 7 }, fill: "tozeroy", fillcolor: "#2bc48a25" }],
    layout: chartLayout("Live state value"),
  }), [visitors]);
  const stateOption = useMemo<EChartsOption>(() => ({
    title: { text: "Live state value", left: 0, textStyle: { fontSize: 14, fontWeight: 600, color: "#19213d" } }, tooltip: { trigger: "axis" }, grid: { left: 42, right: 20, top: 48, bottom: 32 },
    xAxis: { type: "category", data: ["08:00", "10:00", "12:00", "14:00", "16:00"], boundaryGap: false, axisLine: { lineStyle: { color: "#dce0ea" } } }, yAxis: { type: "value", splitLine: { lineStyle: { color: "#eef0f6" } } },
    series: [{ type: "line", smooth: true, data: [34, 48, visitors - 10, visitors, visitors + 6], lineStyle: { color: palette[1], width: 3 }, itemStyle: { color: palette[1] }, areaStyle: { color: "#2bc48a25" } }],
  }), [visitors]);
  const streamFigure = useMemo<PlotlyFigure>(() => ({
    data: [{ type: "scatter", mode: "lines", x: stream.map((point) => point.label), y: stream.map((point) => point.value), line: { color: palette[3], width: 3, shape: "spline" }, fill: "tozeroy", fillcolor: "#e56b8d20" }],
    layout: chartLayout("Events from server"),
  }), [stream]);
  const streamOption = useMemo<EChartsOption>(() => ({
    title: { text: "Events from server", left: 0, textStyle: { fontSize: 14, fontWeight: 600, color: "#19213d" } }, tooltip: { trigger: "axis" }, grid: { left: 42, right: 20, top: 48, bottom: 32 },
    xAxis: { type: "category", data: stream.map((point) => point.label), boundaryGap: false, axisLine: { lineStyle: { color: "#dce0ea" } } }, yAxis: { type: "value", splitLine: { lineStyle: { color: "#eef0f6" } } },
    series: [{ type: "line", smooth: true, showSymbol: false, data: stream.map((point) => point.value), lineStyle: { color: palette[3], width: 3 }, areaStyle: { color: "#e56b8d20" } }],
  }), [stream]);

  useEffect(() => {
    fetch("/api/sales").then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load sales data"))).then(setSales).catch((error: Error) => setSalesError(error.message));
    fetch("/api/chart-option").then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load figure"))).then(setServerCharts).catch(() => undefined);
    fetch("/api/samples").then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load samples"))).then((data: { samples: DataSample[] }) => setSamples(data.samples)).catch(() => undefined);
  }, []);
  useEffect(() => {
    const source = new EventSource("/api/stream");
    source.onopen = () => setConnected(true);
    source.onmessage = (event) => setStream((current) => [...current, JSON.parse(event.data) as StreamPoint].slice(-12));
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, []);

  async function loadDataframe(): Promise<void> {
    setLoadingDataset(true); setDatasetError("");
    const startedAt = performance.now();
    try {
      const response = await fetch(`/api/dataframe/${dataframeSource}?sample_index=${sampleIndex}`);
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const table = tableFromIPC(await response.arrayBuffer());
      const xColumn = table.getChild("x");
      const yColumn = table.getChild("y");
      if (!xColumn || !yColumn) throw new Error("Arrow stream did not contain x and y columns");
      setDataset({ x: Array.from(xColumn).map(Number), y: Array.from(yColumn).map(Number) });
      setLoadTime(Math.round(performance.now() - startedAt));
    } catch (error) { setDatasetError(error instanceof Error ? error.message : "Could not load DataFrame"); }
    finally { setLoadingDataset(false); }
  }

  return <main>
    <header><div><p className="eyebrow">ECharts + Plotly.js + React + FastAPI</p><h1>Chart pattern playground</h1><p className="subtitle">Eight reusable chart patterns with a selectable rendering library.</p></div><div className="header-actions"><label>Demo library <select value={demoLibrary} onChange={(event) => setDemoLibrary(event.target.value as ChartLibrary)}><option value="echarts">ECharts</option><option value="plotly">Plotly.js</option></select></label><div className="status"><i /> FastAPI connected</div></div></header>
    <section className="dataset-lab">
      <div className="dataset-copy"><p className="eyebrow">DataFrame benchmark</p><h2>Arrow-powered large dataset viewer</h2><p>Select pandas or direct PyArrow construction on FastAPI, then transfer typed X (float) and Y (integer) columns to either charting library.</p></div>
      <div className="dataset-controls"><label>Sample <select value={sampleIndex} onChange={(event) => setSampleIndex(Number(event.target.value))}>{samples.map((sample) => <option key={sample.index} value={sample.index}>#{sample.index + 1} — {sample.rows.toLocaleString()} rows</option>)}</select></label><label>DataFrame <select value={dataframeSource} onChange={(event) => setDataframeSource(event.target.value as DataframeSource)}><option value="pandas">Pandas DataFrame</option><option value="pyarrow">PyArrow Table</option></select></label><label>Library <select value={library} onChange={(event) => setLibrary(event.target.value as ChartLibrary)}><option value="plotly">Plotly.js (WebGL)</option><option value="echarts">ECharts (progressive)</option></select></label><button type="button" onClick={loadDataframe} disabled={loadingDataset || samples.length === 0}>{loadingDataset ? "Loading…" : "Load sample"}</button></div>
      {datasetError && <p className="error dataset-message">{datasetError}</p>}{dataset && <><p className="dataset-message">Loaded <strong>{dataset.x.length.toLocaleString()}</strong> rows in {loadTime} ms from {dataframeSource === "pandas" ? "Pandas DataFrame" : "PyArrow Table"} with {library === "plotly" ? "Plotly WebGL" : "ECharts progressive"}.</p><DatasetChart library={library} dataset={dataset} /></>}
    </section>
    <div className="grid">
      <ChartCard number="01" title="Basic chart component" note="A static chart rendered from React."><LibraryChart library={demoLibrary} figure={basicFigure} option={basicOption} /></ChartCard>
      <ChartCard number="02" title="Update with React state" note="The chart rerenders when component state changes."><div className="metric"><strong>{visitors}</strong><button onClick={() => setVisitors((value) => value + 8)}>Add visitors</button></div><LibraryChart library={demoLibrary} figure={stateFigure} option={stateOption} height={190} /></ChartCard>
      <ChartCard number="03" title="Fetch backend data" note="GET /api/sales becomes a chart series.">{salesError ? <p className="error">{salesError}</p> : sales ? <ReusableChart library={demoLibrary} title="Monthly sales" labels={sales.labels} values={sales.values} color={palette[2]} /> : <p className="loading">Loading chart data…</p>}</ChartCard>
      <ChartCard number="04" title="Resizable chart component" note="Change the parent width; ResizeObserver updates the chart."><label className="range-label">Width <input type="range" min="55" max="100" value={cardWidth} onChange={(event) => setCardWidth(Number(event.target.value))} /> {cardWidth}%</label><div className="resizable-chart" style={{ width: `${cardWidth}%` }}><ReusableChart library={demoLibrary} title="Container-aware chart" labels={["Q1", "Q2", "Q3", "Q4"]} values={[24, 42, 31, 61]} color={palette[3]} /></div></ChartCard>
      <ChartCard number="05" title="Responsive chart" note="It fills the available grid column and responds to viewport changes."><ReusableChart library={demoLibrary} title="Viewport friendly" labels={["Mobile", "Tablet", "Desktop"]} values={[44, 61, 86]} color={palette[1]} /></ChartCard>
      <ChartCard number="06" title="Reusable chart component" note="One typed component, varied data and styling."><ReusableChart library={demoLibrary} title="Team velocity" labels={["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4"]} values={[18, 29, 25, 39]} /></ChartCard>
      <ChartCard number="07" title="Fetch chart option directly" note="FastAPI returns ready-to-render configuration for both libraries.">{serverCharts ? <LibraryChart library={demoLibrary} figure={serverCharts.plotly} option={serverCharts.echarts} /> : <p className="loading">Loading server-side option…</p>}</ChartCard>
      <ChartCard number="08" title="Streaming updates" note="Server-Sent Events append live data points."><div className="stream-status"><i className={connected ? "on" : ""} /> {connected ? "Streaming" : "Reconnecting…"}</div><LibraryChart library={demoLibrary} figure={streamFigure} option={streamOption} height={215} /></ChartCard>
    </div>
  </main>;
}
