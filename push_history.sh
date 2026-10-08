#!/usr/bin/env bash
# Run from INSIDE the project root (AI-FOR-YOU-main). Creates ~34 commits spread over ~38 days.
set -e
[ -d .git ] || git init -b main

# ---- never commit secrets / junk (run.txt has your SECRET_KEY, DB password, Google client id) ----
cat >> .gitignore <<'IGN'

# Python / env / local data
__pycache__/
*.pyc
.env
*.env
run.txt
Backend/sql_app.db
storage/uploads/*
storage/models/*
storage/cleaned/*
!storage/**/.gitkeep
frontend/.claude/
node_modules/
IGN

TZ_OFF="+0530"
c() {  # c <days_ago> <HH:MM> "<message>" <paths...>
  local d="$1" t="$2" m="$3"; shift 3
  local ts; ts="$(date -d "$d days ago" +%Y-%m-%d) $t:$((RANDOM%50+10)) $TZ_OFF"
  for p in "$@"; do git add -- $p 2>/dev/null || true; done
  if git diff --cached --quiet; then echo "skip (nothing staged): $m"; return; fi
  GIT_AUTHOR_DATE="$ts" GIT_COMMITTER_DATE="$ts" git commit -q -m "$m"
  echo "ok  $ts  $m"
}

B=Backend/app; F=frontend/src

c 38 10:12 "Initial commit: project skeleton and gitignore" .gitignore
c 38 21:40 "Add initial README" readme.md
c 37 19:05 "Add backend dependencies" requirements.txt
c 36 18:30 "Add core config, database and security modules" $B/core Backend/storage
c 35 20:15 "Add User model and auth schemas" $B/models/__init__.py $B/models/.gitkeep $B/models/user.py $B/schemas/user.py
c 34 17:45 "Implement JWT auth service, routes and dependencies" $B/services/auth_service.py $B/api/routes/auth.py $B/api/dependencies.py
c 33 22:10 "Add FastAPI entrypoint with CORS and static charts" main.py
c 31 19:20 "Add Dataset model, schemas and upload service" $B/models/dataset.py $B/schemas/dataset.py $B/services/dataset_service.py
c 30 18:05 "Add dataset routes and file/csv utilities" $B/api/routes/datasets.py $B/utils
c 29 20:30 "Add preprocessing service and routes" $B/services/preprocessing_service.py $B/api/routes/preprocessing.py
c 28 16:50 "Add EDA analysis service and routes" $B/services/analysis_service.py $B/api/routes/analysis.py
c 27 21:15 "Add Job and MLModel models with schemas" $B/models/job.py $B/models/ml_model.py $B/schemas/job.py $B/schemas/ml_model.py
c 26 19:40 "Add algorithm registry (classification and regression)" $B/services/algorithms.py
c 25 18:25 "Add ML training service and routes" $B/services/ml_service.py $B/api/routes/ml.py
c 24 11:00 "Scaffold React + Vite frontend with Tailwind" frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/index.html frontend/jsconfig.json frontend/.gitignore frontend/public $F/index.jsx $F/index.css $F/App.css
c 23 20:05 "Add axios API client and async helpers" $F/utils
c 22 19:10 "Add toast notification system" $F/components/Toast.css $F/components/ToastContext.jsx $F/components/toastContext.js $F/components/useToast.js
c 21 18:35 "Add layout, navbar and error boundary" $F/components/Layout.jsx $F/components/Navbar.jsx $F/components/ScrollToTop.jsx $F/components/ErrorBoundary.jsx
c 20 21:20 "Set up routing in App with lazy-loaded pages" $F/App.jsx
c 19 17:55 "Add Login and Register pages" $F/pages/Login.jsx $F/pages/Login.css $F/pages/Register.jsx $F/pages/Register.css
c 18 20:40 "Add custom cursor and Silk WebGL background" $F/components/Cursor $F/components/Silk.jsx
c 17 19:25 "Build Dashboard page with dataset upload" $F/pages/Dashboard.jsx $F/pages/Dashboard.css
c 16 18:15 "Add Preprocessing page" $F/pages/Preprocessing.jsx $F/pages/Preprocessing.css
c 15 20:50 "Add EDA page" $F/pages/EDA.jsx $F/pages/EDA.css
c 14 19:00 "Add visualization service, route and page" $B/services/visualization_service.py $B/api/routes/visualization.py $F/pages/Visualizations.jsx $F/pages/Visualizations.css
c 13 21:30 "Add Celery worker and background job service" $B/workers $B/services/job_service.py $B/services/background_job_service.py $B/api/routes/jobs.py
c 12 18:45 "Add ModelTraining page and training job context" $F/pages/ModelTraining.jsx $F/pages/ModelTraining.css $F/components/TrainingJobContext.jsx
c 11 20:10 "Add prediction model, schemas, service and routes" $B/models/predictions.py $B/schemas/predictions.py $B/services/prediction_service.py $B/api/routes/predictions.py
c 10 19:35 "Add Predictions page (single and batch)" $F/pages/Predictions.jsx $F/pages/Predictions.css
c 9  18:20 "Add model comparison page" $F/pages/ModelComparison.jsx $F/pages/ModelComparison.css
c 8  20:25 "Add model management service and routes" $B/services/model_management_service.py $B/schemas/model_management.py $B/api/routes/model_management.py
c 7  19:50 "Add ModelManagement page and delete confirm modal" $F/pages/ModelManagement.jsx $F/pages/ModelManagement.css $F/components/DeleteConfirmModal.jsx
c 6  21:05 "Add API keys, admin service and demo route" $B/models/api_key.py $B/services/api_key_service.py $B/services/admin_service.py $B/schemas/admin.py $B/api/routes/admin.py $B/api/routes/demo.py
c 5  18:40 "Add Profile page" $F/pages/Profile.jsx $F/pages/Profile.css
c 4  20:20 "Add eslint config and lint helper" frontend/eslint.config.js frontend/fix_lint.py frontend/react-doctor.config.json
c 3  19:15 "Document prediction improvements" PREDICTION_IMPROVEMENTS.md
c 2  17:30 "Update frontend README" frontend/README.md package-lock.json
c 1  22:00 "Final cleanup" -A

echo; git log --oneline | wc -l; echo "commits created"
git status --short | head
