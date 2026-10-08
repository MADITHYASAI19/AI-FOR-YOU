import os
from fastapi import HTTPException
from sqlalchemy.orm import Session

from Backend.app.models.ml_model import MLModel


def list_user_models_service(user_id: int, db: Session):
    return (
        db.query(MLModel)
        .filter(MLModel.user_id == user_id)
        .order_by(MLModel.created_at.desc())
        .all()
    )


def list_models_by_dataset_service(dataset_id: int, user_id: int, db: Session):
    return (
        db.query(MLModel)
        .filter(
            MLModel.dataset_id == dataset_id,
            MLModel.user_id == user_id
        )
        .order_by(MLModel.created_at.desc())
        .all()
    )


def get_model_details_service(model_id: int, user_id: int, db: Session):
    model = (
        db.query(MLModel)
        .filter(
            MLModel.id == model_id,
            MLModel.user_id == user_id
        )
        .first()
    )

    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    return model


def get_model_details_with_api_info_service(model_id: int, user_id: int, db: Session):
    model = get_model_details_service(model_id=model_id, user_id=user_id, db=db)

    return {
        "id": model.id,
        "user_id": model.user_id,
        "dataset_id": model.dataset_id,
        "model_name": model.model_name,
        "algorithm": model.algorithm,
        "problem_type": model.problem_type,
        "target_column": model.target_column,
        "model_path": model.model_path,
        "metrics": model.metrics,
        "created_at": model.created_at,
        "prediction_api": {
            "predict_endpoint": f"/predictions/{model.id}/single",
            "input_schema_endpoint": f"/predictions/{model.id}/input-schema",
            "download_endpoint": f"/models/{model.id}/download",
            "method": "POST",
            "auth": "Authorization: Bearer <your JWT> OR X-API-Key: <demo key from POST /demo/api-key>",
            "note": "Call input_schema_endpoint first to get the exact fields this model expects, then POST them to predict_endpoint as {\"input_data\": {...}}."
        }
    }


def delete_model_service(model_id: int, user_id: int, db: Session):
    model = get_model_details_service(
        model_id=model_id,
        user_id=user_id,
        db=db
    )

    if model.model_path and os.path.exists(model.model_path):
        os.remove(model.model_path)

    db.delete(model)
    db.commit()

    return {
        "message": "Model deleted successfully",
        "model_id": model_id
    }


def get_best_model_service(dataset_id: int, problem_type: str, user_id: int, db: Session):
    models = (
        db.query(MLModel)
        .filter(
            MLModel.dataset_id == dataset_id,
            MLModel.user_id == user_id,
            MLModel.problem_type == problem_type
        )
        .all()
    )

    if not models:
        raise HTTPException(status_code=404, detail="No models found")

    if problem_type == "classification":
        best_model = max(
            models,
            key=lambda model: (
                (model.metrics or {}).get("f1_score") or 0,
                (model.metrics or {}).get("accuracy") or 0
            )
        )

    elif problem_type == "regression":
        best_model = max(
            models,
            key=lambda model: (
                (model.metrics or {}).get("r2_score") or -999999,
                -((model.metrics or {}).get("rmse") or 999999)
            )
        )

    else:
        raise HTTPException(status_code=400, detail="Invalid problem type")

    return best_model


def get_model_file_for_download_service(model_id: int, user_id: int, db: Session):
    model = (
        db.query(MLModel)
        .filter(MLModel.id == model_id, MLModel.user_id == user_id)
        .first()
    )

    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    if not model.model_path or not os.path.exists(model.model_path):
        raise HTTPException(status_code=404, detail="Model file is missing on the server (it may have been deleted)")

    safe_name = "".join(c for c in model.model_name if c.isalnum() or c in ("-", "_")) or "model"
    filename = f"{safe_name}_{model.algorithm}_{model.id}.pkl"

    return model.model_path, filename