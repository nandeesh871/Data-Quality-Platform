import json
from pathlib import Path
from typing import Any
import numpy as np
import pandas as pd

try:
    import xgboost as xgb
except ImportError:
    xgb = None

try:
    import catboost as cb
except ImportError:
    cb = None


def read_dataset(path: str | Path) -> pd.DataFrame:
    return pd.read_csv(path)


def analyze_dataframe(df: pd.DataFrame) -> dict[str, Any]:
    rows_count = len(df)
    columns_count = len(df.columns)
    total_cells = max(rows_count * columns_count, 1)
    missing_by_column = df.isna().sum().to_dict()
    missing_total = int(sum(missing_by_column.values()))
    duplicate_count = int(df.duplicated().sum())
    data_types = {column: str(dtype) for column, dtype in df.dtypes.items()}

    invalid_columns = []
    for column in df.columns:
        missing_ratio = float(df[column].isna().mean()) if rows_count else 0
        if missing_ratio > 0.5:
            invalid_columns.append(
                {
                    "column": column,
                    "issue": "More than 50 percent values are missing",
                    "severity": "high",
                }
            )

    numeric_summary = (
        df.describe(include="number").fillna(0).round(2).to_dict()
        if not df.select_dtypes(include="number").empty
        else {}
    )

    missing_penalty = (missing_total / total_cells) * 60
    duplicate_penalty = (duplicate_count / max(rows_count, 1)) * 30
    invalid_penalty = min(len(invalid_columns) * 5, 10)
    quality_score = max(0, round(100 - missing_penalty - duplicate_penalty - invalid_penalty, 2))

    return {
        "quality_score": quality_score,
        "rows_count": rows_count,
        "columns_count": columns_count,
        "missing_total": missing_total,
        "missing_by_column": missing_by_column,
        "duplicate_count": duplicate_count,
        "data_types": data_types,
        "invalid_columns": invalid_columns,
        "numeric_summary": numeric_summary,
        "column_names": list(df.columns),
        "preview": df.head(10).fillna("").to_dict(orient="records"),
    }


def clean_dataframe(df: pd.DataFrame, imputation_strategy: str = "median") -> pd.DataFrame:
    cleaned = df.drop_duplicates().copy()
    numeric_cols = list(cleaned.select_dtypes(include="number").columns)
    categorical_cols = list(cleaned.select_dtypes(exclude="number").columns)

    # Impute categorical columns with mode
    for col in categorical_cols:
        if cleaned[col].isna().sum() > 0:
            mode = cleaned[col].mode(dropna=True)
            fill_val = mode.iloc[0] if not mode.empty else "Unknown"
            cleaned[col] = cleaned[col].fillna(fill_val)

    # Impute numeric columns
    if len(numeric_cols) > 0 and cleaned[numeric_cols].isna().sum().sum() > 0:
        if imputation_strategy == "mean":
            for col in numeric_cols:
                cleaned[col] = cleaned[col].fillna(cleaned[col].mean())
        elif imputation_strategy == "median":
            for col in numeric_cols:
                cleaned[col] = cleaned[col].fillna(cleaned[col].median())
        elif imputation_strategy == "mode":
            for col in numeric_cols:
                mode = cleaned[col].mode(dropna=True)
                fill_val = mode.iloc[0] if not mode.empty else 0
                cleaned[col] = cleaned[col].fillna(fill_val)
        elif imputation_strategy == "constant":
            for col in numeric_cols:
                cleaned[col] = cleaned[col].fillna(0)
        elif imputation_strategy == "knn":
            try:
                from sklearn.impute import KNNImputer
                imputer = KNNImputer(n_neighbors=5)
                # KNNImputer outputs np.ndarray, we convert it back
                cleaned[numeric_cols] = imputer.fit_transform(cleaned[numeric_cols])
            except Exception:
                # fallback to median
                for col in numeric_cols:
                    cleaned[col] = cleaned[col].fillna(cleaned[col].median())

    return cleaned


def preprocess_dataframe(
    df: pd.DataFrame,
    outlier_method: str = "iqr",
    scaling_method: str = "standard",
    target_column: str | None = None
) -> tuple[pd.DataFrame, dict[str, Any]]:
    report: dict[str, Any] = {
        "steps": [],
        "removed_duplicates": int(df.duplicated().sum()),
        "encoded_columns": [],
        "scaled_columns": [],
        "outlier_treatment": [],
    }
    processed = df.drop_duplicates().copy()
    report["steps"].append("Removed duplicate records")

    # Resolve target column and exclude it from feature preprocessing
    if target_column == "Total Dataset":
        target = processed.columns[-1]
    else:
        target = target_column if (target_column and target_column in processed.columns) else processed.columns[-1]

    # Impute missing values first to allow outlier detection and scaling
    numeric_cols = [c for c in processed.select_dtypes(include="number").columns if c != target]
    categorical_cols = [c for c in processed.select_dtypes(exclude="number").columns if c != target]

    for col in categorical_cols:
        missing_count = int(processed[col].isna().sum())
        if missing_count > 0:
            mode = processed[col].mode(dropna=True)
            fill_value = mode.iloc[0] if not mode.empty else "Unknown"
            processed[col] = processed[col].fillna(fill_value)
            report["steps"].append(f"Filled {missing_count} missing values in {col} using mode")

    for col in numeric_cols:
        missing_count = int(processed[col].isna().sum())
        if missing_count > 0:
            median = processed[col].median()
            processed[col] = processed[col].fillna(median)
            report["steps"].append(f"Filled {missing_count} missing values in {col} using median")

    # Outlier treatment (excluding target)
    if len(numeric_cols) > 0 and outlier_method != "none":
        if outlier_method == "isolation_forest":
            try:
                from sklearn.ensemble import IsolationForest
                iso = IsolationForest(contamination=0.05, random_state=42)
                # Fit IF on features only
                outliers = iso.fit_predict(processed[numeric_cols].fillna(0))
                inlier_mask = outliers == 1
                outliers_removed = int((outliers == -1).sum())
                processed = processed[inlier_mask].reset_index(drop=True)
                report["outlier_treatment"].append({"column": "All Numeric Features (Isolation Forest)", "capped_values": outliers_removed})
                report["steps"].append(f"Removed {outliers_removed} outliers using Isolation Forest (5% contamination limit)")
            except Exception as e:
                report["steps"].append(f"Skipped Isolation Forest outlier removal due to error: {e}")
        elif outlier_method == "zscore":
            for col in numeric_cols:
                mean = processed[col].mean()
                std = processed[col].std()
                if std == 0 or pd.isna(std):
                    continue
                lower = mean - 3 * std
                upper = mean + 3 * std
                outlier_count = int(((processed[col] < lower) | (processed[col] > upper)).sum())
                if outlier_count > 0:
                    processed[col] = processed[col].clip(lower, upper)
                    report["outlier_treatment"].append({"column": col, "capped_values": outlier_count})
            if report["outlier_treatment"]:
                report["steps"].append("Capped numeric outliers using Z-score limits (Threshold: 3)")
        elif outlier_method == "iqr":
            for col in numeric_cols:
                q1 = processed[col].quantile(0.25)
                q3 = processed[col].quantile(0.75)
                iqr = q3 - q1
                if iqr == 0:
                    continue
                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr
                outlier_count = int(((processed[col] < lower) | (processed[col] > upper)).sum())
                if outlier_count > 0:
                    processed[col] = processed[col].clip(lower, upper)
                    report["outlier_treatment"].append({"column": col, "capped_values": outlier_count})
            if report["outlier_treatment"]:
                report["steps"].append("Capped numeric outliers using IQR limits (1.5x IQR)")

    # Encoding categorical columns (excluding target)
    categorical_columns = [
        col for col in processed.select_dtypes(include=["object", "category", "bool"]).columns
        if processed[col].nunique(dropna=True) <= 20 and col != target
    ]
    if categorical_columns:
        processed = pd.get_dummies(processed, columns=categorical_columns, drop_first=False)
        report["encoded_columns"] = categorical_columns
        report["steps"].append(f"Encoded categorical columns: {', '.join(categorical_columns)}")

    # Scaling numeric columns (excluding target, and excluding newly created dummy columns)
    if len(numeric_cols) > 0 and scaling_method != "none":
        try:
            if scaling_method == "standard":
                from sklearn.preprocessing import StandardScaler
                scaler = StandardScaler()
                processed[numeric_cols] = scaler.fit_transform(processed[numeric_cols]).round(6)
                report["scaled_columns"] = numeric_cols
                report["steps"].append("Scaled numeric columns using StandardScaler")
            elif scaling_method == "minmax":
                from sklearn.preprocessing import MinMaxScaler
                scaler = MinMaxScaler()
                processed[numeric_cols] = scaler.fit_transform(processed[numeric_cols]).round(6)
                report["scaled_columns"] = numeric_cols
                report["steps"].append("Scaled numeric columns using MinMaxScaler")
            elif scaling_method == "robust":
                from sklearn.preprocessing import RobustScaler
                scaler = RobustScaler()
                processed[numeric_cols] = scaler.fit_transform(processed[numeric_cols]).round(6)
                report["scaled_columns"] = numeric_cols
                report["steps"].append("Scaled numeric columns using RobustScaler")
        except Exception as e:
            report["steps"].append(f"Skipped feature scaling due to error: {e}")

    # Convert all newly created bool/dummy columns (excluding target) to integer (0/1)
    for col in processed.select_dtypes(include="bool").columns:
        if col != target:
            processed[col] = processed[col].astype(int)

    report["final_rows"] = int(len(processed))
    report["final_columns"] = int(len(processed.columns))
    return processed, report


def train_dataset_model(
    df: pd.DataFrame,
    target_column: str | None = None,
    algorithm: str | None = None
) -> dict[str, Any]:
    if df.empty or len(df.columns) < 2:
        return {"error": "Dataset must contain at least two columns and one row"}

    # Target column resolution
    is_total_dataset = (target_column == "Total Dataset")
    if is_total_dataset:
        target = df.columns[-1]
    else:
        target = target_column if (target_column and target_column in df.columns) else df.columns[-1]

    # Clean and prepare the data
    # 1. Drop duplicate rows first from the combined dataframe
    data = df.drop_duplicates().copy()
    # 2. Drop rows where target is missing (instead of imputing it)
    data = data.dropna(subset=[target])
    
    if len(data) < 6:
        return {"error": "At least 6 valid rows are required for training and validation"}

    y = data[target]
    features = data.drop(columns=[target])

    # 3. Impute categorical feature columns with mode (if they have missing values)
    categorical_cols = list(features.select_dtypes(exclude="number").columns)
    for col in categorical_cols:
        if features[col].isna().sum() > 0:
            mode = features[col].mode(dropna=True)
            fill_val = mode.iloc[0] if not mode.empty else "Unknown"
            features[col] = features[col].fillna(fill_val)

    # Drop high-cardinality categorical columns before one-hot encoding to prevent memory explosion
    for col in list(features.columns):
        if not pd.api.types.is_numeric_dtype(features[col]):
            unique_count = features[col].nunique()
            if unique_count > 100:
                features = features.drop(columns=[col])

    # Preprocess features: one-hot encode categoricals, fillna
    features = pd.get_dummies(features, drop_first=False)

    # Convert bool columns to integer (0/1) so they are treated as numeric and not dropped
    for col in features.select_dtypes(include="bool").columns:
        features[col] = features[col].astype(int)

    numeric_features = list(features.select_dtypes(include="number").columns)
    if len(numeric_features) > 0:
        for col in numeric_features:
            features[col] = features[col].fillna(features[col].median())

    features = features.select_dtypes(include="number").fillna(0)
    if features.empty:
        return {"error": "No numeric or encodable feature columns found for training"}

    # Heuristic task type selection
    is_numeric_target = pd.api.types.is_numeric_dtype(y)
    unique_target_count = y.nunique()

    # If numeric and has >10 unique values -> regression, else classification
    task_type = "regression" if (is_numeric_target and unique_target_count > 10) else "classification"

    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(
        features, y, test_size=0.2, random_state=42
    )

    if len(X_train) == 0 or len(X_test) == 0:
        return {"error": "Insufficient data to split into train and test sets"}

    if task_type == "regression":
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        from sklearn.linear_model import LinearRegression
        from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor

        models = {
            "linear_regression": LinearRegression(),
            "random_forest": RandomForestRegressor(n_estimators=100, random_state=42),
            "gradient_boosting": GradientBoostingRegressor(n_estimators=100, random_state=42)
        }
        if xgb is not None:
            models["xgboost"] = xgb.XGBRegressor(n_estimators=100, random_state=42, verbosity=0)
        if cb is not None:
            models["catboost"] = cb.CatBoostRegressor(n_estimators=100, random_state=42, verbose=0)

        # Select algorithm
        selected_alg = algorithm if (algorithm in models) else "auto"

        best_name = ""
        best_r2 = -float("inf")
        best_model = None

        if selected_alg == "auto":
            # Try all and select best
            for name, model in models.items():
                try:
                    model.fit(X_train, y_train)
                    preds = model.predict(X_test)
                    r2 = r2_score(y_test, preds)
                    if r2 > best_r2:
                        best_r2 = r2
                        best_name = name
                        best_model = model
                except Exception:
                    continue
            if not best_model:
                best_name = "linear_regression"
                best_model = models[best_name]
                best_model.fit(X_train, y_train)
        else:
            best_name = selected_alg
            best_model = models[selected_alg]
            best_model.fit(X_train, y_train)

        # Predict and evaluate
        predictions = best_model.predict(X_test)
        mae = float(mean_absolute_error(y_test, predictions))
        rmse = float(np.sqrt(mean_squared_error(y_test, predictions)))
        r2 = float(r2_score(y_test, predictions))

        # Feature importance
        feature_importances = {}
        if hasattr(best_model, "feature_importances_"):
            importances = best_model.feature_importances_
            indices = np.argsort(importances)[::-1][:5]
            for idx in indices:
                feature_importances[features.columns[idx]] = round(float(importances[idx]), 4)

        model_display_names = {
            "linear_regression": "Linear Regression",
            "random_forest": "Random Forest Regressor",
            "gradient_boosting": "Gradient Boosting Regressor",
            "xgboost": "XGBoost Regressor",
            "catboost": "CatBoost Regressor"
        }

        return {
            "target_column": "Total Dataset" if is_total_dataset else target,
            "model_type": model_display_names.get(best_name, best_name.title()),
            "task_type": "regression",
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test)),
            "feature_count": int(features.shape[1]),
            "metrics": {
                "r2_score": round(r2, 4),
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
            },
            "feature_importances": feature_importances,
            "sample_predictions": [
                {"actual": round(float(a), 4), "predicted": round(float(p), 4)}
                for a, p in zip(y_test.iloc[:5], predictions[:5])
            ],
        }

    else:
        # Classification
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
        from sklearn.linear_model import LogisticRegression
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.svm import SVC
        from sklearn.preprocessing import LabelEncoder

        # Force string representation for classification labels
        y_train_str = y_train.astype(str)
        y_test_str = y_test.astype(str)

        le = LabelEncoder()
        y_train_encoded = le.fit_transform(y_train_str)
        train_classes = set(le.classes_)
        classes = sorted(list(le.classes_))

        # Filter test set to contain only classes present in training set
        test_mask = y_test_str.isin(train_classes)
        if test_mask.any():
            X_test_final = X_test[test_mask]
            y_test_str_final = y_test_str[test_mask]
        else:
            X_test_final = X_test
            y_test_str_final = y_test_str

        # Transform test labels safely, mapping unseen classes to 0 index fallback
        y_test_encoded = np.array([
            le.transform([val])[0] if val in train_classes else 0 
            for val in y_test_str_final
        ])

        models = {
            "logistic_regression": LogisticRegression(max_iter=1000, random_state=42),
            "random_forest": RandomForestClassifier(n_estimators=100, random_state=42),
            "svm": SVC(probability=True, random_state=42)
        }
        if xgb is not None:
            models["xgboost"] = xgb.XGBClassifier(n_estimators=100, random_state=42, verbosity=0)
        if cb is not None:
            models["catboost"] = cb.CatBoostClassifier(n_estimators=100, random_state=42, verbose=0)

        # Select algorithm
        selected_alg = algorithm if (algorithm in models) else "auto"

        best_name = ""
        best_acc = -float("inf")
        best_model = None

        if selected_alg == "auto":
            # Try all and select best
            for name, model in models.items():
                try:
                    model.fit(X_train, y_train_encoded)
                    preds = model.predict(X_test_final)
                    acc = accuracy_score(y_test_encoded, preds)
                    if acc > best_acc:
                        best_acc = acc
                        best_name = name
                        best_model = model
                except Exception:
                    continue
            if not best_model:
                best_name = "random_forest"
                best_model = models[best_name]
                best_model.fit(X_train, y_train_encoded)
        else:
            best_name = selected_alg
            best_model = models[selected_alg]
            best_model.fit(X_train, y_train_encoded)

        # Predict and evaluate
        predictions_encoded = best_model.predict(X_test_final)
        predictions = le.inverse_transform(predictions_encoded)
        
        accuracy = float(accuracy_score(y_test_str_final, predictions))

        # Calculate scores with zero_division handling for undefined metrics
        precision = float(precision_score(y_test_str_final, predictions, average="weighted", zero_division=0))
        recall = float(recall_score(y_test_str_final, predictions, average="weighted", zero_division=0))
        f1 = float(f1_score(y_test_str_final, predictions, average="weighted", zero_division=0))

        cm = confusion_matrix(y_test_str_final, predictions)
        confusion_matrix_data = {
            "classes": classes,
            "matrix": cm.tolist()
        }

        # Feature importance
        feature_importances = {}
        if hasattr(best_model, "feature_importances_"):
            importances = best_model.feature_importances_
            indices = np.argsort(importances)[::-1][:5]
            for idx in indices:
                feature_importances[features.columns[idx]] = round(float(importances[idx]), 4)

        model_display_names = {
            "logistic_regression": "Logistic Regression",
            "random_forest": "Random Forest Classifier",
            "svm": "Support Vector Machine (SVC)",
            "xgboost": "XGBoost Classifier",
            "catboost": "CatBoost Classifier"
        }

        return {
            "target_column": "Total Dataset" if is_total_dataset else target,
            "model_type": model_display_names.get(best_name, best_name.title()),
            "task_type": "classification",
            "train_rows": int(len(X_train)),
            "test_rows": int(len(X_test_final)),
            "feature_count": int(features.shape[1]),
            "metrics": {
                "accuracy": round(accuracy, 4),
                "f1_score": round(f1, 4),
                "precision": round(precision, 4),
                "recall": round(recall, 4),
            },
            "feature_importances": feature_importances,
            "confusion_matrix": confusion_matrix_data,
            "sample_predictions": [
                {"actual": str(a), "predicted": str(p)}
                for a, p in zip(y_test_str_final.iloc[:5], predictions[:5])
            ],
        }


def json_dumps(data: dict[str, Any]) -> str:
    return json.dumps(data, default=str)


def json_loads(data: str | None) -> dict[str, Any]:
    if not data:
        return {}
    return json.loads(data)
