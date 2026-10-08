import os
import uuid
import joblib
import pandas as pd

from fastapi import HTTPException
from sqlalchemy.orm import Session

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

from Backend.app.models.dataset import Dataset
from Backend.app.models.ml_model import MLModel
from Backend.app.schemas.ml_model import TrainModelRequest
from Backend.app.utils.csv_utils import read_csv_safely
from Backend.app.services.algorithms import build_model, list_algorithms


MODEL_DIR = "storage/models"
os.makedirs(MODEL_DIR, exist_ok=True)


def get_dataset_or_404(dataset_id: int, user_id: int, db: Session):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.user_id == user_id
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return dataset


def get_algorithm_model(algorithm: str, problem_type: str, hyperparameters: dict):
    model = build_model(
        problem_type=problem_type,
        algorithm=algorithm,
        hyperparameters=hyperparameters,
    )

    if model is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid algorithm or problem type"
        )

    return model


def get_available_algorithms_service(problem_type: str):
    if problem_type not in ("classification", "regression"):
        raise HTTPException(
            status_code=400,
            detail="problem_type must be 'classification' or 'regression'"
        )

    return {
        "problem_type": problem_type,
        "algorithms": list_algorithms(problem_type),
    }


def prepare_dataset(df: pd.DataFrame, target_column: str):
    if target_column not in df.columns:
        raise HTTPException(
            status_code=400,
            detail="Target column not found"
        )

    df = df.dropna(subset=[target_column])

    X = df.drop(columns=[target_column])
    y = df[target_column]

    for col in X.columns:
        if pd.api.types.is_numeric_dtype(X[col]):
            X[col] = X[col].fillna(X[col].median())
        else:
            X[col] = X[col].fillna("missing")

    X = pd.get_dummies(X, drop_first=True)

    X = X.fillna(0)

    label_encoder = None

    if y.dtype == "object":
        label_encoder = LabelEncoder()
        y = label_encoder.fit_transform(y)

    return X, y, label_encoder


def evaluate_classification_model(y_test, y_pred):
    labels = sorted(list(set(y_test) | set(y_pred)))
    cm = confusion_matrix(y_test, y_pred, labels=labels)

    heatmap_data = []

    for i, actual_label in enumerate(labels):
        for j, predicted_label in enumerate(labels):
            heatmap_data.append({
                "actual": str(actual_label),
                "predicted": str(predicted_label),
                "value": int(cm[i][j])
            })

    return {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "confusion_matrix": {
            "labels": [str(label) for label in labels],
            "matrix": cm.tolist(),
            "heatmap_data": heatmap_data
        }
    }


def evaluate_regression_model(y_test, y_pred):
    mse = mean_squared_error(y_test, y_pred)

    return {
        "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
        "mse": round(float(mse), 4),
        "rmse": round(float(mse ** 0.5), 4),
        "r2_score": round(float(r2_score(y_test, y_pred)), 4),
        "prediction_quality": {
            "actual_vs_predicted": [
                {
                    "actual": float(actual),
                    "predicted": float(predicted)
                }
                for actual, predicted in list(zip(y_test, y_pred))[:100]
            ]
        }
    }

def train_model_service(request: TrainModelRequest, user_id: int, db: Session):
    dataset = get_dataset_or_404(
        dataset_id=request.dataset_id,
        user_id=user_id,
        db=db
    )
    df = read_csv_safely(dataset.stored_path)

    X, y, label_encoder = prepare_dataset(df, request.target_column)

    if X.empty:
        raise HTTPException(status_code=400, detail="No features available for training")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=request.test_size,
        random_state=request.random_state
    )

    # Fit the scaler on the training split only (never on test data) to
    # avoid leaking test-set statistics into training. Distance/gradient
    # based algorithms (SVM, KNN, SGD, MLP) need this to converge sensibly;
    # tree-based models are scale-invariant, so scaling never hurts them.
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = get_algorithm_model(
        algorithm=request.algorithm,
        problem_type=request.problem_type,
        hyperparameters=request.hyperparameters or {}
    )

    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)

    if request.problem_type == "classification":
       metrics = evaluate_classification_model(y_test, y_pred)

    elif request.problem_type == "regression":
       metrics = evaluate_regression_model(y_test, y_pred)

    else:
        raise HTTPException(status_code=400, detail="Invalid problem type")

    model_filename = f"{uuid.uuid4()}_{request.model_name}.pkl"
    model_path = os.path.join(MODEL_DIR, model_filename)

    model_package = {
        "model": model,
    "columns": X.columns.tolist(),
    "original_columns": df.drop(columns=[request.target_column]).columns.tolist(),
    "label_encoder": label_encoder,
    "target_column": request.target_column,
    "problem_type": request.problem_type,
    "scaler": scaler
    }

    joblib.dump(model_package, model_path)
    
    new_model = MLModel(
        user_id=user_id,
        dataset_id=request.dataset_id,
        model_name=request.model_name,
        algorithm=request.algorithm,
        problem_type=request.problem_type,
        target_column=request.target_column,
        model_path=model_path,
        metrics=metrics
    )

    db.add(new_model)
    db.commit()
    db.refresh(new_model)

    original_columns = model_package["original_columns"]
    example_input = {}
    for col in original_columns:
        sample_val = df[col].dropna().iloc[0] if not df[col].dropna().empty else ""
        if hasattr(sample_val, "item"):
            sample_val = sample_val.item()
        example_input[col] = sample_val

    return {
        "message": "Model trained successfully",
        "model_id": new_model.id,
        "model_name": new_model.model_name,
        "algorithm": new_model.algorithm,
        "problem_type": new_model.problem_type,
        "target_column": new_model.target_column,
        "metrics": metrics,
        "model_path": model_path,
        "prediction_api": {
            "predict_endpoint": f"/predictions/{new_model.id}/single",
            "input_schema_endpoint": f"/predictions/{new_model.id}/input-schema",
            "method": "POST",
            "auth": "Authorization: Bearer <your JWT> OR X-API-Key: <demo key from POST /demo/api-key>",
            "example_request_body": {"input_data": example_input},
            "note": "Prepend your server's base URL (e.g. http://localhost:8000) to the endpoint paths above."
        }
    }

def compare_classification_models_service(dataset_id: int, user_id: int, db: Session):
    trained_models = db.query(MLModel).filter(
        MLModel.dataset_id == dataset_id,
        MLModel.user_id == user_id,
        MLModel.problem_type == "classification"
    ).all()

    if len(trained_models) == 0:
        raise HTTPException(
            status_code=404,
            detail="No classification models found"
        )

    unique_models = {}

    for model in trained_models:
        key = (
            model.algorithm,
            model.target_column,
            model.model_name
        )

        if key not in unique_models:
            unique_models[key] = model
        else:
            if model.id > unique_models[key].id:
                unique_models[key] = model

    models = list(unique_models.values())

    if len(models) == 1:
        model = models[0]
        metrics = model.metrics or {}

        return {
            "message": "Only one unique classification model found. Train another different model to compare.",
            "total_trained_models": len(trained_models),
            "unique_models_count": 1,
            "model": {
                "model_id": model.id,
                "model_name": model.model_name,
                "algorithm": model.algorithm,
                "accuracy": metrics.get("accuracy"),
                "precision": metrics.get("precision"),
                "recall": metrics.get("recall"),
                "f1_score": metrics.get("f1_score"),
            }
        }

    comparison = []

    for model in models:
        metrics = model.metrics or {}

        comparison.append({
            "model_id": model.id,
            "model_name": model.model_name,
            "algorithm": model.algorithm,
            "accuracy": metrics.get("accuracy"),
            "precision": metrics.get("precision"),
            "recall": metrics.get("recall"),
            "f1_score": metrics.get("f1_score"),
        })

    best_model = max(
        comparison,
        key=lambda x: (
            x.get("f1_score") or 0,
            x.get("accuracy") or 0
        )
    )

    return {
        "message": "Classification model comparison generated successfully",
        "dataset_id": dataset_id,
        "total_trained_models": len(trained_models),
        "unique_models_count": len(comparison),
        "best_model": best_model,
        "comparison": comparison
    }


def compare_regression_models_service(dataset_id: int, user_id: int, db: Session):
    trained_models = db.query(MLModel).filter(
        MLModel.dataset_id == dataset_id,
        MLModel.user_id == user_id,
        MLModel.problem_type == "regression"
    ).all()

    if len(trained_models) == 0:
        raise HTTPException(
            status_code=404,
            detail="No regression models found"
        )

    unique_models = {}

    for model in trained_models:
        key = (
            model.algorithm,
            model.target_column,
            model.model_name
        )

        if key not in unique_models:
            unique_models[key] = model
        else:
            if model.id > unique_models[key].id:
                unique_models[key] = model

    models = list(unique_models.values())

    if len(models) == 1:
        model = models[0]
        metrics = model.metrics or {}

        return {
            "message": "Only one unique regression model found. Train another different model to compare.",
            "total_trained_models": len(trained_models),
            "unique_models_count": 1,
            "model": {
                "model_id": model.id,
                "model_name": model.model_name,
                "algorithm": model.algorithm,
                "mae": metrics.get("mae"),
                "mse": metrics.get("mse"),
                "rmse": metrics.get("rmse"),
                "r2_score": metrics.get("r2_score"),
            }
        }

    comparison = []

    for model in models:
        metrics = model.metrics or {}

        comparison.append({
            "model_id": model.id,
            "model_name": model.model_name,
            "algorithm": model.algorithm,
            "mae": metrics.get("mae"),
            "mse": metrics.get("mse"),
            "rmse": metrics.get("rmse"),
            "r2_score": metrics.get("r2_score"),
        })

    best_model = max(
        comparison,
        key=lambda x: (
            x.get("r2_score") or -999999,
            -(x.get("rmse") or 999999)
        )
    )

    return {
        "message": "Regression model comparison generated successfully",
        "dataset_id": dataset_id,
        "total_trained_models": len(trained_models),
        "unique_models_count": len(comparison),
        "best_model": best_model,
        "comparison": comparison
    }