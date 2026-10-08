import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Play,
  Clock,
  Zap,
  XCircle,
  Database,
  Cpu,
  BarChart,
  Target
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import API from "../utils/api";
import { useTrainingJob } from "../components/TrainingJobContext";
import { safeApiCall } from "../utils/asyncHandler";

/* ── Status badge component ── */
const StatusBadge = ({ status }) => {
  const icons = {
    pending: <Clock size={12} />,
    running: <Zap size={12} />,
    completed: <CheckCircle size={12} />,
    failed: <XCircle size={12} />,
  };

  return (
    <span
      className="badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: status === "completed" ? "#DDEBD9" : status === "failed" ? "#FADDDA" : "#DEE7F8",
        color: status === "completed" ? "var(--primary)" : status === "failed" ? "var(--danger)" : "var(--blue)",
      }}
    >
      {icons[status] || <Clock size={12} />}
      {status?.toUpperCase()}
    </span>
  );
};

/* ── Stepper Component matching fullaiml.html ── */
const TRAINING_STEPS = [
  { threshold: 0, label: "Queued" },
  { threshold: 10, label: "Started" },
  { threshold: 30, label: "Preprocessing" },
  { threshold: 70, label: "Fitting Model" },
  { threshold: 100, label: "Completed" },
];

const FullAIMLStepper = ({ progress }) => {
  return (
    <div className="stepper" style={{ "--p": `${progress}%`, margin: "20px 0" }}>
      {TRAINING_STEPS.map((step, i) => {
        const isDone = progress > step.threshold || (progress === 100 && step.threshold === 100);
        const isNow = !isDone && progress >= (TRAINING_STEPS[i - 1]?.threshold ?? 0);
        return (
          <div key={step.label} className={`step ${isDone ? "done" : isNow ? "now" : ""}`}>
            <i>{isDone ? "✓" : i + 1}</i>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ── Confusion Matrix chart ── */
const ConfusionMatrixChart = ({ trainResult }) => {
  const option = useMemo(() => {
    const cm = trainResult?.metrics?.confusion_matrix;
    if (!cm) return null;
    const labelCount = cm.labels.length;
    return {
      tooltip: {
        backgroundColor: "#ffffff",
        borderColor: "var(--border)",
        borderWidth: 1,
        textStyle: { color: "var(--text)" },
        formatter: (p) => `Actual: ${p.data[1]}<br/>Predicted: ${p.data[0]}<br/>Count: <b>${p.data[2]}</b>`,
      },
      grid: { top: 30, right: 30, bottom: 60, left: 70 },
      xAxis: {
        type: "category",
        data: cm.labels,
        name: "Predicted",
        nameLocation: "center",
        nameGap: 30,
        nameTextStyle: { color: "var(--muted)", fontSize: 11 },
        axisLabel: { color: "var(--muted)", fontSize: 11 },
        axisLine: { lineStyle: { color: "var(--border)" } },
        splitLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: cm.labels,
        name: "Actual",
        nameLocation: "center",
        nameGap: 45,
        nameTextStyle: { color: "var(--muted)", fontSize: 11 },
        axisLabel: { color: "var(--muted)", fontSize: 11 },
        axisLine: { lineStyle: { color: "var(--border)" } },
        splitLine: { show: false },
      },
      visualMap: {
        min: 0,
        max: Math.max(...cm.heatmap_data.map((d) => d.value)),
        calculable: true,
        orient: "vertical",
        right: 0,
        top: "center",
        inRange: { color: ["#FBFAF5", "#CFE2CB", "#2F6B4A"] },
        show: false,
      },
      series: [
        {
          type: "heatmap",
          data: cm.heatmap_data.map((d) => [d.predicted, d.actual, d.value]),
          label: {
            show: true,
            color: "var(--text)",
            fontSize: labelCount > 15 ? 9 : 12,
            fontWeight: 600,
            formatter: (p) => (p.data[2] === 0 ? "" : p.data[2]),
          },
          itemStyle: {
            borderWidth: 1,
            borderColor: "#ffffff",
            borderRadius: 4,
          },
        },
      ],
    };
  }, [trainResult]);

  const labelCount = trainResult?.metrics?.confusion_matrix?.labels?.length || 0;
  const chartHeight = labelCount > 15 ? Math.max(380, labelCount * 18) : 320;

  if (!option) return null;
  return <ReactECharts style={{ height: chartHeight }} option={option} notMerge />;
};

/* ── Actual vs Predicted chart ── */
const ActualVsPredictedChart = ({ trainResult }) => {
  const option = useMemo(() => {
    const pts = trainResult?.metrics?.prediction_quality?.actual_vs_predicted;
    if (!pts) return null;
    const allVals = pts.flatMap((p) => [p.actual, p.predicted]);
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const pad = (maxV - minV) * 0.08 || 1;
    return {
      tooltip: {
        backgroundColor: "#ffffff",
        borderColor: "var(--border)",
        borderWidth: 1,
        textStyle: { color: "var(--text)" },
        formatter: (p) => `Actual: ${p.data[0].toFixed(3)}<br/>Predicted: ${p.data[1].toFixed(3)}`,
      },
      grid: { top: 30, right: 30, bottom: 50, left: 60 },
      xAxis: {
        name: "Actual",
        nameLocation: "center",
        nameGap: 30,
        nameTextStyle: { color: "var(--muted)", fontSize: 11 },
        min: minV - pad,
        max: maxV + pad,
        axisLabel: { color: "var(--muted)", fontSize: 11 },
        axisLine: { lineStyle: { color: "var(--border)" } },
        splitLine: { lineStyle: { color: "#F0EEE4" } },
      },
      yAxis: {
        name: "Predicted",
        nameLocation: "center",
        nameGap: 40,
        nameTextStyle: { color: "var(--muted)", fontSize: 11 },
        min: minV - pad,
        max: maxV + pad,
        axisLabel: { color: "var(--muted)", fontSize: 11 },
        axisLine: { lineStyle: { color: "var(--border)" } },
        splitLine: { lineStyle: { color: "#F0EEE4" } },
      },
      series: [
        {
          type: "scatter",
          data: pts.map((p) => [p.actual, p.predicted]),
          symbolSize: 7,
          itemStyle: { color: "var(--blue)", opacity: 0.75 },
        },
        {
          type: "line",
          data: [
            [minV - pad, minV - pad],
            [maxV + pad, maxV + pad],
          ],
          lineStyle: { color: "var(--primary)", type: "dashed", width: 2 },
          symbol: "none",
          tooltip: { show: false },
        },
      ],
    };
  }, [trainResult]);

  if (!option) return null;
  return <ReactECharts style={{ height: 320 }} option={option} notMerge />;
};

/* ══════════════════════════════════════════════
   ModelTraining Component
   ══════════════════════════════════════════════ */
const ModelTraining = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryDatasetId = searchParams.get("dataset_id");

  const {
    jobProgress,
    jobMessage,
    jobStatus,
    training,
    trainResult,
    trainError,
    formBusy,
    startTrainingJob,
    startNewJob,
  } = useTrainingJob();

  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(queryDatasetId || "");
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [columns, setColumns] = useState([]);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // Form states
  const [modelName, setModelName] = useState("");
  const [targetColumn, setTargetColumn] = useState("");
  const [problemType, setProblemType] = useState("classification");
  const [algorithm, setAlgorithm] = useState("random_forest");
  const [testSize, setTestSize] = useState(0.2);
  const [randomState, setRandomState] = useState(42);

  // Algorithm catalog
  const [algorithms, setAlgorithms] = useState([]);
  const [loadingAlgorithms, setLoadingAlgorithms] = useState(false);
  const [hyperparamValues, setHyperparamValues] = useState({});

  const [error, setError] = useState("");

  const selectedFeatureColumns = columns.filter((col) => col !== targetColumn);

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
    if (!selectedDatasetId) return;
    const fetchColumns = async () => {
      setLoadingColumns(true);
      setError("");
      const [response, err] = await safeApiCall(API.get(`/analysis/${selectedDatasetId}/summary`));
      if (err) {
        setError("Failed to fetch dataset columns.");
      } else if (response) {
        const colList = response.data.column_names || [];
        setColumns(colList);
        if (colList.length > 0) {
          setTargetColumn(colList[colList.length - 1]);
        }
      }
      setLoadingColumns(false);
    };
    fetchColumns();
  }, [selectedDatasetId]);

  const defaultsForAlgorithm = (algoMeta) => {
    if (!algoMeta) return {};
    const values = {};
    for (const field of algoMeta.hyperparameters) {
      values[field.name] = field.default ?? "";
    }
    return values;
  };

  useEffect(() => {
    let cancelled = false;
    const fetchAlgorithms = async () => {
      setLoadingAlgorithms(true);
      const [response, err] = await safeApiCall(
        API.get("/ml/algorithms", { params: { problem_type: problemType } })
      );

      if (cancelled) return;
      if (err) {
        setError("Failed to load available algorithms.");
        setAlgorithms([]);
      } else if (response) {
        const list = response.data.algorithms || [];
        setAlgorithms(list);

        const defaultAlgo = list.some((a) => a.id === "random_forest")
          ? "random_forest"
          : list[0]?.id || "";

        setAlgorithm(defaultAlgo);
        setHyperparamValues(defaultsForAlgorithm(list.find((a) => a.id === defaultAlgo)));
      }
      setLoadingAlgorithms(false);
    };

    fetchAlgorithms();
    return () => {
      cancelled = true;
    };
  }, [problemType]);

  const selectedAlgoMeta = algorithms.find((a) => a.id === algorithm);

  const handleAlgorithmChange = (e) => {
    const newAlgoId = e.target.value;
    setAlgorithm(newAlgoId);
    setHyperparamValues(defaultsForAlgorithm(algorithms.find((a) => a.id === newAlgoId)));
  };

  const handleHyperparamChange = (fieldName, value) => {
    setHyperparamValues((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleTrainSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDatasetId || !targetColumn || !modelName) {
      setError("Please fill in all required training parameters.");
      return;
    }

    if (selectedFeatureColumns.length === 0) {
      setError("Select a dataset with at least one input column besides the target.");
      return;
    }

    setError("");

    const hyperparameters = {};
    if (selectedAlgoMeta) {
      for (const field of selectedAlgoMeta.hyperparameters) {
        const raw = hyperparamValues[field.name];
        if (raw === "" || raw === undefined || raw === null) {
          if (!field.optional) hyperparameters[field.name] = field.default;
          continue;
        }
        if (field.type === "int") hyperparameters[field.name] = parseInt(raw, 10);
        else if (field.type === "float") hyperparameters[field.name] = parseFloat(raw);
        else hyperparameters[field.name] = raw;
      }
    }

    await startTrainingJob(
      {
        dataset_id: parseInt(selectedDatasetId),
        model_name: modelName,
        algorithm,
        problem_type: problemType,
        target_column: targetColumn,
        test_size: parseFloat(testSize),
        random_state: parseInt(randomState),
        hyperparameters,
      },
      { datasetId: selectedDatasetId, problemType }
    );
  };

  return (
    <div className="view">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <h1>Model Training Studio</h1>
          <p>Configure algorithms, tune hyperparameters, and train ML predictive models</p>
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

      {(error || trainError) && (
        <div className="alert" style={{ marginBottom: 16 }}>
          {error || trainError}
        </div>
      )}

      {/* Grid: 2 Cards Form Layout matching fullaiml.html */}
      <form onSubmit={handleTrainSubmit}>
        <div className="grid2">
          {/* Left Card: Training Settings */}
          <div className="card">
            <h3>Training Settings</h3>
            <p className="sub" style={{ marginBottom: 16 }}>Configure target feature, algorithm, and problem classification</p>

            <span className="lbl" style={{ marginTop: 0 }}>Dataset Source</span>
            {loadingDatasets ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--muted)" }}>
                <Loader2 className="animate-spin" size={14} />
                <span>Loading datasets…</span>
              </div>
            ) : (
              <select
                className="select"
                style={{ width: "100%" }}
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
                disabled={formBusy}
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename} ({d.rows_count} rows)
                  </option>
                ))}
              </select>
            )}

            <span className="lbl">Model Name</span>
            <div className="iw">
              <input
                type="text"
                placeholder="e.g. Customer Churn Prediction Model"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={formBusy}
                required
              />
            </div>

            <span className="lbl">Problem Type</span>
            <div className="seg">
              <button
                type="button"
                className={problemType === "classification" ? "on" : ""}
                onClick={() => setProblemType("classification")}
                disabled={formBusy}
              >
                Classification
              </button>
              <button
                type="button"
                className={problemType === "regression" ? "on" : ""}
                onClick={() => setProblemType("regression")}
                disabled={formBusy}
              >
                Regression
              </button>
            </div>

            <span className="lbl">Target (Y) Column</span>
            {loadingColumns ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--muted)" }}>
                <Loader2 className="animate-spin" size={14} />
                <span>Reading columns…</span>
              </div>
            ) : (
              <select
                className="select"
                style={{ width: "100%" }}
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                disabled={formBusy}
              >
                {columns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            <span className="lbl">Algorithm</span>
            {loadingAlgorithms ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--muted)" }}>
                <Loader2 className="animate-spin" size={14} />
                <span>Loading algorithms…</span>
              </div>
            ) : (
              <select
                className="select"
                style={{ width: "100%" }}
                value={algorithm}
                onChange={handleAlgorithmChange}
                disabled={formBusy}
              >
                {algorithms.map((algo) => (
                  <option key={algo.id} value={algo.id}>
                    {algo.label || algo.name}
                  </option>
                ))}
              </select>
            )}

            {selectedFeatureColumns.length > 0 && (
              <div style={{ marginTop: 14, fontSize: 12, color: "var(--muted)" }}>
                <b>Features used ({selectedFeatureColumns.length}):</b> {selectedFeatureColumns.slice(0, 5).join(", ")}
                {selectedFeatureColumns.length > 5 ? ` + ${selectedFeatureColumns.length - 5} more` : ""}
              </div>
            )}
          </div>

          {/* Right Card: Hyperparameters & Parameters */}
          <div className="card">
            <h3>Hyperparameters &amp; Parameters</h3>
            <p className="sub" style={{ marginBottom: 16 }}>Tune validation split and algorithm hyperparameters</p>

            <span className="lbl" style={{ marginTop: 0 }}>Test Split Size</span>
            <div className="range">
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={testSize}
                onChange={(e) => setTestSize(e.target.value)}
                disabled={formBusy}
              />
              <span className="val">{testSize}</span>
            </div>

            <span className="lbl">Random State</span>
            <div className="iw">
              <input
                type="number"
                value={randomState}
                onChange={(e) => setRandomState(e.target.value)}
                disabled={formBusy}
              />
            </div>

            {/* Dynamic Algorithm Hyperparameters */}
            {selectedAlgoMeta && selectedAlgoMeta.hyperparameters?.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {selectedAlgoMeta.hyperparameters.map((field) => (
                  <div key={field.name} style={{ marginBottom: 10 }}>
                    <span className="lbl" style={{ margin: "6px 0 4px" }}>{field.label}</span>
                    {field.type === "select" ? (
                      <select
                        className="select"
                        style={{ width: "100%" }}
                        value={hyperparamValues[field.name] ?? field.default}
                        onChange={(e) => handleHyperparamChange(field.name, e.target.value)}
                        disabled={formBusy}
                      >
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="iw">
                        <input
                          type="number"
                          min={field.min}
                          max={field.max}
                          step={field.type === "float" ? field.step || 0.01 : 1}
                          placeholder={field.optional ? "Default / Auto" : undefined}
                          value={hyperparamValues[field.name] ?? ""}
                          onChange={(e) => handleHyperparamChange(field.name, e.target.value)}
                          disabled={formBusy}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ marginTop: 24 }}
              disabled={formBusy || loadingColumns || !selectedDatasetId}
            >
              {training ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Training in Progress…</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Start Training</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Training Progress Card matching fullaiml.html */}
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3>Training Progress</h3>
            <p className="sub">{jobMessage || "Configure settings above to commence training pipeline."}</p>
          </div>
          {jobStatus && <StatusBadge status={jobStatus} />}
        </div>

        <FullAIMLStepper progress={jobProgress} />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="pbar">
            <i style={{ width: `${jobProgress}%`, background: "var(--primary)" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: "right" }}>{jobProgress}%</span>
        </div>
      </div>

      {/* Results View when Model Finishes */}
      {trainResult && (
        <div style={{ marginTop: 20 }}>
          <div className="ready">
            <span className="check-ic"><CheckCircle size={20} /></span>
            <div style={{ flex: 1 }}>
              <b>Model Training Completed Successfully!</b>
              <div className="sub">{trainResult.message}</div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={startNewJob}
            >
              Train Another Model
            </button>
          </div>

          {/* Validation Metrics 4-Box Stats matching fullaiml.html */}
          <div className="stats" style={{ marginTop: 16 }}>
            {trainResult.problem_type === "classification" ? (
              <>
                <div className="card stat">
                  <div className="ic g"><BarChart size={20} /></div>
                  <div>
                    <b>{((trainResult.metrics.accuracy ?? 0) * 100).toFixed(1)}%</b>
                    <span>Accuracy</span>
                  </div>
                </div>
                <div className="card stat">
                  <div className="ic o"><Target size={20} /></div>
                  <div>
                    <b>{((trainResult.metrics.precision ?? 0) * 100).toFixed(1)}%</b>
                    <span>Precision</span>
                  </div>
                </div>
                <div className="card stat">
                  <div className="ic b"><Target size={20} /></div>
                  <div>
                    <b>{((trainResult.metrics.recall ?? 0) * 100).toFixed(1)}%</b>
                    <span>Recall</span>
                  </div>
                </div>
                <div className="card stat">
                  <div className="ic r"><BarChart size={20} /></div>
                  <div>
                    <b>{((trainResult.metrics.f1_score ?? 0) * 100).toFixed(1)}%</b>
                    <span>F1 Score</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="card stat">
                  <div className="ic g"><BarChart size={20} /></div>
                  <div>
                    <b>{trainResult.metrics.r2_score?.toFixed(4) ?? "-"}</b>
                    <span>R² Score</span>
                  </div>
                </div>
                <div className="card stat">
                  <div className="ic o"><Target size={20} /></div>
                  <div>
                    <b>{trainResult.metrics.rmse?.toFixed(4) ?? "-"}</b>
                    <span>RMSE</span>
                  </div>
                </div>
                <div className="card stat">
                  <div className="ic b"><Target size={20} /></div>
                  <div>
                    <b>{trainResult.metrics.mae?.toFixed(4) ?? "-"}</b>
                    <span>MAE</span>
                  </div>
                </div>
                <div className="card stat">
                  <div className="ic r"><BarChart size={20} /></div>
                  <div>
                    <b>{trainResult.metrics.mse?.toFixed(4) ?? "-"}</b>
                    <span>MSE</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Chart Section */}
          <div className="grid2" style={{ marginTop: 16 }}>
            {trainResult.metrics.confusion_matrix && (
              <div className="card">
                <h3>Confusion Matrix</h3>
                <p className="sub" style={{ marginBottom: 12 }}>Predicted versus actual class distributions</p>
                <ConfusionMatrixChart trainResult={trainResult} />
              </div>
            )}

            {trainResult.metrics.prediction_quality?.actual_vs_predicted && (
              <div className="card">
                <h3>Actual vs Predicted</h3>
                <p className="sub" style={{ marginBottom: 12 }}>Regression target alignment along ideal diagonal</p>
                <ActualVsPredictedChart trainResult={trainResult} />
              </div>
            )}

            <div className="card">
              <h3>Model Artifact Details</h3>
              <p className="sub" style={{ marginBottom: 12 }}>Saved artifact metadata</p>
              <div className="tbl-wrap">
                <table>
                  <tbody>
                    <tr><td><b>Model Name</b></td><td>{trainResult.model_name}</td></tr>
                    <tr><td><b>Algorithm</b></td><td>{trainResult.algorithm}</td></tr>
                    <tr><td><b>Problem Type</b></td><td>{trainResult.problem_type}</td></tr>
                    <tr><td><b>Target Column</b></td><td>{trainResult.target_column}</td></tr>
                    <tr><td><b>Model ID</b></td><td>#{trainResult.model_id}</td></tr>
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-block"
                style={{ marginTop: 14 }}
                onClick={() => navigate("/predictions")}
              >
                Go to Predictions →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelTraining;
