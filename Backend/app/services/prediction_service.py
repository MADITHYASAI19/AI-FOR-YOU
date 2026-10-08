import os
import joblib
import pandas as pd
from fastapi import HTTPException
from sqlalchemy.orm import Session

from Backend.app.models.ml_model import MLModel
from Backend.app.models.predictions import Prediction


def get_model_or_404(model_id: int, user_id: int, db: Session):
    model_record = (
        db.query(MLModel)
        .filter(
            MLModel.id == model_id,
            MLModel.user_id == user_id
        )
        .first()
    )

    if not model_record:
        raise HTTPException(status_code=404, detail="Model not found")

    if not os.path.exists(model_record.model_path):
        raise HTTPException(status_code=404, detail="Model file not found")

    return model_record


def load_model_package(model_path: str):
    try:
        return joblib.load(model_path)
    except Exception:
        raise HTTPException(status_code=400, detail="Unable to load trained model")


def prepare_input_for_prediction(input_data, model_package):
    df = pd.DataFrame(input_data)

    trained_columns = model_package["columns"]

    df = pd.get_dummies(df)

    df = df.reindex(columns=trained_columns, fill_value=0)

    scaler = model_package.get("scaler")
    if scaler is not None:
        df[trained_columns] = scaler.transform(df[trained_columns])

    return df


def convert_prediction_output(predictions, model_package):
    label_encoder = model_package.get("label_encoder")

    if label_encoder is not None:
        predictions = label_encoder.inverse_transform(predictions)

    return [pred.item() if hasattr(pred, "item") else pred for pred in predictions]


def get_confidence_scores(model, prepared_df):
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(prepared_df)
        return [round(float(max(row)), 4) for row in probabilities]

    return [None for _ in range(len(prepared_df))]



def prediction_input_schema_service(model_id: int, user_id: int, db: Session):
    model_record = get_model_or_404(model_id, user_id, db)

    model_package = load_model_package(model_record.model_path)

    original_columns = model_package.get("original_columns")

    if not original_columns:
        raise HTTPException(
            status_code=400,
            detail="This model was trained before original input schema was saved. Please retrain the model and use the new model_id."
        )

    return {
        "model_id": model_record.id,
        "model_name": model_record.model_name,
        "problem_type": model_record.problem_type,
        "target_column": model_record.target_column,
        "required_input_columns": original_columns,
        "message": "Use these fields to build the prediction input form"
    }

def single_prediction_service(
    model_id: int,
    input_data: dict,
    user_id: int,
    db: Session
):
    model_record = get_model_or_404(model_id, user_id, db)

    model_package = load_model_package(model_record.model_path)

    model = model_package["model"]

    prepared_df = prepare_input_for_prediction([input_data], model_package)

    prediction = model.predict(prepared_df)

    prediction_output = convert_prediction_output(prediction, model_package)

    confidence_scores = get_confidence_scores(model, prepared_df)

    result = {
        "prediction": prediction_output[0]
    }

    prediction_record = Prediction(
        user_id=user_id,
        model_id=model_id,
        input_data=input_data,
        prediction_result=result,
        confidence_score=confidence_scores[0]
    )

    db.add(prediction_record)
    db.commit()
    db.refresh(prediction_record)

    return {
        "model_id": model_record.id,
        "model_name": model_record.model_name,
        "prediction": prediction_output[0],
        "confidence_score": confidence_scores[0]
    }


def batch_prediction_service(
    model_id: int,
    input_data: list,
    user_id: int,
    db: Session
):
    if not input_data:
        raise HTTPException(status_code=400, detail="Input data cannot be empty")

    model_record = get_model_or_404(model_id, user_id, db)

    model_package = load_model_package(model_record.model_path)

    model = model_package["model"]

    prepared_df = prepare_input_for_prediction(input_data, model_package)

    predictions = model.predict(prepared_df)

    prediction_outputs = convert_prediction_output(predictions, model_package)

    confidence_scores = get_confidence_scores(model, prepared_df)

    results = []

    for index, prediction in enumerate(prediction_outputs):
        results.append({
            "row_number": index + 1,
            "prediction": prediction,
            "confidence_score": confidence_scores[index]
        })

    prediction_record = Prediction(
        user_id=user_id,
        model_id=model_id,
        input_data=input_data,
        prediction_result={"results": results},
        confidence_score=None
    )

    db.add(prediction_record)
    db.commit()
    db.refresh(prediction_record)

    return {
        "model_id": model_record.id,
        "model_name": model_record.model_name,
        "total_records": len(input_data),
        "predictions_generated": len(results),
        "results": results
    }


def prediction_history_service(user_id: int, db: Session):
    return (
        db.query(Prediction)
        .filter(Prediction.user_id == user_id)
        .order_by(Prediction.created_at.desc())
        .all()
    )


def model_prediction_history_service(model_id: int, user_id: int, db: Session):
    get_model_or_404(model_id, user_id, db)

    return (
        db.query(Prediction)
        .filter(
            Prediction.user_id == user_id,
            Prediction.model_id == model_id
        )
        .order_by(Prediction.created_at.desc())
        .all()
    )