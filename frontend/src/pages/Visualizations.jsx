import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Image,
  Play,
  Download,
  Maximize2
} from "lucide-react";
import API from "../utils/api";
import { useToast } from "../components/useToast";
import { safeApiCall } from "../utils/asyncHandler";

const ReactECharts = lazy(() => import("echarts-for-react"));

/* ─── FullAIML Design System Color Palette ─── */
const CHART_COLORS = {
  primary: "#2F6B4A",
  primaryDark: "#26593D",
  tint: "#CFE2CB",
  orange: "#F5A63D",
  blue: "#3B6FD4",
  danger: "#D9534F",
  text: "#1F2A24",
  muted: "#6B756F",
  border: "#E4E1D6",
  soft: "#FBFAF5",
  surface: "#FFFFFF",
};

/* ─── Heatmap (ECharts) ─── */
const HeatmapChart = ({ data, columns }) => {
  const heatmapData = data.reduce((acc, item) => {
    const xIndex = columns.indexOf(item.x);
    const yIndex = columns.indexOf(item.y);
    if (xIndex !== -1 && yIndex !== -1) {
      acc.push([xIndex, yIndex, Number(item.value.toFixed(2))]);
    }
    return acc;
  }, []);

  const option = {
    tooltip: {
      position: "top",
      backgroundColor: "#ffffff",
      borderColor: CHART_COLORS.border,
      borderWidth: 1,
      padding: 10,
      textStyle: { color: CHART_COLORS.text, fontFamily: "var(--font)", fontSize: 12 },
      formatter: function (params) {
        const xName = columns[params.value[0]];
        const yName = columns[params.value[1]];
        const val = params.value[2];
        return `<div style="font-weight:600;color:${CHART_COLORS.primary}">${xName} × ${yName}</div>
                <div style="margin-top:2px;color:${CHART_COLORS.text}">Correlation: <b>${val}</b></div>`;
      },
    },
    grid: { top: 40, bottom: 90, left: 110, right: 80 },
    xAxis: {
      type: "category",
      data: columns,
      axisLabel: { color: CHART_COLORS.muted, interval: 0, rotate: 35, fontSize: 11 },
      axisLine: { lineStyle: { color: CHART_COLORS.border } },
    },
    yAxis: {
      type: "category",
      data: columns,
      axisLabel: { color: CHART_COLORS.muted, fontSize: 11 },
      axisLine: { lineStyle: { color: CHART_COLORS.border } },
    },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: "vertical",
      right: 0,
      top: "center",
      itemHeight: 180,
      inRange: {
        color: [CHART_COLORS.danger, "#FFFFFF", CHART_COLORS.primary],
      },
      textStyle: { color: CHART_COLORS.muted },
    },
    series: [
      {
        name: "Correlation",
        type: "heatmap",
        data: heatmapData,
        label: {
          show: columns.length < 15,
          color: CHART_COLORS.text,
          fontSize: 10,
        },
        itemStyle: {
          borderRadius: 4,
          borderColor: "#FFFFFF",
          borderWidth: 1,
        },
      },
    ],
  };

  const chartHeight = Math.max(450, columns.length * 36 + 120);

  return (
    <div style={{ width: "100%", height: `${chartHeight}px` }}>
      <ReactECharts
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "canvas" }}
      />
    </div>
  );
};

/* ─── Chart Renderer ─── */
const ChartRenderer = ({ chartResult }) => {
  if (!chartResult) return null;
  const { chart_type, data } = chartResult;

  switch (chart_type) {
    case "histogram": {
      const option = {
        tooltip: {
          trigger: "axis",
          backgroundColor: "#ffffff",
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          textStyle: { color: CHART_COLORS.text, fontSize: 12 },
          axisPointer: { type: "shadow" },
        },
        grid: { top: 30, right: 30, left: 60, bottom: 60 },
        xAxis: {
          type: "category",
          data: data.map((d) => d.bin),
          axisLabel: { color: CHART_COLORS.muted, fontSize: 11, rotate: 25 },
          axisLine: { lineStyle: { color: CHART_COLORS.border } },
        },
        yAxis: {
          type: "value",
          name: "Frequency",
          nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11 },
          axisLabel: { color: CHART_COLORS.muted, fontSize: 11 },
          splitLine: { lineStyle: { color: "#F0EEE4" } },
        },
        series: [
          {
            name: "Count",
            type: "bar",
            data: data.map((d) => d.count),
            itemStyle: {
              color: CHART_COLORS.primary,
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
      };
      return (
        <ReactECharts
          option={option}
          style={{ height: "420px", width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      );
    }

    case "bar": {
      const option = {
        tooltip: {
          trigger: "axis",
          backgroundColor: "#ffffff",
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          textStyle: { color: CHART_COLORS.text, fontSize: 12 },
        },
        grid: { top: 30, right: 30, left: 60, bottom: 70 },
        xAxis: {
          type: "category",
          data: data.map((d) => d.label || "[empty]"),
          axisLabel: { color: CHART_COLORS.muted, fontSize: 11, rotate: 30 },
          axisLine: { lineStyle: { color: CHART_COLORS.border } },
        },
        yAxis: {
          type: "value",
          name: "Count",
          nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11 },
          axisLabel: { color: CHART_COLORS.muted, fontSize: 11 },
          splitLine: { lineStyle: { color: "#F0EEE4" } },
        },
        series: [
          {
            name: "Count",
            type: "bar",
            data: data.map((d) => d.count),
            itemStyle: {
              color: CHART_COLORS.orange,
              borderRadius: [4, 4, 0, 0],
            },
          },
        ],
      };
      return (
        <ReactECharts
          option={option}
          style={{ height: "420px", width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      );
    }

    case "scatter": {
      const points = data.map((d) => [d.x, d.y]);
      const option = {
        tooltip: {
          trigger: "item",
          backgroundColor: "#ffffff",
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          textStyle: { color: CHART_COLORS.text, fontSize: 12 },
          formatter: (p) => `X: ${p.data[0]}<br/>Y: ${p.data[1]}`,
        },
        grid: { top: 30, right: 30, left: 60, bottom: 60 },
        xAxis: {
          type: "value",
          name: chartResult.x_column,
          nameLocation: "middle",
          nameGap: 30,
          nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11 },
          axisLabel: { color: CHART_COLORS.muted, fontSize: 11 },
          splitLine: { lineStyle: { color: "#F0EEE4" } },
        },
        yAxis: {
          type: "value",
          name: chartResult.y_column,
          nameTextStyle: { color: CHART_COLORS.muted, fontSize: 11 },
          axisLabel: { color: CHART_COLORS.muted, fontSize: 11 },
          splitLine: { lineStyle: { color: "#F0EEE4" } },
        },
        series: [
          {
            type: "scatter",
            symbolSize: 7,
            data: points,
            itemStyle: {
              color: CHART_COLORS.blue,
              opacity: 0.7,
            },
          },
        ],
      };
      return (
        <ReactECharts
          option={option}
          style={{ height: "420px", width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      );
    }

    case "heatmap": {
      return <HeatmapChart data={chartResult.data} columns={chartResult.columns} />;
    }

    case "boxplot": {
      const d = chartResult.data;
      const option = {
        tooltip: {
          trigger: "item",
          backgroundColor: "#ffffff",
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          textStyle: { color: CHART_COLORS.text, fontSize: 12 },
          formatter: () =>
            `Min: ${d.min?.toFixed(2)}<br/>Q1: ${d.q1?.toFixed(2)}<br/>Median: ${d.median?.toFixed(2)}<br/>Q3: ${d.q3?.toFixed(2)}<br/>Max: ${d.max?.toFixed(2)}`,
        },
        grid: { top: 30, right: 30, left: 60, bottom: 60 },
        xAxis: {
          type: "category",
          data: [chartResult.column],
          axisLabel: { color: CHART_COLORS.text, fontWeight: "bold" },
          axisLine: { lineStyle: { color: CHART_COLORS.border } },
        },
        yAxis: {
          type: "value",
          axisLabel: { color: CHART_COLORS.muted },
          splitLine: { lineStyle: { color: "#F0EEE4" } },
        },
        series: [
          {
            name: "Boxplot",
            type: "boxplot",
            data: [[d.min, d.q1, d.median, d.q3, d.max]],
            itemStyle: {
              color: "#E4F0E0",
              borderColor: CHART_COLORS.primary,
              borderWidth: 2,
            },
          },
        ],
      };
      return (
        <ReactECharts
          option={option}
          style={{ height: "420px", width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      );
    }

    default:
      return null;
  }
};

/* ══════════════════════════════════════════════
   Visualizations Component
   ══════════════════════════════════════════════ */
const Visualizations = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const queryDatasetId = searchParams.get("dataset_id");

  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(queryDatasetId || "");
  const [plotType, setPlotType] = useState("histogram");

  const [columns, setColumns] = useState([]);
  const [column, setColumn] = useState("");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");

  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState("");

  const [chartResult, setChartResult] = useState(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      setLoadingDatasets(true);
      const [response, err] = await safeApiCall(API.get("/datasets/"));
      if (err) {
        setError("Failed to fetch datasets list.");
      } else if (response) {
        setDatasets(response.data);
        if (response.data.length > 0) {
          setSelectedDatasetId((prev) => prev || response.data[0].id.toString());
        }
      }
      setLoadingDatasets(false);
    };
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (!selectedDatasetId) {
      setColumns([]);
      return;
    }
    const fetchCols = async () => {
      setLoadingColumns(true);
      setError("");
      const [response, err] = await safeApiCall(API.get(`/analysis/${selectedDatasetId}/summary`));
      if (err) {
        setError("Failed to fetch dataset columns.");
      } else if (response) {
        const colList = Object.keys(response.data.summary);
        setColumns(colList);
        if (colList.length > 0) {
          setColumn(colList[0]);
          setXColumn(colList[0]);
          setYColumn(colList.length > 1 ? colList[1] : colList[0]);
        }
      }
      setLoadingColumns(false);
    };
    fetchCols();
  }, [selectedDatasetId]);

  const handleDatasetChange = (e) => {
    setSelectedDatasetId(e.target.value);
    setChartResult(null);
  };

  const handleGeneratePlot = async (e) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      setError("Please select a dataset.");
      return;
    }

    setLoadingChart(true);
    setError("");

    let requestPromise;
    if (plotType === "histogram") {
      requestPromise = API.get(`/visualizations/${selectedDatasetId}/histogram`, {
        params: { column },
      });
    } else if (plotType === "bar") {
      requestPromise = API.get(`/visualizations/${selectedDatasetId}/bar`, {
        params: { column },
      });
    } else if (plotType === "scatter") {
      requestPromise = API.get(`/visualizations/${selectedDatasetId}/scatter`, {
        params: { x_column: xColumn, y_column: yColumn },
      });
    } else if (plotType === "heatmap") {
      requestPromise = API.get(`/visualizations/${selectedDatasetId}/heatmap`);
    } else if (plotType === "boxplot") {
      requestPromise = API.get(`/visualizations/${selectedDatasetId}/boxplot`, {
        params: { column },
      });
    }

    if (!requestPromise) {
      setLoadingChart(false);
      return;
    }

    const [response, err] = await safeApiCall(requestPromise);
    if (err) {
      setError(
        err.response?.data?.detail || "Failed to generate visualization. Verify input columns datatype compatibility."
      );
    } else if (response) {
      setChartResult(response.data);
      addToast("Visualization Rendered", "Your plot has been generated successfully.", "success");
    }
    setLoadingChart(false);
  };

  const getPlotTitle = () => {
    if (!chartResult) return "Visualization Render Area";
    if (chartResult.chart_type === "histogram") return `${chartResult.column} (Histogram)`;
    if (chartResult.chart_type === "bar") return `${chartResult.column} (Bar Chart)`;
    if (chartResult.chart_type === "scatter") return `${chartResult.x_column} vs ${chartResult.y_column} (Scatter Plot)`;
    if (chartResult.chart_type === "heatmap") return "Correlation Heatmap";
    if (chartResult.chart_type === "boxplot") return `${chartResult.column} (Box Plot)`;
    return "Rendered Plot";
  };

  return (
    <div className="view">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <h1>Visual Studio</h1>
          <p>Generate, render, and export graphical reports from your datasets</p>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>
      </div>

      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid-side">
        {/* Left Side: Setup Card */}
        <div className="card">
          <h3>Dataset Source</h3>
          {loadingDatasets ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0" }}>
              <Loader2 className="animate-spin" size={16} />
              <span>Loading datasets…</span>
            </div>
          ) : (
            <select
              className="select"
              style={{ width: "100%", margin: "10px 0 16px" }}
              value={selectedDatasetId}
              onChange={handleDatasetChange}
              disabled={loadingChart}
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename}
                </option>
              ))}
            </select>
          )}

          <span className="lbl">Visualization Type</span>
          <div className="seg" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { id: "histogram", label: "Histogram" },
              { id: "bar", label: "Bar Chart" },
              { id: "scatter", label: "Scatter Plot" },
              { id: "heatmap", label: "Heatmap" },
              { id: "boxplot", label: "Box Plot" },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                className={plotType === type.id ? "on" : ""}
                onClick={() => {
                  setPlotType(type.id);
                  setChartResult(null);
                }}
                disabled={loadingChart || loadingColumns}
              >
                {type.label}
              </button>
            ))}
          </div>

          <span className="lbl" style={{ marginTop: 20 }}>Plot Configuration</span>

          {loadingColumns ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--muted)", margin: "10px 0" }}>
              <Loader2 className="animate-spin" size={16} />
              <span>Loading columns…</span>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              {(plotType === "histogram" || plotType === "bar" || plotType === "boxplot") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <small style={{ color: "var(--muted)", fontWeight: 600 }}>Target Column</small>
                  <select
                    className="select"
                    style={{ width: "100%", minWidth: 0 }}
                    value={column}
                    onChange={(e) => setColumn(e.target.value)}
                    disabled={loadingChart}
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {plotType === "scatter" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <small style={{ color: "var(--muted)", fontWeight: 600 }}>X-axis</small>
                    <select
                      className="select"
                      style={{ width: "100%", minWidth: 0 }}
                      value={xColumn}
                      onChange={(e) => setXColumn(e.target.value)}
                      disabled={loadingChart}
                    >
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <small style={{ color: "var(--muted)", fontWeight: 600 }}>Y-axis</small>
                    <select
                      className="select"
                      style={{ width: "100%", minWidth: 0 }}
                      value={yColumn}
                      onChange={(e) => setYColumn(e.target.value)}
                      disabled={loadingChart}
                    >
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {plotType === "heatmap" && (
                <p className="sub" style={{ background: "var(--soft)", padding: 12, borderRadius: "var(--rs)", border: "1px solid var(--border)" }}>
                  Heatmaps automatically compute correlations across all numeric variables in the dataset.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 22 }}
            onClick={handleGeneratePlot}
            disabled={loadingChart || loadingColumns || !selectedDatasetId}
          >
            {loadingChart ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Rendering…</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Render Visualization</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Display Card matching fullaiml.html */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <h3>{getPlotTitle()}</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: "5px 12px", fontSize: 12 }}
                onClick={() => addToast("Info", "Chart image download ready via right-click save.", "info")}
              >
                <Download size={14} /> Download
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: "5px 12px", fontSize: 12 }}
                onClick={() => {
                  const elem = document.getElementById("chart-display-area");
                  if (elem && elem.requestFullscreen) elem.requestFullscreen();
                }}
              >
                <Maximize2 size={14} /> Full Screen
              </button>
            </div>
          </div>

          <div id="chart-display-area">
            {loadingChart ? (
              <div className="empty" style={{ padding: "80px 20px" }}>
                <Loader2 className="animate-spin" size={40} style={{ margin: "0 auto 14px", color: "var(--primary)" }} />
                <h3>Rendering Visualization…</h3>
                <p>Aggregating data points and compiling plot graphics.</p>
              </div>
            ) : chartResult ? (
              <div>
                <Suspense fallback={
                  <div className="empty">
                    <Loader2 className="animate-spin" size={32} />
                  </div>
                }>
                  <ChartRenderer chartResult={chartResult} />
                </Suspense>

                {/* Attributes & Metrics Table */}
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                  <h4 style={{ fontSize: 13, marginBottom: 10, color: "var(--muted)" }}>Plot Summary &amp; Metrics</h4>
                  <div className="tbl-wrap">
                    <table>
                      <tbody>
                        <tr>
                          <td><b>Chart Type</b></td>
                          <td>{chartResult.chart_type?.toUpperCase()}</td>
                        </tr>
                        {chartResult.column && (
                          <tr>
                            <td><b>Target Column</b></td>
                            <td>{chartResult.column}</td>
                          </tr>
                        )}
                        {chartResult.x_column && (
                          <tr>
                            <td><b>X-Axis Column</b></td>
                            <td>{chartResult.x_column}</td>
                          </tr>
                        )}
                        {chartResult.y_column && (
                          <tr>
                            <td><b>Y-Axis Column</b></td>
                            <td>{chartResult.y_column}</td>
                          </tr>
                        )}
                        {chartResult.chart_type === "histogram" && chartResult.data && (
                          <tr>
                            <td><b>Total Records</b></td>
                            <td>{chartResult.data.reduce((s, d) => s + d.count, 0).toLocaleString()}</td>
                          </tr>
                        )}
                        {chartResult.chart_type === "scatter" && chartResult.data && (
                          <tr>
                            <td><b>Data Points</b></td>
                            <td>{chartResult.data.length.toLocaleString()}</td>
                          </tr>
                        )}
                        {chartResult.chart_type === "heatmap" && chartResult.columns && (
                          <tr>
                            <td><b>Numeric Features</b></td>
                            <td>{chartResult.columns.length}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty" style={{ padding: "80px 20px" }}>
                <Image size={48} style={{ margin: "0 auto 12px", color: "var(--muted)", opacity: 0.5 }} />
                <h3>No Active Visualization</h3>
                <p>Select your dataset and parameters on the left, then click "Render Visualization".</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizations;
