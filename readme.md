# FullAIML — End-to-End Machine Learning & Analytics Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Scikit-Learn](https://img.shields.io/badge/ML-scikit--learn-F7931E?style=flat-square&logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

**FullAIML** is a modern full-stack web platform for exploring data, automating feature engineering and cleaning pipelines, training machine learning models, evaluating leaderboards, and running real-time predictions directly from the browser — without requiring code.

Built with a high-performance **FastAPI** backend and an elegant, responsive **React + Vite** frontend styled with the curated **FullAIML Design System**.

---

## Key Capabilities

- **Authentication & Workspace**: Secure JWT authentication, user registration, account profile settings, and persistent sessions.
- **Dataset Hub**: Upload, inspect, preview, and manage structured datasets (`.csv`, `.xlsx`, `.json`) up to 50MB.
- **Data Preprocessing Pipeline**: Interactive data cleaning operations (missing value pruning, duplicate removal, automated cleansing pipelines) with real-time rows-affected metrics.
- **Automated EDA (Exploratory Data Analysis)**:
  - Instant data hygiene and quality audits.
  - Automatic feature type categorization (numeric vs. categorical).
  - Descriptive statistics (mean, std, min, quartiles, max).
  - Per-column distribution breakdowns.
  - Interactive Pearson correlation matrix with dynamic color scaling.
- **Visual Studio**:
  - Interactive chart generation for Histograms, Bar Charts, Scatter Plots, Heatmaps, and Box Plots powered by Apache ECharts.
  - Fullscreen display modes and chart image exports.
- **Model Training Studio**:
  - Metadata-driven algorithm catalog supporting **24 Scikit-Learn algorithms** (12 classification + 12 regression).
  - Dynamic hyperparameter configuration forms with real-time validation.
  - Asynchronous background training jobs with live progress steppers.
  - Post-training validation diagnostics: Confusion Matrix heatmaps and Actual vs. Predicted scatter plots.
- **Model Comparison**:
  - Direct head-to-head algorithm evaluation on identical datasets.
  - Automated ranking leaderboard highlighting top-performing models across accuracy, F1 score, precision, recall, RMSE, and $R^2$.
- **Model Management**:
  - Centralized catalog of all trained ML models.
  - One-click `.pkl` model artifact download for deployment.
  - Direct shortcuts to run predictions or compare models.
- **Prediction Engine**:
  - **Single Inference**: Auto-generated schema forms or raw JSON input with class probability confidence distributions.
  - **Batch Inference**: Bulk CSV upload with inference generation and instant `.csv` result download.
  - Historical inference log tracking.

---

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database / ORM**: PostgreSQL with SQLAlchemy 2.0
- **Machine Learning**: `scikit-learn`, `pandas`, `numpy`, `joblib`, `scipy`
- **Security**: `python-jose` (JWT), `passlib` / `bcrypt`
- **Visualization Server**: `matplotlib`, `seaborn`

### Frontend
- **Framework**: React 19 + Vite 8
- **Styling**: FullAIML Design System (CSS Variables, Flex/Grid Layouts, Glassmorphism)
- **Charts & Graphics**: Apache ECharts (`echarts-for-react`)
- **Icons**: Lucide React + custom inline SVG icons
- **Utilities**: Axios (JWT interceptors), PapaParse, Framer Motion

---

## System Architecture

```mermaid
flowchart TB
    subgraph Client["Presentation Layer (React SPA)"]
        Pages["Pages<br/>Dashboard, Preprocessing, EDA, Visualizations,<br/>Training, Comparison, Models, Predictions"]
        Ctx["Contexts<br/>ToastContext, TrainingJobContext"]
        ApiClient["Axios API Client<br/>JWT Auth Interceptors"]
        Pages --> Ctx
        Pages --> ApiClient
    end

    subgraph API["FastAPI REST API"]
        Routes["API Endpoints<br/>/auth, /datasets, /preprocessing, /analysis,<br/>/visualizations, /ml, /models, /predictions, /jobs"]
        Deps["Dependencies<br/>get_current_user, get_db"]
        Schemas["Pydantic Schemas<br/>Request & Response Contracts"]
        Routes --> Deps
        Routes --> Schemas
    end

    subgraph Services["Service Layer (Business Logic)"]
        S_Auth["auth_service"]
        S_Data["dataset_service"]
        S_Prep["preprocessing_service"]
        S_EDA["analysis_service"]
        S_Viz["visualization_service"]
        S_ML["ml_service + algorithms catalog"]
        S_Pred["prediction_service"]
    end

    subgraph Storage["Persistence & Infrastructure"]
        DB[("PostgreSQL Database")]
        FS[("File Storage<br/>uploads/, cleaned/, models/")]
    end

    ApiClient -- "HTTP / REST" --> Routes
    Routes --> Services
    Services --> DB
    Services --> FS
```

---

## Supported Machine Learning Algorithms

Algorithms are dynamically registered in `Backend/app/services/algorithms.py`. Adding new algorithms requires zero frontend modifications.

| Problem Type | Algorithms |
| :--- | :--- |
| **Classification (12)** | Random Forest, XGBoost / Gradient Boosting, Logistic Regression, Decision Tree, Support Vector Classifier (SVC), K-Nearest Neighbors (KNN), AdaBoost, Extra Trees, Gaussian Naive Bayes, Ridge Classifier, SGD Classifier, MLP Classifier |
| **Regression (12)** | Random Forest Regressor, Gradient Boosting Regressor, Linear Regression, Decision Tree Regressor, Support Vector Regressor (SVR), K-Nearest Neighbors (KNN), Ridge, Lasso, ElasticNet, AdaBoost Regressor, Extra Trees Regressor, SGD Regressor |

---

## Directory Structure

```text
FULLAIML-main/
├── main.py                        # FastAPI application entry point
├── requirements.txt               # Backend dependencies
├── Backend/
│   ├── app/
│   │   ├── api/                   # API routers and dependencies
│   │   │   ├── dependencies.py    # Authentication & database dependencies
│   │   │   └── routes/            # Route modules (auth, datasets, ml, etc.)
│   │   ├── core/                  # Configurations, database session, security
│   │   ├── models/                # SQLAlchemy database entities
│   │   ├── schemas/               # Pydantic validation schemas
│   │   ├── services/              # Core business and machine learning logic
│   │   └── utils/                 # File helpers and CSV validators
│   └── storage/                   # File persistence (uploads, cleaned, models)
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/            # Reusable UI components & context providers
│       ├── pages/                 # FullAIML page views
│       │   ├── Dashboard.jsx
│       │   ├── Preprocessing.jsx
│       │   ├── EDA.jsx
│       │   ├── Visualizations.jsx
│       │   ├── ModelTraining.jsx
│       │   ├── ModelComparison.jsx
│       │   ├── ModelManagement.jsx
│       │   ├── Predictions.jsx
│       │   └── Profile.jsx
│       ├── utils/                 # Axios client and API utilities
│       └── index.css              # FullAIML global design system
└── README.md
```

---

## Getting Started

### Prerequisites
- **Python**: 3.10 or newer
- **Node.js**: 18.0 or newer
- **Database**: PostgreSQL (or SQLite for development)

---

### 1. Backend Setup

1. **Navigate to project root and create a virtual environment**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   Create a `.env` file in `Backend/.env`:
   ```env
   SECRET_KEY=your-super-secret-jwt-key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   DATABASE_URL=postgresql://postgres:password@localhost:5432/fullaiml
   ```

4. **Launch the FastAPI server**:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   Interactive Swagger API documentation will be available at: `http://localhost:8000/docs`

---

### 2. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## End-to-End Workflow

```text
[ Upload CSV ] ──> [ Clean & Preprocess ] ──> [ Automated EDA & Insights ]
                          │
                          ▼
               [ Interactive Visualizations ]
                          │
                          ▼
            [ Configure & Train ML Model ]
                          │
                          ▼
        [ Compare Multi-Algorithm Leaderboard ]
                          │
                          ▼
      [ Run Single / Batch Predictions & Export ]
```

---

## License

This project is licensed under the [MIT License](LICENSE).
