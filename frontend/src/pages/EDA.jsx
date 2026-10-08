import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  Grid,
  TrendingUp,
  HelpCircle,
  ArrowLeft,
  Loader2,
  Play,
  Database,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import API from "../utils/api";
import { safeApiCall } from "../utils/asyncHandler";

const Eda = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryDatasetId = searchParams.get("dataset_id");

  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(queryDatasetId || "");
  const [activeTab, setActiveTab] = useState("overview");

  // Data states
  const [summaryData, setSummaryData] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [correlationData, setCorrelationData] = useState(null);
  const [distributionData, setDistributionData] = useState(null);

  // Status states
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState("");

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

  const runEDA = useCallback(async (id) => {
    const targetId = id || selectedDatasetId;
    if (!targetId) return;

    setError("");
    setLoadingAnalysis(true);

    const [results, err] = await safeApiCall(
      Promise.all([
        API.get(`/analysis/${targetId}/summary`),
        API.get(`/analysis/${targetId}/insights`),
        API.get(`/analysis/${targetId}/distribution`),
      ])
    );

    if (err) {
      setError(err.response?.data?.detail || "Failed to retrieve analysis data.");
    } else if (results) {
      const [sumRes, insRes, distRes] = results;
      setSummaryData(sumRes.data);
      setInsightsData(insRes.data);
      setDistributionData(distRes.data);

      const [corrRes] = await safeApiCall(API.get(`/analysis/${targetId}/correlation`));
      if (corrRes) {
        setCorrelationData(corrRes.data);
      } else {
        setCorrelationData(null);
      }
    }
    setLoadingAnalysis(false);
  }, [selectedDatasetId]);

  useEffect(() => {
    if (selectedDatasetId) {
      runEDA(selectedDatasetId);
    }
  }, [selectedDatasetId, runEDA]);

  const handleDatasetChange = (e) => {
    setSelectedDatasetId(e.target.value);
  };

  const getCorrColorStyle = (val) => {
    const absVal = Math.abs(val);
    if (val > 0) {
      return {
        backgroundColor: `rgba(47, 107, 74, ${Math.min(0.85, absVal * 0.8 + 0.1)})`,
        color: absVal > 0.4 ? "#fff" : "var(--text)",
      };
    } else {
      return {
        backgroundColor: `rgba(217, 83, 79, ${Math.min(0.85, absVal * 0.8 + 0.1)})`,
        color: absVal > 0.4 ? "#fff" : "var(--text)",
      };
    }
  };

  return (
    <div className="view">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <h1>Automated EDA</h1>
          <p>Instantly perform exploratory data analysis and uncover insights</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => runEDA(selectedDatasetId)}
            disabled={loadingAnalysis || !selectedDatasetId}
          >
            {loadingAnalysis ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
            <span>Run Automated EDA</span>
          </button>
        </div>
      </div>

      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Active Dataset Select */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <b>Active Dataset</b>
        {loadingDatasets ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
            <Loader2 className="animate-spin" size={16} />
            <span>Loading datasets…</span>
          </div>
        ) : (
          <select
            className="select"
            value={selectedDatasetId}
            onChange={handleDatasetChange}
            disabled={loadingAnalysis}
          >
            {datasets.length === 0 && <option value="">No datasets uploaded yet</option>}
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.filename} ({d.rows_count} rows × {d.columns_count} columns)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Top 4 Stats Bar matching fullaiml.html */}
      <div className="stats">
        <div className="card stat">
          <div className="ic g"><Database size={20} /></div>
          <div>
            <b>{insightsData ? insightsData.total_rows?.toLocaleString() : "-"}</b>
            <span>Total Rows</span>
          </div>
        </div>
        <div className="card stat">
          <div className="ic o"><Grid size={20} /></div>
          <div>
            <b>{insightsData ? insightsData.total_columns : "-"}</b>
            <span>Total Columns</span>
          </div>
        </div>
        <div className="card stat">
          <div className="ic b"><TrendingUp size={20} /></div>
          <div>
            <b>{insightsData ? insightsData.numeric_columns_count : "-"}</b>
            <span>Numeric Features</span>
          </div>
        </div>
        <div className="card stat">
          <div className="ic r"><FileSpreadsheet size={20} /></div>
          <div>
            <b>{insightsData ? (insightsData.categorical_columns_count ?? (insightsData.total_columns - insightsData.numeric_columns_count)) : "-"}</b>
            <span>Categorical Features</span>
          </div>
        </div>
      </div>

      {loadingAnalysis && (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center", marginBottom: 20 }}>
          <Loader2 className="animate-spin" size={36} style={{ margin: "0 auto 16px", color: "var(--primary)" }} />
          <h3>Running Analytics Engine…</h3>
          <p className="sub">Calculating summaries, data hygiene insights, distributions, and correlations.</p>
        </div>
      )}

      {!loadingAnalysis && summaryData && (
        <div>
          {/* Tabs matching fullaiml.html */}
          <div className="tabs" id="eda-tabs">
            <button
              type="button"
              className={`tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview &amp; Hygiene
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "summary" ? "active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              Descriptive Statistics
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "distribution" ? "active" : ""}`}
              onClick={() => setActiveTab("distribution")}
            >
              Distributions
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "correlation" ? "active" : ""}`}
              onClick={() => setActiveTab("correlation")}
            >
              Correlations
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && insightsData && (
            <div className="grid2">
              <div className="card">
                <h3>Data Hygiene &amp; Quality</h3>
                <p className="sub" style={{ marginBottom: 16 }}>Health indicators detected from dataset</p>
                <div className="tbl-wrap">
                  <table>
                    <tbody>
                      <tr>
                        <td><b>Total Rows</b></td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{insightsData.total_rows?.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td><b>Total Columns</b></td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{insightsData.total_columns}</td>
                      </tr>
                      <tr>
                        <td><b>Missing Values (Cells)</b></td>
                        <td style={{ textAlign: "right" }}>
                          <span style={{ color: insightsData.missing_cells > 0 ? "var(--orange)" : "var(--primary)", fontWeight: 600 }}>
                            {insightsData.missing_cells?.toLocaleString()} ({insightsData.missing_percentage}%)
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><b>Duplicate Rows</b></td>
                        <td style={{ textAlign: "right" }}>
                          <span style={{ color: insightsData.duplicate_rows > 0 ? "var(--danger)" : "var(--primary)", fontWeight: 600 }}>
                            {insightsData.duplicate_rows?.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="ready" style={{ marginTop: 20 }}>
                  <span className="check-ic">
                    {insightsData.missing_cells === 0 && insightsData.duplicate_rows === 0 ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <AlertTriangle size={18} />
                    )}
                  </span>
                  <div>
                    <b>Data Readiness Status</b>
                    <div className="sub">
                      {insightsData.missing_cells === 0 && insightsData.duplicate_rows === 0
                        ? "Dataset is pristine with 0 missing cells and 0 duplicate rows."
                        : `Dataset contains ${insightsData.missing_cells} missing cells and ${insightsData.duplicate_rows} duplicate rows. Consider preprocessing.`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Feature Type Categorization</h3>
                <p className="sub" style={{ marginBottom: 16 }}>Features classified by parsed data types</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "var(--soft)", padding: 14, borderRadius: "var(--rs)", border: "1px solid var(--border)" }}>
                    <b style={{ color: "var(--blue)", fontSize: 13, display: "block", marginBottom: 8 }}>
                      Numeric ({insightsData.numeric_columns_count})
                    </b>
                    <ul style={{ listStyle: "none", maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                      {insightsData.numeric_columns.map((col) => (
                        <li key={col} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col}</span>
                          <span className="badge" style={{ background: "#DEE7F8", color: "var(--blue)", fontSize: 10, padding: "2px 6px" }}>num</span>
                        </li>
                      ))}
                      {insightsData.numeric_columns.length === 0 && (
                        <li style={{ color: "var(--muted)", fontSize: 12 }}>None</li>
                      )}
                    </ul>
                  </div>

                  <div style={{ background: "var(--soft)", padding: 14, borderRadius: "var(--rs)", border: "1px solid var(--border)" }}>
                    <b style={{ color: "var(--primary)", fontSize: 13, display: "block", marginBottom: 8 }}>
                      Categorical ({insightsData.categorical_columns_count})
                    </b>
                    <ul style={{ listStyle: "none", maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                      {insightsData.categorical_columns.map((col) => (
                        <li key={col} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col}</span>
                          <span className="badge" style={{ background: "#DDEBD9", color: "var(--primary)", fontSize: 10, padding: "2px 6px" }}>cat</span>
                        </li>
                      ))}
                      {insightsData.categorical_columns.length === 0 && (
                        <li style={{ color: "var(--muted)", fontSize: 12 }}>None</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NUMERIC SUMMARY */}
          {activeTab === "summary" && summaryData && (
            <div className="card">
              <h3>Descriptive Statistics</h3>
              <p className="sub" style={{ marginBottom: 16 }}>Detailed summary statistics for numeric features</p>

              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Statistic</th>
                      {Object.keys(summaryData.numeric_summary).map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.numeric_summary[Object.keys(summaryData.numeric_summary)[0]] ? (
                      Object.keys(summaryData.numeric_summary[Object.keys(summaryData.numeric_summary)[0]]).map((statName) => (
                        <tr key={statName}>
                          <td style={{ fontWeight: 600, color: "var(--muted)" }}>{statName}</td>
                          {Object.keys(summaryData.numeric_summary).map((col) => {
                            const val = summaryData.numeric_summary[col][statName];
                            return (
                              <td key={col}>
                                {typeof val === "number" ? val.toFixed(3) : val}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                          No numeric columns to summarize.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DISTRIBUTIONS */}
          {activeTab === "distribution" && distributionData && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {Object.entries(distributionData.distributions).map(([colName, dist]) => (
                <div key={colName} className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{colName}</h3>
                    <span className="badge" style={{ background: dist.type === "numeric" ? "#DEE7F8" : "#DDEBD9", color: dist.type === "numeric" ? "var(--blue)" : "var(--primary)" }}>
                      {dist.type}
                    </span>
                  </div>

                  {dist.type === "numeric" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Mean:</span><b>{dist.mean?.toFixed(3) ?? "N/A"}</b></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Median:</span><b>{dist.median?.toFixed(3) ?? "N/A"}</b></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Std Dev:</span><b>{dist.std?.toFixed(3) ?? "N/A"}</b></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Min:</span><b>{dist.min?.toFixed(3) ?? "N/A"}</b></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Max:</span><b>{dist.max?.toFixed(3) ?? "N/A"}</b></div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ color: "var(--muted)" }}>Unique Values:</span>
                        <b>{dist.unique_values}</b>
                      </div>
                      <span style={{ color: "var(--muted)", display: "block", marginBottom: 4, fontWeight: 600 }}>Top Values:</span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 110, overflowY: "auto" }}>
                        {Object.entries(dist.top_values).map(([val, count]) => (
                          <div key={val} style={{ display: "flex", justifyContent: "space-between", background: "var(--soft)", padding: "3px 8px", borderRadius: 4 }}>
                            <span style={{ color: "var(--text)" }}>{val || "[empty]"}</span>
                            <span style={{ fontWeight: 600, color: "var(--primary)" }}>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: CORRELATIONS */}
          {activeTab === "correlation" && (
            <div className="card">
              <h3>Pearson Correlation Matrix</h3>
              <p className="sub" style={{ marginBottom: 16 }}>Visual correlation coefficients between numeric features (-1.00 to +1.00)</p>

              {correlationData && correlationData.numeric_columns.length > 1 ? (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>Feature</th>
                        {correlationData.numeric_columns.map((col) => (
                          <th key={col} style={{ textAlign: "center" }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {correlationData.numeric_columns.map((rowCol) => (
                        <tr key={rowCol}>
                          <td style={{ fontWeight: 600, color: "var(--text)" }}>{rowCol}</td>
                          {correlationData.numeric_columns.map((colCol) => {
                            const val = correlationData.correlation_matrix[rowCol][colCol];
                            return (
                              <td
                                key={colCol}
                                style={{
                                  ...getCorrColorStyle(val),
                                  textAlign: "center",
                                  fontWeight: 600,
                                  fontSize: 12,
                                  borderRadius: 4,
                                }}
                                title={`Corr(${rowCol}, ${colCol}) = ${val?.toFixed(4)}`}
                              >
                                {val?.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <HelpCircle size={40} style={{ margin: "0 auto 10px", color: "var(--muted)" }} />
                  <h3>Not Enough Numeric Features</h3>
                  <p>Pearson correlation analysis requires at least two numeric features in the active dataset.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!loadingAnalysis && !summaryData && (
        <div className="empty card" style={{ marginTop: 20 }}>
          <p>Select a dataset and click "Run Automated EDA" to inspect insights.</p>
        </div>
      )}
    </div>
  );
};

export default Eda;
