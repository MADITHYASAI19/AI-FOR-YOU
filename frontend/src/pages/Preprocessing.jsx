import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../utils/api";
import { safeApiCall } from "../utils/asyncHandler";

const Ico = ({ n, size = 18 }) => {
  const paths = {
    check: '<path d="M5 12l5 5 9-10"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, flex: "none" }} dangerouslySetInnerHTML={{ __html: paths[n] || "" }} />;
};

const OPS = [
  { endpoint: "remove-missing", label: "Remove Missing Values", desc: "Drop any row containing null or empty values across all features", ic: "grid", color: "#3B6FD4" },
  { endpoint: "remove-duplicates", label: "Remove Duplicate Rows", desc: "Identify and delete identical duplicate records in the dataset", ic: "grid", color: "#F5A63D" },
  { endpoint: "auto-clean", label: "Auto Clean Pipeline", desc: "Run full cleanup (deduplication followed by missing row pruning)", ic: "spark", color: "#7B61C9", primary: true },
];

const Preprocessing = () => {
  const [searchParams] = useSearchParams();
  const queryDatasetId = searchParams.get("dataset_id");

  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(queryDatasetId || "");
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      setLoadingDatasets(true);
      const [response, err] = await safeApiCall(API.get("/datasets/"));
      if (err) setError("Failed to fetch datasets list.");
      else if (response) {
        setDatasets(response.data);
        if (response.data.length > 0) setSelectedDatasetId((p) => p || response.data[0].id.toString());
      }
      setLoadingDatasets(false);
    };
    fetchDatasets();
  }, []);

  const handleCleanAction = async (endpoint) => {
    if (!selectedDatasetId) { setError("Please select a dataset first."); return; }
    setError(""); setResult(null); setProcessing(true);
    const [response, err] = await safeApiCall(API.post(`/preprocessing/${selectedDatasetId}/${endpoint}`));
    if (err) {
      setError(err.response?.data?.detail || "An error occurred during cleaning.");
    } else if (response) {
      const res = { action: endpoint, ...response.data };
      setResult(res);
      setLogs((l) => [{ t: response.data.message || endpoint, s: `${response.data.removed_rows ?? response.data.total_removed_rows ?? 0} rows affected`, w: "just now" }, ...l]);
    }
    setProcessing(false);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Data Preprocessing Pipeline</h1>
          <p>Remove noise, handle missing data, and clean your datasets for training</p>
        </div>
        {!loadingDatasets && datasets.length > 0 && (
          <select className="select" value={selectedDatasetId} onChange={(e) => { setSelectedDatasetId(e.target.value); setResult(null); setError(""); }}>
            {datasets.map((d) => <option key={d.id} value={d.id}>{d.filename}</option>)}
          </select>
        )}
      </div>

      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="grid2">
        {/* Settings panel */}
        <div className="card">
          <h3>Select Dataset</h3>
          <select className="select" style={{ width: "100%", margin: "10px 0 22px" }} value={selectedDatasetId} onChange={(e) => { setSelectedDatasetId(e.target.value); setResult(null); setError(""); }} disabled={loadingDatasets}>
            {loadingDatasets ? <option>Loading datasets…</option> : datasets.length === 0 ? <option value="">No datasets uploaded yet</option> : datasets.map((d) => <option key={d.id} value={d.id}>{d.filename} ({d.rows_count} rows × {d.columns_count} cols)</option>)}
          </select>

          <h3>Pipeline Operations</h3>
          <p className="sub">Run specific data cleaning operations on the active dataset</p>

          <div id="ops">
            {OPS.map((op) => (
              <div key={op.endpoint} className="op">
                <span className="file-ic" style={{ background: op.color, width: 30, height: 30, margin: 0 }}>
                  <Ico n={op.ic} size={14} />
                </span>
                <div className="t">
                  <b>{op.label}</b>
                  <small>{op.desc}</small>
                </div>
                <button
                  className={op.primary ? "btn btn-primary btn-sm" : "btn-sm"}
                  onClick={() => handleCleanAction(op.endpoint)}
                  disabled={processing || !selectedDatasetId}
                >
                  {processing && result?.action === op.endpoint ? <span className="spinner" style={{ width: 12, height: 12 }} /> : "Run"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Results panel */}
        <div className="card">
          <h3>Cleaning Logs &amp; Report</h3>
          <p className="sub">Detailed results and metrics from the executed pipeline actions</p>

          {processing ? (
            <div className="ready" style={{ marginTop: 16 }}>
              <span className="check-ic"><span className="spinner" style={{ width: 18, height: 18, borderColor: "#fff3", borderTopColor: "#fff" }} /></span>
              <div><b>Cleaning Pipeline Executing…</b><div className="sub">Analyzing rows, dropping anomalies, and saving cleaned dataset.</div></div>
            </div>
          ) : result ? (
            <div>
              <div className="ready">
                <span className="check-ic"><Ico n="check" size={16} /></span>
                <div>
                  <b>{result.message}</b>
                  <div className="sub" style={{ marginTop: 4, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                    <span>Original: <b style={{ color: "var(--text)" }}>{result.original_rows}</b></span>
                    <span>Cleaned: <b style={{ color: "var(--primary)" }}>{result.cleaned_rows}</b></span>
                    <span>Removed: <b style={{ color: "var(--danger)" }}>{result.removed_rows ?? result.total_removed_rows}</b></span>
                    <span>Kept: <b style={{ color: "var(--primary)" }}>{((result.cleaned_rows / result.original_rows) * 100).toFixed(1)}%</b></span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 10, padding: 12, background: "var(--soft)", borderRadius: "var(--rs)", fontFamily: "monospace", fontSize: 12, color: "var(--muted)" }}>
                <div style={{ color: "var(--primary)", marginBottom: 4 }}>[SUCCESS] Operation: {result.action?.toUpperCase()}</div>
                {result.cleaned_file_path && <div>[PATH] {result.cleaned_file_path}</div>}
              </div>
              <div className="op" style={{ marginTop: 12 }}>
                <Ico n="info" size={16} style={{ color: "var(--muted)" }} />
                <small>Preprocessing creates a new cleaned file. The original source dataset is kept intact.</small>
              </div>
            </div>
          ) : (
            <div className="ready" id="ready" style={{ position: "relative", overflow: "hidden", marginTop: 16 }}>
              <svg style={{ position: "absolute", right: -8, bottom: -14, width: 90, opacity: .45, color: "var(--primary)" }} viewBox="0 0 200 200" fill="currentColor">
                <path d="M20 190C30 120 70 60 150 20c-5 70-40 130-130 170z"/>
              </svg>
              <span className="check-ic"><Ico n="check" size={16} /></span>
              <div>
                <b>Pipeline Ready</b>
                <div className="sub">Select and run preprocessing operations to see detailed logs and results here.</div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <h3>Recent Operations</h3>
            <button className="btn-sm" onClick={() => setLogs([])}>Clear Logs</button>
          </div>

          <div id="logs">
            {logs.length === 0 ? (
              <div className="empty">No operations yet.</div>
            ) : logs.map((l, i) => (
              <div key={i} className="log">
                <span className="check-ic" style={{ width: 26, height: 26 }}><Ico n="check" size={14} /></span>
                <div className="t"><b>{l.t}</b><br /><small>{l.s}</small></div>
                <small>{l.w}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Preprocessing;
