"""
Algorithm registry for model training.

Each entry describes one algorithm: which sklearn class backs it, what
its default hyperparameters are, and a small schema describing the
hyperparameters a user is allowed to tune from the UI. Keeping this as
data (instead of an if/elif chain) means adding a 25th algorithm is a
matter of adding one dict entry -- nothing else has to change.
"""

from sklearn.linear_model import (
    LogisticRegression,
    LinearRegression,
    Ridge,
    RidgeClassifier,
    Lasso,
    ElasticNet,
    SGDClassifier,
    SGDRegressor,
)
from sklearn.ensemble import (
    RandomForestClassifier,
    RandomForestRegressor,
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    AdaBoostClassifier,
    AdaBoostRegressor,
    ExtraTreesClassifier,
    ExtraTreesRegressor,
)
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.svm import SVC, SVR
from sklearn.naive_bayes import GaussianNB
from sklearn.neural_network import MLPClassifier, MLPRegressor


# ---------------------------------------------------------------------------
# Hyperparameter field helpers
# ---------------------------------------------------------------------------
def _int_field(name, label, default, minimum=1, maximum=1000):
    return {
        "name": name,
        "label": label,
        "type": "int",
        "default": default,
        "min": minimum,
        "max": maximum,
    }


def _float_field(name, label, default, minimum=0.0, maximum=1.0, step=0.01):
    return {
        "name": name,
        "label": label,
        "type": "float",
        "default": default,
        "min": minimum,
        "max": maximum,
        "step": step,
    }


def _select_field(name, label, default, options):
    return {
        "name": name,
        "label": label,
        "type": "select",
        "default": default,
        "options": options,
    }


def _optional_int_field(name, label, minimum=1, maximum=200):
    return {
        "name": name,
        "label": label,
        "type": "int",
        "default": None,
        "min": minimum,
        "max": maximum,
        "optional": True,
    }


# ---------------------------------------------------------------------------
# Classification algorithms
# ---------------------------------------------------------------------------
CLASSIFICATION_ALGORITHMS = {
    "logistic_regression": {
        "label": "Logistic Regression",
        "model_class": LogisticRegression,
        "fixed_params": {"max_iter": 1000},
        "hyperparameters": [
            _float_field("C", "Regularization Strength (C)", 1.0, 0.01, 10.0, 0.01),
        ],
    },
    "random_forest": {
        "label": "Random Forest Classifier",
        "model_class": RandomForestClassifier,
        "fixed_params": {},
        "hyperparameters": [
            _int_field("n_estimators", "Estimators (Trees)", 100, 10, 1000),
            _optional_int_field("max_depth", "Max Depth"),
        ],
    },
    "decision_tree": {
        "label": "Decision Tree Classifier",
        "model_class": DecisionTreeClassifier,
        "fixed_params": {},
        "hyperparameters": [
            _optional_int_field("max_depth", "Max Depth"),
            _int_field("min_samples_split", "Min Samples Split", 2, 2, 50),
        ],
    },
    "knn": {
        "label": "K-Nearest Neighbors Classifier",
        "model_class": KNeighborsClassifier,
        "fixed_params": {},
        "hyperparameters": [
            _int_field("n_neighbors", "Neighbors (K)", 5, 1, 50),
        ],
    },
    "svm": {
        "label": "Support Vector Classifier",
        "model_class": SVC,
        "fixed_params": {"probability": True},
        "hyperparameters": [
            _float_field("C", "Regularization Strength (C)", 1.0, 0.01, 10.0, 0.01),
            _select_field("kernel", "Kernel", "rbf", ["linear", "rbf", "poly", "sigmoid"]),
        ],
    },
    "naive_bayes": {
        "label": "Gaussian Naive Bayes",
        "model_class": GaussianNB,
        "fixed_params": {},
        "hyperparameters": [],
    },
    "gradient_boosting": {
        "label": "Gradient Boosting Classifier",
        "model_class": GradientBoostingClassifier,
        "fixed_params": {},
        "hyperparameters": [
            _int_field("n_estimators", "Estimators", 100, 10, 500),
            _float_field("learning_rate", "Learning Rate", 0.1, 0.001, 1.0, 0.001),
        ],
    },
    "adaboost": {
        "label": "AdaBoost Classifier",
        "model_class": AdaBoostClassifier,
        "fixed_params": {},
        "hyperparameters": [
            _int_field("n_estimators", "Estimators", 50, 10, 500),
            _float_field("learning_rate", "Learning Rate", 1.0, 0.001, 2.0, 0.001),
        ],
    },
    "extra_trees": {
        "label": "Extra Trees Classifier",
        "model_class": ExtraTreesClassifier,
        "fixed_params": {},
        "hyperparameters": [
            _int_field("n_estimators", "Estimators", 100, 10, 1000),
            _optional_int_field("max_depth", "Max Depth"),
        ],
    },
    "ridge_classifier": {
        "label": "Ridge Classifier",
        "model_class": RidgeClassifier,
        "fixed_params": {},
        "hyperparameters": [
            _float_field("alpha", "Regularization (alpha)", 1.0, 0.01, 10.0, 0.01),
        ],
    },
    "sgd_classifier": {
        "label": "SGD Classifier",
        "model_class": SGDClassifier,
        "fixed_params": {},
        "hyperparameters": [
            _select_field("loss", "Loss Function", "hinge", ["hinge", "log_loss", "modified_huber"]),
            _float_field("alpha", "Regularization (alpha)", 0.0001, 0.00001, 1.0, 0.00001),
        ],
    },
    "mlp_classifier": {
        "label": "Neural Network (MLP) Classifier",
        "model_class": MLPClassifier,
        "fixed_params": {"max_iter": 500},
        "hyperparameters": [
            _int_field("hidden_layer_size", "Hidden Layer Size", 100, 4, 512),
            _float_field("learning_rate_init", "Learning Rate", 0.001, 0.0001, 1.0, 0.0001),
        ],
    },
}


# ---------------------------------------------------------------------------
# Regression algorithms
# ---------------------------------------------------------------------------
REGRESSION_ALGORITHMS = {
    "linear_regression": {
        "label": "Linear Regression",
        "model_class": LinearRegression,
        "fixed_params": {},
        "hyperparameters": [],
    },
    "random_forest": {
        "label": "Random Forest Regressor",
        "model_class": RandomForestRegressor,
        "fixed_params": {},
        "hyperparameters": [
            _int_field("n_estimators", "Estimators (Trees)", 100, 10, 1000),
            _optional_int_field("max_depth", "Max Depth"),
        ],
    },
    "decision_tree": {
        "label": "Decision Tree Regressor",
        "model_class": DecisionTreeRegressor,
        "fixed_params": {},
        "hyperparameters": [
            _optional_int_field("max_depth", "Max Depth"),
            _int_field("min_samples_split", "Min Samples Split", 2, 2, 50),
        ],
    },
    "knn": {
        "label": "K-Nearest Neighbors Regressor",
        "model_class": KNeighborsRegressor,
        "fixed_params": {},
        "hyperparameters": [
            _int_field("n_neighbors", "Neighbors (K)", 5, 1, 50),
        ],
    },
    "svr": {
        "label": "Support Vector Regressor",
        "model_class": SVR,
        "fixed_params": {},
        "hyperparameters": [
            _float_field("C", "Regularization Strength (C)", 1.0, 0.01, 10.0, 0.01),
            _select_field("kernel", "Kernel", "rbf", ["linear", "rbf", "poly", "sigmoid"]),
        ],
    },
    "ridge": {
        "label": "Ridge Regression",
        "model_class": Ridge,
        "fixed_params": {},
        "hyperparameters": [
            _float_field("alpha", "Regularization (alpha)", 1.0, 0.01, 10.0, 0.01),
        ],
    },
    "lasso": {
        "label": "Lasso Regression",
        "model_class": Lasso,
        "fixed_params": {},
        "hyperparameters": [
            _float_field("alpha", "Regularization (alpha)", 1.0, 0.001, 10.0, 0.001),
        ],
    },
    "elastic_net": {
        "label": "Elastic Net Regression",
        "model_class": ElasticNet,
        "fixed_params": {},
        "hyperparameters": [
            _float_field("alpha", "Regularization (alpha)", 1.0, 0.001, 10.0, 0.001),
            _float_field("l1_ratio", "L1 Ratio", 0.5, 0.0, 1.0, 0.01),
        ],
    },
    "gradient_boosting": {
        "label": "Gradient Boosting Regressor",
        "model_class": GradientBoostingRegressor,
        "fixed_params": {},
        "hyperparameters": [
            _int_field("n_estimators", "Estimators", 100, 10, 500),
            _float_field("learning_rate", "Learning Rate", 0.1, 0.001, 1.0, 0.001),
        ],
    },
    "adaboost": {
        "label": "AdaBoost Regressor",
        "model_class": AdaBoostRegressor,
        "fixed_params": {},
        "hyperparameters": [
            _int_field("n_estimators", "Estimators", 50, 10, 500),
            _float_field("learning_rate", "Learning Rate", 1.0, 0.001, 2.0, 0.001),
        ],
    },
    "extra_trees": {
        "label": "Extra Trees Regressor",
        "model_class": ExtraTreesRegressor,
        "fixed_params": {},
        "hyperparameters": [
            _int_field("n_estimators", "Estimators", 100, 10, 1000),
            _optional_int_field("max_depth", "Max Depth"),
        ],
    },
    "sgd_regressor": {
        "label": "SGD Regressor",
        "model_class": SGDRegressor,
        "fixed_params": {},
        "hyperparameters": [
            _float_field("alpha", "Regularization (alpha)", 0.0001, 0.00001, 1.0, 0.00001),
        ],
    },
}


REGISTRY_BY_PROBLEM_TYPE = {
    "classification": CLASSIFICATION_ALGORITHMS,
    "regression": REGRESSION_ALGORITHMS,
}


def get_registry(problem_type: str) -> dict:
    registry = REGISTRY_BY_PROBLEM_TYPE.get(problem_type)
    if registry is None:
        return {}
    return registry


def list_algorithms(problem_type: str) -> list:
    """Return the metadata list the frontend uses to render the algorithm
    dropdown and its hyperparameter form."""
    registry = get_registry(problem_type)

    return [
        {
            "id": algo_id,
            "label": meta["label"],
            "hyperparameters": meta["hyperparameters"],
        }
        for algo_id, meta in registry.items()
    ]


def build_model(problem_type: str, algorithm: str, hyperparameters: dict):
    """Instantiate the sklearn estimator for (problem_type, algorithm),
    applying the algorithm's fixed params first, then any user-supplied
    hyperparameter overrides restricted to the fields the algorithm
    actually declares (so a stray/unknown key can't blow up sklearn)."""
    registry = get_registry(problem_type)
    meta = registry.get(algorithm)

    if meta is None:
        return None

    allowed_keys = {field["name"] for field in meta["hyperparameters"]}
    user_params = {
        key: value
        for key, value in (hyperparameters or {}).items()
        if key in allowed_keys and value is not None and value != ""
    }

    # MLP's hidden_layer_size (single int, UI-friendly) maps to sklearn's
    # hidden_layer_sizes (tuple).
    if algorithm == "mlp_classifier" and "hidden_layer_size" in user_params:
        size = int(user_params.pop("hidden_layer_size"))
        user_params["hidden_layer_sizes"] = (size,)

    params = {**meta["fixed_params"], **user_params}

    return meta["model_class"](**params)
