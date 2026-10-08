import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Download,
  Play,
  Cpu,
  BarChart,
  TrendingUp,
  Plus
} from "lucide-react";
import API from "../utils/api";
import { useToast } from "../components/useToast";
import { safeApiCall } from "../utils/asyncHandler";

const ModelManagement = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [datasets, setDatasets] = useState([]);

  // Filters
  const [filterDataset, setFilterDataset] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    const [res, err] = await safeApiCall(API.get("/models/"));
    if (err) {
      addToast("Error", "Failed to load models.", "error");
    } else if (res) {
      setModels(res.data);
    }
    setLoading(false);
  }, [addToast]);

  const fetchDatasets = useCallback(async () => {
    const [res] = await safeApiCall(API.get("/datasets/"));
    if (res) {
      setDatasets(res.data);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    fetchDatasets();
  }, [fetchModels, fetchDatasets]);

  const handleDownload = async (model) => {
    const [res, err] = await safeApiCall(
      API.get(`/models/${model.id}/download`, { responseType: "blob" })
    );
    if (err) {
      addToast("Error", "Failed to download model file.", "error");
    } else if (res) {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const safeName = model.model_name.replace(/[^a-zA-Z0-9_-]/g, "") || "model";
      link.setAttribute("download", `${safeName}_${model.algorithm}_${model.id}.pkl`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast("Success", `Downloading ${model.model_name}.pkl`, "success");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const [, err] = await safeApiCall(API.delete(`/models/${deleteTarget.id}`));
    if (err) {
      addToast("Error", "Failed to delete model.", "error");
    } else {
      addToast("Deleted", `Model "${deleteTarget.model_name}" deleted successfully.`, "success");
      fetchModels();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  // Filter models
  const filteredModels = models.filter((m) => {
    if (filterDataset !== "all" && m.dataset_id.toString() !== filterDataset) return false;
    if (filterType !== "all" && m.problem_type !== filterType) return false;
    return true;
  });

  // Stats
  const classificationCount = models.filter((m) => m.problem_type === "classification").length;
  const regressionCount = models.filter((m) => m.problem_type === "regression").length;

  const getPrimaryMetric = (model) => {
    const m = model.metrics || {};
    if (model.problem_type === "classification") {
      return {
        label: "Accuracy",
        value: m.accuracy !== undefined ? `${(m.accuracy * 100).toFixed(1)}%` : m.f1_score !== undefined ? `F1: ${(m.f1_score * 100).toFixed(1)}%` : "—",
      };
    }
    return {
      label: "R²",
      value: m.r2_score !== undefined ? Number(m.r2_score).toFixed(3) : "—",
    };
  };

  const getDatasetName = (datasetId) => {
    const ds = datasets.find((d) => d.id === datasetId);
    return ds ? ds.filename : `Dataset #${datasetId}`;
  };

  return (
    <div className="view">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <h1>Models</h1>
          <p>Trained models appear here</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
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
            onClick={() => navigate("/model-training")}
          >
            <Plus size={16} />
            <span>Train New Model</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats">
        <div className="card stat">
          <div className="ic o"><Cpu size={20} /></div>
          <div>
            <b>{models.length}</b>
            <span>Total Models</span>
          </div>
        </div>
        <div className="card stat">
          <div className="ic g"><BarChart size={20} /></div>
          <div>
            <b>{classificationCount}</b>
            <span>Classification</span>
          </div>
        </div>
        <div className="card stat">
          <div className="ic b"><TrendingUp size={20} /></div>
          <div>
            <b>{regressionCount}</b>
            <span>Regression</span>
          </div>
        </div>
        <div className="card stat">
          <div className="ic r"><Cpu size={20} /></div>
          <div>
            <b>{datasets.length}</b>
            <span>Connected Datasets</span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <b style={{ color: "var(--muted)", fontSize: 13 }}>Filters:</b>
        <select
          className="select"
          style={{ minWidth: 180 }}
          value={filterDataset}
          onChange={(e) => setFilterDataset(e.target.value)}
        >
          <option value="all">All Datasets</option>
          {datasets.map((ds) => (
            <option key={ds.id} value={ds.id}>
              {ds.filename}
            </option>
          ))}
        </select>

        <select
          className="select"
          style={{ minWidth: 160 }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Problem Types</option>
          <option value="classification">Classification</option>
          <option value="regression">Regression</option>
        </select>
      </div>

      {/* Table Card matching fullaiml.html */}
      <div className="card">
        {loading ? (
          <div className="empty">
            <Loader2 className="animate-spin" size={36} style={{ margin: "0 auto 12px", color: "var(--primary)" }} />
            <p>Loading trained models…</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="empty">
            <Cpu size={44} style={{ margin: "0 auto 12px", color: "var(--muted)", opacity: 0.5 }} />
            <h3>No Models Found</h3>
            <p>
              {models.length === 0
                ? "No models have been trained yet. Click 'Train New Model' to start."
                : "No models match your filter criteria."}
            </p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Algorithm</th>
                  <th>Type</th>
                  <th>Target Feature</th>
                  <th>Score</th>
                  <th>Dataset</th>
                  <th>Trained</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model) => {
                  const metric = getPrimaryMetric(model);
                  return (
                    <tr key={model.id}>
                      <td>
                        <span className="file-ic" style={{ background: "var(--primary)" }}>ML</span>
                        <b>{model.model_name}</b>
                      </td>
                      <td>{model.algorithm}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: model.problem_type === "classification" ? "#DDEBD9" : "#DEE7F8",
                            color: model.problem_type === "classification" ? "var(--primary)" : "var(--blue)",
                          }}
                        >
                          {model.problem_type}
                        </span>
                      </td>
                      <td>{model.target_column}</td>
                      <td>
                        <b>{metric.value}</b>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{getDatasetName(model.dataset_id)}</td>
                      <td style={{ color: "var(--muted)" }}>
                        {new Date(model.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            title="Make Predictions"
                            onClick={() => navigate("/predictions")}
                          >
                            <Play size={12} /> Predict
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            title="Download Pickle Artifact"
                            onClick={() => handleDownload(model)}
                          >
                            <Download size={12} />
                          </button>
                          <button
                            type="button"
                            className="del"
                            title="Delete Model"
                            onClick={() => setDeleteTarget(model)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(31, 42, 36, 0.4)",
              backdropFilter: "blur(4px)",
              display: "grid",
              placeItems: "center",
              zIndex: 100,
              padding: 16,
            }}
          >
            <div className="card" style={{ maxWidth: 440, width: "100%", padding: 24 }}>
              <h3>Delete Model</h3>
              <p className="sub" style={{ margin: "8px 0 20px" }}>
                Are you sure you want to permanently delete <b>"{deleteTarget.model_name}"</b>?
                This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: "var(--danger)" }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete Model"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ModelManagement;
