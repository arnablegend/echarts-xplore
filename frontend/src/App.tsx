import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";

type SalesResponse = { labels: string[]; values: number[] };
type StreamPoint = { label: string; value: number };

const palette = ["#7167f9", "#2bc48a", "#f6b84b", "#e56b8d"];

function baseOption(title: string): EChartsOption {
  return {
    title: { text: title, textStyle: { fontSize: 14, fontWeight: 600, color: "#19213d" } },
    tooltip: { trigger: "axis" },
    grid: { left: 42, right: 20, top: 48, bottom: 32 },
    xAxis: { type: "category", boundaryGap: false, axisLine: { lineStyle: { color: "#dce0ea" } } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#eef0f6" } } },
  };
}

type ChartCardProps = {
  number: string;
  title: string;
  note: string;
  children: React.ReactNode;
  className?: string;
};

function ChartCard({ number, title, note, children, className = "" }: ChartCardProps) {
  return <section className={`chart-card ${className}`}>
    <div className="card-heading"><span>{number}</span><div><h2>{title}</h2><p>{note}</p></div></div>
    {children}
  </section>;
}

function ReusableChart({ title, labels, values, color = palette[0] }: { title: string; labels: string[]; values: number[]; color?: string }) {
  const option = useMemo<EChartsOption>(() => ({
    ...baseOption(title),
    xAxis: { ...baseOption(title).xAxis as object, data: labels },
    series: [{ type: "line", data: values, smooth: true, symbolSize: 7, lineStyle: { width: 3, color }, itemStyle: { color }, areaStyle: { color: `${color}22` } }],
  }), [title, labels, values, color]);
  return <ReactECharts option={option} style={{ height: 245, width: "100%" }} />;
}

export default function App() {
  const [visitors, setVisitors] = useState(58);
  const [sales, setSales] = useState<SalesResponse | null>(null);
  const [salesError, setSalesError] = useState("");
  const [cardWidth, setCardWidth] = useState(100);
  const [stream, setStream] = useState<StreamPoint[]>([]);
  const [connected, setConnected] = useState(false);
  const [serverOption, setServerOption] = useState<EChartsOption | null>(null);
  const resizeContainer = useRef<HTMLDivElement>(null);

  const basicOption = useMemo<EChartsOption>(() => ({
    ...baseOption("Weekly activity"),
    xAxis: { ...baseOption("").xAxis as object, data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
    series: [{ type: "bar", data: [32, 48, 36, 58, 42, 64, 52], barWidth: 20, itemStyle: { color: palette[0], borderRadius: [5, 5, 0, 0] } }],
  }), []);

  const stateOption = useMemo<EChartsOption>(() => ({
    ...baseOption("Live state value"),
    xAxis: { ...baseOption("").xAxis as object, data: ["08:00", "10:00", "12:00", "14:00", "16:00"] },
    series: [{ type: "line", smooth: true, data: [34, 48, visitors - 10, visitors, visitors + 6], lineStyle: { color: palette[1], width: 3 }, itemStyle: { color: palette[1] }, areaStyle: { color: "#2bc48a25" } }],
  }), [visitors]);

  const streamOption = useMemo<EChartsOption>(() => ({
    ...baseOption("Events from server"),
    xAxis: { ...baseOption("").xAxis as object, data: stream.map((point) => point.label) },
    series: [{ type: "line", smooth: true, showSymbol: false, data: stream.map((point) => point.value), lineStyle: { color: palette[3], width: 3 }, areaStyle: { color: "#e56b8d20" } }],
  }), [stream]);

  useEffect(() => {
    fetch("/api/sales").then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load sales data")))
      .then(setSales).catch((error: Error) => setSalesError(error.message));
    fetch("/api/chart-option").then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load chart configuration")))
      .then(setServerOption).catch(() => undefined);
  }, []);

  useEffect(() => {
    const eventSource = new EventSource("/api/stream");
    eventSource.onopen = () => setConnected(true);
    eventSource.onmessage = (event) => setStream((current) => [...current, JSON.parse(event.data) as StreamPoint].slice(-12));
    eventSource.onerror = () => setConnected(false);
    return () => eventSource.close();
  }, []);

  useEffect(() => {
    const observer = new ResizeObserver(() => undefined);
    if (resizeContainer.current) observer.observe(resizeContainer.current);
    return () => observer.disconnect();
  }, []);

  return <main>
    <header><div><p className="eyebrow">ECharts + React + FastAPI</p><h1>Chart pattern playground</h1><p className="subtitle">Eight small, practical examples using a shared React chart foundation.</p></div><div className="status"><i /> FastAPI connected</div></header>
    <div className="grid">
      <ChartCard number="01" title="Basic chart component" note="A static EChartsOption rendered through React."><ReactECharts option={basicOption} style={{ height: 245 }} /></ChartCard>
      <ChartCard number="02" title="Update with React state" note="The option recomputes when component state changes."><div className="metric"><strong>{visitors}</strong><button onClick={() => setVisitors((value) => value + 8)}>Add visitors</button></div><ReactECharts option={stateOption} style={{ height: 190 }} /></ChartCard>
      <ChartCard number="03" title="Fetch backend data" note="Data from GET /api/sales becomes a chart series.">{salesError ? <p className="error">{salesError}</p> : sales ? <ReusableChart title="Monthly sales" labels={sales.labels} values={sales.values} color={palette[2]} /> : <p className="loading">Loading chart data…</p>}</ChartCard>
      <ChartCard number="04" title="Resizable chart component" note="Drag the control to resize its parent container."><label className="range-label">Width <input type="range" min="55" max="100" value={cardWidth} onChange={(event) => setCardWidth(Number(event.target.value))} /> {cardWidth}%</label><div ref={resizeContainer} className="resizable-chart" style={{ width: `${cardWidth}%` }}><ReusableChart title="Container-aware chart" labels={["Q1", "Q2", "Q3", "Q4"]} values={[24, 42, 31, 61]} color={palette[3]} /></div></ChartCard>
      <ChartCard number="05" title="Responsive chart" note="It fills the available grid column and reacts to viewport changes."><div className="responsive-wrap"><ReusableChart title="Viewport friendly" labels={["Mobile", "Tablet", "Desktop"]} values={[44, 61, 86]} color={palette[1]} /></div></ChartCard>
      <ChartCard number="06" title="Reusable chart component" note="One typed component, varied data and styling."><ReusableChart title="Team velocity" labels={["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4"]} values={[18, 29, 25, 39]} /></ChartCard>
      <ChartCard number="07" title="Fetch EChartsOption directly" note="FastAPI returns a ready-to-render ECharts option.">{serverOption ? <ReactECharts option={serverOption} style={{ height: 245 }} /> : <p className="loading">Loading server-side option…</p>}</ChartCard>
      <ChartCard number="08" title="Streaming updates" note="Server-Sent Events append live data points."><div className="stream-status"><i className={connected ? "on" : ""} /> {connected ? "Streaming" : "Reconnecting…"}</div><ReactECharts option={streamOption} style={{ height: 215 }} /></ChartCard>
    </div>
  </main>;
}
