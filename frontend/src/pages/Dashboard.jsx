import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../utils/api";
import { safeApiCall } from "../utils/asyncHandler";
import DeleteConfirmModal from "../components/DeleteConfirmModal";

/* --- SVG icons matching reference --- */
const I = {
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  cloud: '<path d="M17.5 19a4.5 4.5 0 0 0 .5-9A6 6 0 0 0 6.3 9.5 4 4 0 0 0 7 19M12 12v8M9 15l3-3 3 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="3"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
};
const Ico = ({ n, size = 18, style }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size, flex: "none", ...style }} dangerouslySetInnerHTML={{ __html: I[n] }} />
);

const LeafSvg = () => (
  <svg className="leaf" viewBox="0 0 200 200" fill="currentColor" aria-hidden="true">
    <path d="M20 190C30 120 70 60 150 20c-5 70-40 130-130 170z"/>
    <path d="M60 190c5-50 30-90 80-120-2 50-25 95-80 120z" opacity=".6"/>
  </svg>
);

const formatBytes = (bytes, dec = 2) => {
  if (!bytes) return "0 B";
  const k = 1024, dm = dec < 0 ? 0 : dec;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const Dashboard = () => {
  const [datasets, setDatasets] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, dataset: null, isDeleting: false, deleteResult: null });
  const navigate = useNavigate();

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    const [response, err] = await safeApiCall(API.get("/datasets/"));
    if (err) setError("Failed to load datasets. Please check the backend connection.");
    else if (response) setDatasets(response.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (sessionStorage.getItem("profile_toast_shown")) return;
      const [response, err] = await safeApiCall(API.get("/auth/me"));
      if (err) return;
      const user = response.data;
      if (user.age === 0 || user.role === "user" || !user.age) {
        setProfileIncomplete(true);
        sessionStorage.setItem("profile_toast_shown", "true");
        setTimeout(() => setProfileIncomplete(false), 5000);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => { fetchDatasets(); }, [fetchDatasets]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.name.endsWith(".csv")) { setError("Only CSV files are allowed."); setFile(null); return; }
    if (f.size > 50 * 1024 * 1024) { setError("File size exceeds the 50MB limit."); setFile(null); return; }
    setFile(f); setError("");
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError(""); setSuccess(""); setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const [, err] = await safeApiCall(API.post("/datasets/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }));
    if (err) { setError(err.response?.data?.detail || "Failed to upload file."); }
    else { setSuccess("Dataset uploaded successfully!"); setFile(null); const el = document.getElementById("csv-file-input"); if (el) el.value = ""; fetchDatasets(); }
    setUploading(false);
  };

  const handleDeleteClick = (dataset) => {
    setError(""); setSuccess("");
    setDeleteModal({ isOpen: true, dataset, isDeleting: false, deleteResult: null });
  };

  const handleDeleteConfirm = async () => {
    const datasetId = deleteModal.dataset?.id;
    if (!datasetId) return;
    setDeleteModal((p) => ({ ...p, isDeleting: true }));
    const [response, err] = await safeApiCall(API.delete(`/datasets/${datasetId}`));
    if (err) {
      setDeleteModal((p) => ({ ...p, isOpen: false, isDeleting: false, deleteResult: null }));
      setError("Failed to delete dataset.");
    } else {
      setDeleteModal((p) => ({ ...p, isDeleting: false, deleteResult: response.data }));
    }
  };

  const handleDeleteModalClose = () => {
    const hadResult = deleteModal.deleteResult !== null;
    setDeleteModal({ isOpen: false, dataset: null, isDeleting: false, deleteResult: null });
    if (hadResult) { setSuccess("Dataset deleted successfully."); fetchDatasets(); }
  };

  // Drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { const fakeEv = { target: { files: [f] } }; handleFileChange(fakeEv); }
  };

  return (
    <div>
      {/* Profile incomplete toast */}
      {profileIncomplete && (
        <div className="toast" style={{ bottom: 24, display: "flex", gap: 12, alignItems: "center", minWidth: 320 }}>
          <Ico n="alert" size={16} />
          <span style={{ flex: 1 }}>Profile incomplete — add your age &amp; role.</span>
          <button className="btn btn-sm" onClick={() => navigate("/profile")}>Complete</button>
          <button style={{ border: 0, background: "none", color: "#fff", fontSize: 18, cursor: "pointer" }} onClick={() => setProfileIncomplete(false)}>×</button>
        </div>
      )}

      {/* Page header */}
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Your workspace at a glance.</p>
        </div>
        <label htmlFor="csv-file-input" className="btn btn-primary" style={{ cursor: "pointer" }}>
          <Ico n="plus" size={16} />
          Upload Dataset
        </label>
        <input id="csv-file-input" type="file" accept=".csv" onChange={handleFileChange} hidden />
      </div>

      {/* Dashboard Stats */}
      <div className="stats" style={{ marginBottom: 20 }}>
        <div className="card stat"><div className="ic g"><Ico n="db" size={20} /></div><div><b>{datasets.length}</b><span>Datasets</span></div></div>
        <div className="card stat"><div className="ic o"><Ico n="cpu" size={20} /></div><div><b>0</b><span>Models trained</span></div></div>
        <div className="card stat"><div className="ic b"><Ico n="chart" size={20} /></div><div><b>0%</b><span>Best accuracy</span></div></div>
        <div className="card stat"><div className="ic r"><Ico n="target" size={20} /></div><div><b>0</b><span>Predictions made</span></div></div>
      </div>

      {error && (
        <div className="alert" style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <Ico n="alert" size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="alert-success" style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <Ico n="spark" size={16} /> {success}
        </div>
      )}

      <div className="grid-hub">
        {/* Upload card */}
        <div
          className="upload"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <LeafSvg />
          <Ico n="cloud" size={60} style={{ strokeWidth: 1.5, color: "var(--primary)" }} />
          <h3>Upload Dataset</h3>
          <p>Upload a CSV file containing your structured dataset (Max 50MB)</p>

          <form onSubmit={handleUploadSubmit}>
            <label htmlFor="csv-file-input-inner" className="btn btn-primary" style={{ cursor: "pointer", marginBottom: 10 }}>
              Choose File
            </label>
            <input id="csv-file-input-inner" type="file" accept=".csv" onChange={handleFileChange} hidden />
            {file && (
              <p style={{ fontSize: 12, color: "var(--primary)", margin: "4px 0 8px", fontWeight: 600 }}>
                {file.name} ({formatBytes(file.size)})
              </p>
            )}
            <p style={{ margin: "12px 0 14px" }}>or drag and drop your file here</p>
            <div className="chips">
              <span className="chip">CSV</span>
              <span className="chip">XLSX</span>
              <span className="chip">JSON</span>
            </div>
            {file && (
              <button className="btn btn-primary btn-block" type="submit" disabled={uploading} style={{ marginTop: 16 }}>
                {uploading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Uploading…</> : "Upload File"}
              </button>
            )}
          </form>
        </div>

        {/* Datasets table card */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <h3>My Datasets</h3>
          </div>

          {loading ? (
            <div className="empty">
              <span className="spinner" style={{ width: 32, height: 32 }} />
              <p style={{ marginTop: 12 }}>Fetching datasets…</p>
            </div>
          ) : datasets.length === 0 ? (
            <div className="empty">
              <Ico n="file" size={40} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
              <p style={{ fontWeight: 600 }}>No Datasets Found</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Upload your first CSV dataset to get started.</p>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Rows</th>
                    <th>Cols</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((ds) => (
                    <tr key={ds.id}>
                      <td>
                        <span className="file-ic" style={{ background: "var(--primary)" }}>C</span>
                        <span title={ds.filename}>{ds.filename}</span>
                      </td>
                      <td>{formatBytes(ds.file_size)}</td>
                      <td>{ds.rows_count?.toLocaleString()}</td>
                      <td>{ds.columns_count}</td>
                      <td style={{ display: "flex", gap: 4 }}>
                        <button
                          className="del"
                          style={{ color: "var(--muted)" }}
                          title="Preprocess"
                          onClick={() => navigate(`/preprocessing?dataset_id=${ds.id}`)}
                        ><Ico n="gear" size={15} /></button>
                        <button
                          className="del"
                          style={{ color: "var(--muted)" }}
                          title="EDA"
                          onClick={() => navigate(`/eda?dataset_id=${ds.id}`)}
                        ><Ico n="spark" size={15} /></button>
                        <button
                          className="del"
                          style={{ color: "var(--muted)" }}
                          title="Visualize"
                          onClick={() => navigate(`/visualizations?dataset_id=${ds.id}`)}
                        ><Ico n="chart" size={15} /></button>
                        <button
                          className="del"
                          style={{ color: "var(--muted)" }}
                          title="Train Model"
                          onClick={() => navigate(`/ml-model?dataset_id=${ds.id}`)}
                        ><Ico n="cpu" size={15} /></button>
                        <button
                          className="del"
                          title="Delete"
                          onClick={() => handleDeleteClick(ds)}
                        ><Ico n="trash" size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        dataset={deleteModal.dataset}
        isDeleting={deleteModal.isDeleting}
        deleteResult={deleteModal.deleteResult}
        onConfirm={handleDeleteConfirm}
        onClose={handleDeleteModalClose}
      />
    </div>
  );
};

export default Dashboard;
