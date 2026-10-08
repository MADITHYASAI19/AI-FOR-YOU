import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  BarChart2,
  Scale
} from "lucide-react";
import API from "../utils/api";
import { useToast } from "../components/useToast";
import { safeApiCall } from "../utils/asyncHandler";

const ModelComparison = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const queryDatasetId = searchParams.get("dataset_id");
  const queryProblemType = searchParams.get("problem_type") || "classification";

  const [datasets, setDatasets] = useState([]);
  const [datasetId, setDatasetId] = useState(queryDatasetId || "");
  const [problemType, setProblemType] = useState(queryProblemType);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      const [res] = await safeApiCall(API.get("/datasets/"));
      if (res) {
        setDatasets(res.data);
        if (res.data.length > 0 && !queryDatasetId) {
          setDatasetId(res.data[0].id.toString());
        }
      }
    };
    fetchDatasets();
  }, [queryDatasetId]);

  const handleCompare = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!datasetId) {
      setError("Please select a dataset.");
      return;
    }

    setLoading(true);
    const [response, err] = await safeApiCall(
      API.get(`/ml/compare/${problemType}`, {
        params: { dataset_id: datasetId },
      })
    );

    if (err) {
      const detail = err.response?.data?.detail || "Failed to compare models.";
      setError(detail);
      addToast("Comparison Failed", detail, "error");
    } else if (response) {
      setResult(response.data);
      addToast("Comparison Complete", response.data.message || "Models compared successfully.", "success");
    }
    setLoading(false);
  };

  const getMetricKeys = () => {
    if (problemType === "classification") {
      return ["accuracy", "precision", "recall", "f1_score"];
    }
    return ["r2_score", "rmse", "mae", "mse"];
  };

  const formatMetric = (val) => {
    if (val === null || val === undefined) return "-";
    return Number(val).toFixed(4);
  };

  return (
    <div className="view">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <h1>Compare Models</h1>
          <p>Evaluate and find the best performing model for your dataset</p>
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
        {/* Left Side: Setup Card matching fullaiml.html */}
        <div className="card">
          <form onSubmit={handleCompare}>
            <span className="lbl" style={{ marginTop: 0 }}>Select Dataset</span>
            <select
              className="select"
              style={{ width: "100%" }}
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              required
            >
              <option value="" disabled>Select a dataset…</option>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.filename} ({ds.rows_count} rows)
                </option>
              ))}
            </select>

            <span className="lbl">Problem Type</span>
            <div className="seg">
              <button
                type="button"
                className={problemType === "classification" ? "on" : ""}
                onClick={() => setProblemType("classification")}
              >
                Classification
              </button>
              <button
                type="button"
                className={problemType === "regression" ? "on" : ""}
                onClick={() => setProblemType("regression")}
              >
                Regression
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              id="compare"
              style={{ marginTop: 20 }}
              disabled={loading || !datasetId}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Evaluating Models…</span>
                </>
              ) : (
                "Compare Models"
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Results Card matching fullaiml.html */}
        <div className="card">
          <h3>Model Comparison Results</h3>
          <p className="sub" style={{ marginBottom: 16 }}>Leaderboard ranked by test set generalization performance</p>

          {loading && (
            <div className="empty">
              <Loader2 className="animate-spin" size={36} style={{ margin: "0 auto 12px", color: "var(--primary)" }} />
              <h3>Calculating Metrics…</h3>
              <p>Comparing algorithms across cross-validated parameters.</p>
            </div>
          )}

          {!loading && !result && (
            <div className="empty">
              <Scale size={44} style={{ margin: "0 auto 12px", color: "var(--muted)", opacity: 0.5 }} />
              <h3>Ready to Compare</h3>
              <p>Select your dataset and problem type on the left, then click "Compare Models".</p>
            </div>
          )}

          {!loading && result && (
            <div>
              {result.best_model && (
                <div className="ready" style={{ marginBottom: 16 }}>
                  <span className="check-ic"><Trophy size={18} /></span>
                  <div style={{ flex: 1 }}>
                    <b>Best Performing Model: {result.best_model.model_name}</b>
                    <div className="sub" style={{ marginTop: 2 }}>
                      Algorithm: <b>{result.best_model.algorithm}</b> &nbsp;|&nbsp;
                      {problemType === "classification"
                        ? ` F1 Score: ${(result.best_model.f1_score * 100).toFixed(1)}% | Accuracy: ${(result.best_model.accuracy * 100).toFixed(1)}%`
                        : ` R² Score: ${result.best_model.r2_score?.toFixed(4)} | RMSE: ${result.best_model.rmse?.toFixed(4)}`}
                    </div>
                  </div>
                </div>
              )}

              {result.comparison && result.comparison.length > 0 ? (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Algorithm</th>
                        {getMetricKeys().map((key) => (
                          <th key={key} style={{ textTransform: "capitalize" }}>
                            {key.replace("_", " ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody id="cmp">
                      {[...result.comparison]
                        .sort((a, b) => {
                          if (problemType === "classification") {
                            return (b.f1_score || 0) - (a.f1_score || 0);
                          } else {
                            return (b.r2_score || -999) - (a.r2_score || -999);
                          }
                        })
                        .map((model) => {
                          const isBest = result.best_model && model.model_id === result.best_model.model_id;
                          return (
                            <tr key={model.model_id} className={isBest ? "best" : ""}>
                              <td>
                                <b>{model.model_name}</b>
                                {isBest && (
                                  <span
                                    className="badge"
                                    style={{ marginLeft: 8, background: "#DDEBD9", color: "var(--primary)", fontSize: 11 }}
                                  >
                                    ★ Winner
                                  </span>
                                )}
                              </td>
                              <td>{model.algorithm}</td>
                              {getMetricKeys().map((key) => (
                                <td key={key}>
                                  <b>{formatMetric(model[key])}</b>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <p>No trained models available for comparison in this dataset and problem category.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelComparison;
