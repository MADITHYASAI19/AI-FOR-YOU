import {
  AlertTriangle,
  Trash2,
  FileSpreadsheet,
  BrainCircuit,
  Activity,
  Briefcase,
  Loader2,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { createPortal } from "react-dom";

const DeleteConfirmModal = ({
  isOpen,
  dataset,
  isDeleting,
  deleteResult,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const hasResult = deleteResult !== null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#02040a]/80 backdrop-blur-sm animate-overlay-fade-in" 
      role="presentation" 
      onClick={!isDeleting ? onClose : undefined}
    >
      <div
        className="relative w-full max-w-[460px] m-4 p-0 rounded-xl border border-red-500/10 shadow-[0_24px_80px_rgba(0,0,0,0.7),_0_0_40px_rgba(239,68,68,0.06)] overflow-hidden bg-bg-card backdrop-blur-md animate-modal-slide-in sm:max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Deleting in progress */}
        {isDeleting && (
          <div className="flex flex-col items-center text-center p-10 pb-8 sm:p-8 sm:pb-6">
            <div className="size-[72px] rounded-full flex items-center justify-center mb-5 bg-cyan-500/5 border-2 border-cyan-500/20 text-accent-cyan shadow-[0_0_24px_rgba(0,240,255,0.1)]">
              <Loader2 size={36} className="animate-spin" />
            </div>
            <h3 className="font-display text-[1.35rem] font-extrabold text-accent-cyan mb-1.5">Cleaning Up Resources…</h3>
            <p className="font-mono text-[0.72rem] text-text-muted max-w-[340px] leading-relaxed mb-6">
              Removing dataset, trained models, predictions, and jobs
            </p>
            <div className="w-full max-w-[260px] h-1 bg-bg-inset rounded-full overflow-hidden mt-2">
              <div className="h-full w-[40%] rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 animate-progress-slide" />
            </div>
          </div>
        )}

        {/* Success result */}
        {!isDeleting && hasResult && (
          <div className="flex flex-col items-center text-center p-10 pb-8 sm:p-8 sm:pb-6">
            <div className="size-[72px] rounded-full flex items-center justify-center mb-5 bg-emerald-500/10 border-2 border-emerald-500/25 text-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.12)] animate-success-pop">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="font-display text-[1.35rem] font-extrabold text-text-primary mb-1.5">Cascade Delete Complete</h3>
            <p className="font-mono text-[0.78rem] text-text-secondary max-w-[340px] leading-relaxed mb-6">
              All related resources have been permanently removed
            </p>

            <div className="grid grid-cols-2 gap-2.5 w-full mb-7 sm:gap-2">
              <div className="flex flex-col items-center gap-1.5 p-3.5 px-2 bg-bg-inset border border-white/5 rounded-md transition-all duration-150 animate-result-card-in [animation-delay:50ms] hover:border-border-glow hover:bg-[#0e1224]/80">
                <FileSpreadsheet size={20} className="mb-0.5 text-accent-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.3)]" />
                <span className="font-mono text-[0.65rem] text-text-muted uppercase tracking-wider">Dataset</span>
                <span className="font-display text-[0.85rem] font-bold text-text-success">Deleted</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3.5 px-2 bg-bg-inset border border-white/5 rounded-md transition-all duration-150 animate-result-card-in [animation-delay:100ms] hover:border-border-glow hover:bg-[#0e1224]/80">
                <BrainCircuit size={20} className="mb-0.5 text-accent-amber drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]" />
                <span className="font-mono text-[0.65rem] text-text-muted uppercase tracking-wider">Models Removed</span>
                <span className="font-display font-bold text-[1.3rem] bg-gradient-to-br from-cyan-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
                  {deleteResult?.deleted_models ?? 0}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3.5 px-2 bg-bg-inset border border-white/5 rounded-md transition-all duration-150 animate-result-card-in [animation-delay:150ms] hover:border-border-glow hover:bg-[#0e1224]/80">
                <Activity size={20} className="mb-0.5 text-accent-purple drop-shadow-[0_0_6px_rgba(124,58,237,0.3)]" />
                <span className="font-mono text-[0.65rem] text-text-muted uppercase tracking-wider">Predictions</span>
                <span className="font-display text-[0.85rem] font-bold text-text-success">Cleared</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3.5 px-2 bg-bg-inset border border-white/5 rounded-md transition-all duration-150 animate-result-card-in [animation-delay:200ms] hover:border-border-glow hover:bg-[#0e1224]/80">
                <Briefcase size={20} className="mb-0.5 text-accent-green drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
                <span className="font-mono text-[0.65rem] text-text-muted uppercase tracking-wider">Jobs</span>
                <span className="font-display text-[0.85rem] font-bold text-text-success">Cleared</span>
              </div>
            </div>

            <button 
              type="button" 
              className="w-full max-w-[200px] py-3 px-5 rounded-sm font-display font-bold text-[0.85rem] flex items-center justify-center gap-2 border-none transition-all duration-150 bg-gradient-to-br from-[#00c8d4] to-purple-600 text-white shadow-[0_4px_18px_rgba(0,200,212,0.2)] cursor-pointer hover:shadow-[0_6px_24px_rgba(0,224,236,0.3)] hover:-translate-y-px active:scale-95" 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}

        {/* Confirmation prompt */}
        {!isDeleting && !hasResult && (
          <div className="flex flex-col items-center text-center p-10 pb-8 sm:p-8 sm:pb-6">
            <div className="size-[72px] rounded-full flex items-center justify-center mb-5 bg-red-500/10 border-2 border-red-500/20 text-red-400 animate-danger-pulse">
              <ShieldAlert size={36} />
            </div>
            <h3 className="font-display text-[1.35rem] font-extrabold text-text-primary mb-1.5">Delete Dataset?</h3>
            <p className="font-mono text-[0.78rem] text-text-secondary max-w-[340px] leading-relaxed mb-6">
              This action is <strong className="text-text-primary">permanent</strong> and cannot be undone
            </p>

            <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-inset border border-white/10 rounded-sm font-mono text-[0.8rem] font-semibold text-text-primary mb-5 max-w-full">
              <FileSpreadsheet size={16} className="text-accent-cyan shrink-0" />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap" title={dataset?.filename}>
                {dataset?.filename}
              </span>
            </div>

            <div className="flex items-start gap-2.5 p-3 px-4 bg-amber-500/5 border border-amber-500/10 rounded-sm mb-4 text-left w-full">
              <AlertTriangle size={16} className="text-accent-amber shrink-0 mt-0.5 drop-shadow-[0_0_6px_rgba(245,158,11,0.3)]" />
              <div className="font-mono text-[0.72rem] text-text-secondary leading-relaxed">
                <strong className="text-text-warning">Cascade deletion</strong>, the following related
                resources will also be permanently removed:
              </div>
            </div>

            <ul className="list-none w-full mb-7 flex flex-col gap-2 p-0">
              <li className="flex items-center gap-2.5 py-2 px-3.5 bg-red-500/5 border border-red-500/10 rounded-sm font-mono text-[0.75rem] text-text-secondary text-left transition-all duration-150 hover:bg-red-500/10 hover:border-red-500/15 hover:text-text-primary">
                <BrainCircuit size={14} className="text-accent-red shrink-0 opacity-70" />
                <span>All trained ML models</span>
              </li>
              <li className="flex items-center gap-2.5 py-2 px-3.5 bg-red-500/5 border border-red-500/10 rounded-sm font-mono text-[0.75rem] text-text-secondary text-left transition-all duration-150 hover:bg-red-500/10 hover:border-red-500/15 hover:text-text-primary">
                <Activity size={14} className="text-accent-red shrink-0 opacity-70" />
                <span>All predictions generated by those models</span>
              </li>
              <li className="flex items-center gap-2.5 py-2 px-3.5 bg-red-500/5 border border-red-500/10 rounded-sm font-mono text-[0.75rem] text-text-secondary text-left transition-all duration-150 hover:bg-red-500/10 hover:border-red-500/15 hover:text-text-primary">
                <Briefcase size={14} className="text-accent-red shrink-0 opacity-70" />
                <span>All associated training jobs</span>
              </li>
            </ul>

            <div className="flex gap-3 w-full">
              <button 
                type="button"
                className="flex-1 py-3 px-5 rounded-sm font-display font-bold text-[0.85rem] flex items-center justify-center gap-2 border border-white/10 bg-white/5 text-text-secondary transition-all duration-150 cursor-pointer hover:bg-white/10 hover:border-border-glow hover:text-text-primary active:scale-95"
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="flex-1 py-3 px-5 rounded-sm font-display font-bold text-[0.85rem] flex items-center justify-center gap-2 border-none bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_4px_18px_rgba(239,68,68,0.25)] transition-all duration-150 cursor-pointer hover:shadow-[0_6px_28px_rgba(239,68,68,0.35)] hover:-translate-y-px active:scale-95"
                onClick={onConfirm}
              >
                <Trash2 size={16} />
                Delete Everything
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default DeleteConfirmModal;
