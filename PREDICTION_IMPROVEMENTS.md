# Prediction Feature Improvements

## Overview

The prediction feature was improved to make newly trained models more reliable during real-world prediction. The main change is that the project now saves the preprocessing steps together with the trained model, then reuses the exact same steps when generating predictions.

This reduces the chance of incorrect predictions caused by differences between training-time data preparation and prediction-time data preparation.

## Files Changed

- `Backend/app/services/ml_service.py`
- `Backend/app/services/prediction_service.py`
- `Backend/app/schemas/predictions.py`

## What Changed

### 1. Training Now Saves a Full Preprocessing Pipeline

Previously, training manually prepared the dataset using missing-value filling and dummy encoding before fitting the model.

Now, training builds a reusable scikit-learn pipeline that includes:

- Numeric missing-value handling with median imputation
- Categorical missing-value handling with a `"missing"` placeholder
- Categorical encoding with `OneHotEncoder(handle_unknown="ignore")`
- The selected machine learning model

This pipeline is saved inside the model package.

### 2. Prediction Uses the Same Pipeline

Previously, prediction recreated preprocessing separately using `pd.get_dummies()` and column reindexing.

Now, new models use the saved pipeline directly. This means the same preprocessing logic used during training is also used during prediction.

This improves prediction reliability for:

- Missing values
- Categorical columns
- New or unseen category values
- Column order differences

### 3. Backward Compatibility Was Kept

Older saved models do not contain the new pipeline format.

To avoid breaking them, prediction still supports the old model format as a fallback. Existing models can still generate predictions, but retraining them will enable the improved behavior.

### 4. Input Schema Now Includes More Metadata

The prediction input-schema response now includes `feature_schema` in addition to the list of required input columns.

The new schema can include:

- Field name
- Field type
- Whether the field is nullable
- Example value
- Numeric minimum and maximum
- Known category values

This prepares the frontend for a better prediction form in the future.

### 5. Classification Predictions Can Return Class Probabilities

For classification models that support probabilities, prediction responses can now include `class_probabilities`.

Instead of only returning the highest confidence score, the API can show probability values for each possible class.

Example:

```json
{
  "prediction": "approved",
  "confidence_score": 0.82,
  "class_probabilities": {
    "approved": 0.82,
    "rejected": 0.18
  }
}
```

## Why This Improves Prediction Quality

The most important improvement is consistency.

Machine learning predictions are only trustworthy when new input data is prepared the same way as the training data. By saving preprocessing and model logic together, the system avoids accidental mismatches between training and prediction.

This is especially important for user-uploaded datasets, because different datasets may contain different column types, missing values, and category values.

## Verification Done

The changed backend files were checked successfully with Python compilation.

An in-memory prediction test was also run using:

- Numeric input
- Categorical input
- A missing value during training
- An unseen category during prediction

The test passed successfully.

## Important Note

This improvement fully applies to newly trained models.

Existing saved models will continue to work through the older fallback logic, but they should be retrained to get the new pipeline-based prediction behavior.

## Recommended Next Improvements

1. Update the frontend prediction page to render form fields from `feature_schema`.
2. Add row-level validation messages for batch CSV prediction.
3. Add downloadable batch prediction results as CSV.
4. Auto-select the best trained model for prediction.
5. Add model explanation or feature-importance details to prediction results.
