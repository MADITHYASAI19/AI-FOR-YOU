import { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import API from "../utils/api";
import { safeApiCall } from "../utils/asyncHandler";
import { useToast } from "./useToast";

const POLL_INTERVAL = 1500;

const TrainingJobContext = createContext(null);

export const useTrainingJob = () => {
  const ctx = useContext(TrainingJobContext);
  if (!ctx) throw new Error("useTrainingJob must be used within TrainingJobProvider");
  return ctx;
};

export const TrainingJobProvider = ({ children }) => {
  const { addToast } = useToast();

  /**
   * jobHistory: Array of job objects, each shaped as:
   * { id, status, progress, message, result (null | model data), error (string) }
   * Newest job is first (unshift).
   */
  const [jobHistory, setJobHistory] = useState([]);

  // "Active" form state — which job the form/results card is currently showing
  const [activeJobId, setActiveJobId] = useState(null);

  // Whether the form is in "submitting" mode (disables inputs)
  const [formBusy, setFormBusy] = useState(false);

  const pollRefs = useRef({}); // { [jobId]: intervalId }

  // ── Helpers to update a single job in history ──
  const updateJob = useCallback((jobId, updates) => {
    setJobHistory((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, ...updates } : j))
    );
  }, []);

  // ── Cleanup all polling on unmount ──
  useEffect(() => {
    return () => {
      Object.values(pollRefs.current).forEach(clearInterval);
    };
  }, []);

  // ── On mount, check for any running/pending jobs ──
  useEffect(() => {
    const checkExistingJobs = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const [res, err] = await safeApiCall(API.get("/jobs/"));
      if (err || !res) return;

      const jobs = res.data;
      const activeJobs = jobs
        .filter((j) => j.job_type === "model_training" && (j.status === "running" || j.status === "pending"))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      if (activeJobs.length > 0) {
        const historyEntries = activeJobs.map((j) => ({
          id: j.id,
          status: j.status,
          progress: j.progress,
          message: j.message || "Training in progress…",
          result: null,
          error: "",
          createdAt: j.created_at,
        }));

        setJobHistory(historyEntries);
        setActiveJobId(historyEntries[0].id);
        setFormBusy(true);

        // Start polling for each active job
        activeJobs.forEach((j) => startPolling(j.id));
      }
    };

    checkExistingJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Poll a single job ──
  const startPolling = useCallback(
    (jobId) => {
      if (pollRefs.current[jobId]) clearInterval(pollRefs.current[jobId]);

      pollRefs.current[jobId] = setInterval(async () => {
        const [res, err] = await safeApiCall(API.get(`/jobs/${jobId}`));
        if (err || !res) return;

        const job = res.data;
        updateJob(jobId, {
          progress: job.progress,
          message: job.message || "",
          status: job.status,
        });

        if (job.status === "completed") {
          clearInterval(pollRefs.current[jobId]);
          delete pollRefs.current[jobId];

          // Attempt to fetch model details
          const modelIdMatch = job.message?.match(/Model ID:\s*(\d+)/i);
          if (modelIdMatch) {
            const modelId = parseInt(modelIdMatch[1]);
            const [modelRes, modelErr] = await safeApiCall(API.get(`/models/${modelId}`));
            if (modelErr) {
              updateJob(jobId, { error: "Training completed but failed to fetch model details." });
            } else if (modelRes) {
              const model = modelRes.data;
              updateJob(jobId, {
                result: {
                  message: "Model trained successfully",
                  model_id: model.id,
                  model_name: model.model_name,
                  algorithm: model.algorithm,
                  problem_type: model.problem_type,
                  target_column: model.target_column,
                  metrics: model.metrics,
                  model_path: model.model_path,
                },
              });
              addToast(
                "Model Training Complete",
                `Model "${model.model_name}" has been trained and validated successfully.`,
                "success"
              );
            }
          } else {
            addToast("Training Complete", job.message || "Job finished.", "success");
          }

          // If this was the active job, unlock the form
          setActiveJobId((current) => {
            if (current === jobId) setFormBusy(false);
            return current;
          });
        } else if (job.status === "failed") {
          clearInterval(pollRefs.current[jobId]);
          delete pollRefs.current[jobId];
          updateJob(jobId, { error: job.message || "Training job failed." });
          addToast("Training Failed", job.message || "The training job encountered an error.", "error");

          setActiveJobId((current) => {
            if (current === jobId) setFormBusy(false);
            return current;
          });
        }
      }, POLL_INTERVAL);
    },
    [addToast, updateJob]
  );

  // ── Derived state: get the active job from history ──
  const activeJob = jobHistory.find((j) => j.id === activeJobId) || null;

  const training = formBusy && activeJob && (activeJob.status === "running" || activeJob.status === "pending");
  const trainResult = activeJob?.result || null;
  const trainError = activeJob?.error || "";
  const jobProgress = activeJob?.progress || 0;
  const jobMessage = activeJob?.message || "";
  const jobStatus = activeJob?.status || null;

  // ── Start a new training job ──
  const startTrainingJob = useCallback(
    async (payload, meta) => {
      setFormBusy(true);

      const [response, err] = await safeApiCall(API.post("/jobs/train-model", payload));

      if (err) {
        const errorMsg = err.response?.data?.detail || "Failed to submit training job.";
        setFormBusy(false);
        return { error: errorMsg };
      }

      if (response) {
        const job = response.data;
        const newEntry = {
          id: job.id,
          status: job.status,
          progress: job.progress,
          message: job.message || "Job created",
          result: null,
          error: "",
          createdAt: job.created_at,
          meta,
        };

        setJobHistory((prev) => [newEntry, ...prev]);
        setActiveJobId(job.id);
        startPolling(job.id);
        return { job };
      }

      setFormBusy(false);
      return { error: "Unexpected error" };
    },
    [startPolling]
  );

  // ── "Start New Job" — resets the form to idle, keeps existing jobs in history ──
  const startNewJob = useCallback(() => {
    setActiveJobId(null);
    setFormBusy(false);
  }, []);

  // ── Clear a specific job from history ──
  const removeJobFromHistory = useCallback((jobId) => {
    if (pollRefs.current[jobId]) {
      clearInterval(pollRefs.current[jobId]);
      delete pollRefs.current[jobId];
    }
    setJobHistory((prev) => prev.filter((j) => j.id !== jobId));
    setActiveJobId((current) => (current === jobId ? null : current));
  }, []);

  const value = {
    // Active job state (for the form/results card)
    training,
    trainResult,
    trainError,
    jobProgress,
    jobMessage,
    jobStatus,
    activeJobId,
    formBusy,

    // Job history
    jobHistory,

    // Actions
    startTrainingJob,
    startNewJob,
    removeJobFromHistory,
    setActiveJobId,
  };

  return <TrainingJobContext.Provider value={value}>{children}</TrainingJobContext.Provider>;
};

export default TrainingJobContext;
