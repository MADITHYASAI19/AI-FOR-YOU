import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  BrainCircuit,
  Cloud,
  Download,
  Star,
  CheckCircle,
  AlertCircle,
  Play
} from "lucide-react";
import API from "../utils/api";
import { useToast } from "../components/useToast";
import { safeApiCall } from "../utils/asyncHandler";
import Papa from "papaparse";

/* ── Helper: determine best model ── */
function findBestModel(models) {
  if (!models || models.length === 0) return null;
  let best = null;
  let bestScore = -Infinity;

  for (const m of models) {
    const metrics = m.metrics || {};
    let score;
    if (m.problem_type === "classification") {
      score = metrics.f1_score ?? metrics.accuracy ?? -1;
    } else {
      score = metrics.r2_score ?? -1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

const Predictions = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("single");

  // Selection state
  const [datasets, setDatasets] = useState([]);
  const [datasetId, setDatasetId] = useState("");
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);

  // Input state
  const [inputMode, setInputMode] = useState("form"); // 'form' | 'json'
  const [jsonInput, setJsonInput] = useState("{\n  \n}");
  const [formValues, setFormValues] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [schemaColumns, setSchemaColumns] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Result & History state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [batchShowAll, setBatchShowAll] = useState(false);

  const bestModel = useMemo(() => findBestModel(models), [models]);

  useEffect(() => {
    const fetchDatasets = async () => {
      const [res] = await safeApiCall(API.get("/datasets/"));
      if (res && res.data) {
        setDatasets(res.data);
        if (res.data.length > 0) {
          setDatasetId(res.data[0].id.toString());
        }
      }
    };
    fetchDatasets();
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      if (!datasetId) return;
      setModels([]);
      setModelId("");
      setLoadingModels(true);

      const [res] = await safeApiCall(API.get(`/models/dataset/${datasetId}`));
      if (res && res.data) {
        setModels(res.data);
        const best = findBestModel(res.data);
        if (best) {
          setModelId(best.id.toString());
        } else if (res.data.length > 0) {
          setModelId(res.data[0].id.toString());
        }
      }
      setLoadingModels(false);
    };
    fetchModels();
  }, [datasetId]);

  useEffect(() => {
    if (!modelId) {
      setJsonInput("{\n  \n}");
      setSchemaColumns([]);
      setFormValues({});
      setFormErrors({});
      return;
    }
    const fetchSchema = async () => {
      setLoadingSchema(true);
      const [res] = await safeApiCall(API.get(`/predictions/${modelId}/input-schema`));
      if (res && res.data) {
        const cols = res.data.required_input_columns || [];
        setSchemaColumns(cols);

        const vals = {};
        cols.forEach((col) => {
          vals[col] = "";
        });
        setFormValues(vals);
        setFormErrors({});

        const template = {};
        cols.forEach((col) => {
          template[col] = "";
        });
        setJsonInput(JSON.stringify(template, null, 2));
      }
      setLoadingSchema(false);
    };
    fetchSchema();
  }, [modelId]);

  const fetchHistory = useCallback(async () => {
    if (!modelId) return;
    setLoading(true);
    const [res] = await safeApiCall(API.get(`/predictions/${modelId}/history`));
    if (res) {
      setHistory(res.data);
    }
    setLoading(false);
  }, [modelId]);

  useEffect(() => {
    if (activeTab === "history" && modelId) {
      fetchHistory();
    }
  }, [activeTab, modelId, fetchHistory]);

  const selectedModel = models.find((m) => m.id.toString() === modelId);

  const validateFormFields = () => {
    const errors = {};
    let hasError = false;

    schemaColumns.forEach((col) => {
      const val = (formValues[col] ?? "").toString().trim();
      if (val === "") {
        errors[col] = "Required";
        hasError = true;
      }
    });

    setFormErrors(errors);
    return !hasError;
  };

  const buildInputFromForm = () => {
    const input = {};
    schemaColumns.forEach((col) => {
      const raw = (formValues[col] ?? "").toString().trim();
      const num = Number(raw);
      input[col] = raw !== "" && !isNaN(num) && raw === num.toString() ? num : raw;
    });
    return input;
  };

  const handleSinglePrediction = async () => {
    setError(null);
    setResult(null);

    let parsedData;
    if (inputMode === "form") {
      if (!validateFormFields()) return;
      parsedData = buildInputFromForm();
    } else {
      try {
        parsedData = JSON.parse(jsonInput);
      } catch {
        setError("Invalid JSON format. Please verify your syntax.");
        return;
      }
    }

    setLoading(true);
    const [res, err] = await safeApiCall(
      API.post(`/predictions/${modelId}/single`, {
        input_data: parsedData,
      })
    );

    if (err) {
      setError(err.response?.data?.detail || "Failed to generate prediction.");
    } else if (res) {
      setResult({ type: "single", ...res.data });
      addToast("Success", "Prediction computed successfully.", "success");
    }
    setLoading(false);
  };

  const handleBatchPrediction = async () => {
    if (!csvFile) {
      setError("Please choose a CSV file first.");
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);
    setBatchShowAll(false);

    Papa.parse(csvFile, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          setError("Error parsing CSV file format.");
          setLoading(false);
          return;
        }

        const [res, err] = await safeApiCall(
          API.post(`/predictions/${modelId}/batch`, {
            input_data: results.data,
          })
        );

        if (err) {
          setError(err.response?.data?.detail || "Failed to generate batch predictions.");
        } else if (res) {
          setResult({ type: "batch", ...res.data });
          addToast("Success", `Generated ${res.data.predictions_generated} predictions.`, "success");
        }
        setLoading(false);
      },
      error: () => {
        setError("Failed to read CSV file content.");
        setLoading(false);
      },
    });
  };

  const handleDownloadCSV = () => {
    if (!result || !result.results) return;
    const csvString = Papa.unparse(result.results);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `batch_predictions_model_${modelId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast("Downloaded", "Exported CSV successfully.", "success");
  };

  return (
    <div className="view">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <h1>Predictions</h1>
          <p>Make new predictions using your trained models</p>
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

      <div className="grid2">
        {/* Left Card: Model Predictions matching fullaiml.html */}
        <div className="card">
          <h3>Model Predictions</h3>
          <p className="sub" style={{ marginBottom: 16 }}>Select a trained model and provide input records</p>

          <span className="lbl" style={{ marginTop: 0 }}>Dataset Context</span>
          <select
            className="select"
            style={{ width: "100%" }}
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
          >
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.filename} ({ds.rows_count} rows)
              </option>
            ))}
          </select>

          <span className="lbl">Model</span>
          {loadingModels ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--muted)" }}>
              <Loader2 className="animate-spin" size={14} />
              <span>Loading trained models…</span>
            </div>
          ) : (
            <select
              className="select"
              style={{ width: "100%" }}
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={models.length === 0}
            >
              {models.length === 0 && <option value="">No models found for this dataset</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {bestModel && bestModel.id === m.id ? "★ Best: " : ""}
                  {m.model_name} ({m.algorithm})
                </option>
              ))}
            </select>
          )}

          {selectedModel && (
            <div
              style={{
                marginTop: 10,
                padding: "8px 12px",
                background: "var(--soft)",
                borderRadius: "var(--rs)",
                border: "1px solid var(--border)",
                fontSize: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Target: <b>{selectedModel.target_column}</b></span>
              <span
                className="badge"
                style={{
                  background: selectedModel.problem_type === "classification" ? "#DDEBD9" : "#DEE7F8",
                  color: selectedModel.problem_type === "classification" ? "var(--primary)" : "var(--blue)",
                }}
              >
                {selectedModel.problem_type}
              </span>
            </div>
          )}

          {/* Tabs matching fullaiml.html */}
          <div className="tabs" style={{ marginTop: 18 }} id="pred-tabs">
            <button
              type="button"
              className={`tab ${activeTab === "single" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("single");
                setResult(null);
                setError(null);
              }}
            >
              Single Prediction
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "batch" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("batch");
                setResult(null);
                setError(null);
              }}
            >
              Batch Predictions
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "history" ? "active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              History
            </button>
          </div>

          {/* TAB 1: SINGLE PREDICTION */}
          {activeTab === "single" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <small style={{ color: "var(--muted)", fontWeight: 600 }}>Input Mode</small>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className={`btn-sm ${inputMode === "form" ? "btn-primary" : ""}`}
                    onClick={() => setInputMode("form")}
                    style={{ cursor: "pointer" }}
                  >
                    Form
                  </button>
                  <button
                    type="button"
                    className={`btn-sm ${inputMode === "json" ? "btn-primary" : ""}`}
                    onClick={() => setInputMode("json")}
                    style={{ cursor: "pointer" }}
                  >
                    JSON
                  </button>
                </div>
              </div>

              {loadingSchema ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                  <Loader2 className="animate-spin" size={20} style={{ margin: "0 auto 8px" }} />
                  <span>Loading model schema…</span>
                </div>
              ) : inputMode === "form" ? (
                <div style={{ maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
                  {schemaColumns.map((col) => (
                    <div key={col} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 3 }}>
                        {col}
                      </label>
                      <div className="iw">
                        <input
                          type="text"
                          placeholder={`Enter value for ${col}`}
                          value={formValues[col] || ""}
                          onChange={(e) => setFormValues({ ...formValues, [col]: e.target.value })}
                        />
                      </div>
                      {formErrors[col] && (
                        <span style={{ fontSize: 11, color: "var(--danger)" }}>{formErrors[col]}</span>
                      )}
                    </div>
                  ))}
                  {schemaColumns.length === 0 && (
                    <div className="empty" style={{ padding: 16 }}>Select a model to view input fields.</div>
                  )}
                </div>
              ) : (
                <div className="iw">
                  <textarea
                    rows={8}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    style={{ fontFamily: "monospace", fontSize: 12 }}
                  />
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary btn-block"
                style={{ marginTop: 16 }}
                onClick={handleSinglePrediction}
                disabled={loading || !modelId || schemaColumns.length === 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Predicting…</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Generate Prediction</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* TAB 2: BATCH PREDICTIONS matching fullaiml.html */}
          {activeTab === "batch" && (
            <div>
              <div className="upload" style={{ padding: 20 }}>
                <Cloud size={44} style={{ margin: "0 auto 8px", color: "var(--primary)" }} />
                <h3>Upload CSV File</h3>
                <p>Upload a CSV file containing records for batch inference (Max 50MB)</p>

                <label className="btn btn-primary" style={{ cursor: "pointer", display: "inline-flex" }}>
                  Choose File
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCsvFile(e.target.files[0]);
                        setError(null);
                      }
                    }}
                    hidden
                  />
                </label>

                {csvFile && (
                  <p style={{ marginTop: 10, color: "var(--primary)", fontWeight: 600, fontSize: 13 }}>
                    ✓ Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block"
                style={{ marginTop: 16 }}
                onClick={handleBatchPrediction}
                disabled={loading || !csvFile || !modelId}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Running Batch Predictions…</span>
                  </>
                ) : (
                  "Run Batch Predictions"
                )}
              </button>
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === "history" && (
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {history.length === 0 ? (
                <div className="empty">No past prediction logs recorded for this model.</div>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} className="log">
                    <span className="check-ic" style={{ width: 28, height: 28 }}>✓</span>
                    <div className="t">
                      <b>Predicted: {String(item.predicted_value ?? item.prediction)}</b>
                      <small style={{ display: "block" }}>
                        {item.created_at ? new Date(item.created_at).toLocaleTimeString() : "Recent"}
                      </small>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Card: Prediction Result matching fullaiml.html */}
        <div className="card">
          <h3>Prediction Result</h3>
          <p className="sub" style={{ marginBottom: 16 }}>Output prediction and confidence distributions</p>

          <div id="pred-out">
            {!result ? (
              <div className="empty" style={{ padding: "80px 20px" }}>
                <BrainCircuit size={48} style={{ margin: "0 auto 12px", color: "var(--muted)", opacity: 0.5 }} />
                <h3>No Prediction Yet</h3>
                <p>Provide input data on the left panel to see the model output.</p>
              </div>
            ) : result.type === "single" ? (
              <div>
                <div className="ready">
                  <span className="check-ic"><CheckCircle size={20} /></span>
                  <div>
                    <b>Predicted Output</b>
                    <span style={{ fontSize: 24, fontWeight: 700, display: "block", color: "var(--primary)" }}>
                      {String(result.predicted_class ?? result.prediction ?? result.predicted_value)}
                    </span>
                  </div>
                </div>

                {result.probabilities && (
                  <div style={{ marginTop: 16 }}>
                    <span className="lbl">Class Probabilities</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                      {Object.entries(result.probabilities).map(([cls, prob]) => {
                        const pct = (Number(prob) * 100).toFixed(1);
                        return (
                          <div key={cls} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ minWidth: 90, fontSize: 13, fontWeight: 600 }}>{cls}</span>
                            <div className="pbar">
                              <i style={{ width: `${pct}%`, background: "var(--primary)" }} />
                            </div>
                            <span style={{ minWidth: 44, fontSize: 12, fontWeight: 700, textAlign: "right" }}>
                              {pct}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {result.input_data && (
                  <div style={{ marginTop: 20 }}>
                    <span className="lbl">Feature Input Values</span>
                    <div className="tbl-wrap" style={{ maxHeight: 200, overflowY: "auto" }}>
                      <table>
                        <tbody>
                          {Object.entries(result.input_data).map(([k, v]) => (
                            <tr key={k}>
                              <td style={{ color: "var(--muted)" }}>{k}</td>
                              <td><b>{String(v)}</b></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Batch result */}
                <div className="ready">
                  <span className="check-ic"><CheckCircle size={20} /></span>
                  <div style={{ flex: 1 }}>
                    <b>Batch Completed</b>
                    <div className="sub">
                      Successfully generated <b>{result.predictions_generated}</b> predictions.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleDownloadCSV}
                  >
                    <Download size={14} /> Download CSV
                  </button>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span className="lbl" style={{ margin: 0 }}>Sample Output Preview</span>
                    {result.results && result.results.length > 5 && (
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => setBatchShowAll(!batchShowAll)}
                        style={{ cursor: "pointer" }}
                      >
                        {batchShowAll ? "Show First 5" : `Show All (${result.results.length})`}
                      </button>
                    )}
                  </div>

                  <div className="tbl-wrap" style={{ maxHeight: 320, overflowY: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          {result.results &&
                            result.results[0] &&
                            Object.keys(result.results[0]).slice(0, 5).map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(batchShowAll ? result.results : (result.results || []).slice(0, 5)).map(
                          (row, idx) => (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              {Object.keys(row)
                                .slice(0, 5)
                                .map((k) => (
                                  <td key={k}>{String(row[k] ?? "")}</td>
                                ))}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Predictions;
