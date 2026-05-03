import numpy as np
from typing import List, Dict, Tuple, Any
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor

class BurstPredictor:
    def __init__(self):
        self.rf_model = None
        self.is_rf_trained = False
        self.training_data_X = []
        self.training_data_y = []
        
        # Track errors for ensemble weighting
        self.method_errors = {
            "moving_average": [],
            "exponential_avg": [],
            "linear_regression": [],
            "random_forest": []
        }

    @staticmethod
    def extract_features(history: List[float], process_info: Dict[str, Any] = None) -> Dict[str, float]:
        """Engineers features from burst history and system state."""
        process_info = process_info or {}
        if not history:
            return {
                "burst_index": 0.0,
                "last_burst": 5.0,
                "mean_burst": 5.0,
                "std_burst": 0.0,
                "trend": 0.0,
                "burst_ratio": 1.0,
                "io_ratio": float(process_info.get("io_ratio", 0.0)),
                "queue_depth": float(process_info.get("queue_depth", 0.0))
            }

        last_burst = history[-1]
        mean_burst = np.mean(history)
        std_burst = np.std(history) if len(history) > 1 else 0.0
        
        trend = 0.0
        if len(history) >= 2:
            n = min(len(history), 3)
            recent = history[-n:]
            trend = (recent[-1] - recent[0]) / n
            
        burst_ratio = last_burst / mean_burst if mean_burst > 0 else 1.0

        return {
            "burst_index": float(len(history)),
            "last_burst": float(last_burst),
            "mean_burst": float(mean_burst),
            "std_burst": float(std_burst),
            "trend": float(trend),
            "burst_ratio": float(burst_ratio),
            "io_ratio": float(process_info.get("io_ratio", 0.0)),
            "queue_depth": float(process_info.get("queue_depth", 0.0))
        }

    @staticmethod
    def moving_average(history: List[float], window: int = 3) -> float:
        if not history:
            return 5.0
        n = min(len(history), window)
        return sum(history[-n:]) / n

    @staticmethod
    def exponential_avg(history: List[float], alpha: float = 0.5, initial_guess: float = 5.0) -> float:
        if not history:
            return initial_guess
        predicted = initial_guess
        for actual in history:
            predicted = alpha * actual + (1 - alpha) * predicted
        return predicted

    @staticmethod
    def linear_regression(history: List[float]) -> float:
        if not history:
            return 5.0
        if len(history) == 1:
            return history[0]
        
        X = np.array(range(1, len(history) + 1)).reshape(-1, 1)
        y = np.array(history)
        model = LinearRegression()
        model.fit(X, y)
        prediction = model.predict(np.array([[len(history) + 1]]))[0]
        return max(1.0, float(prediction))

    def random_forest(self, features: Dict[str, float]) -> float:
        if not self.is_rf_trained or not self.rf_model:
            return features["mean_burst"]
        
        X = np.array([list(features.values())])
        prediction = self.rf_model.predict(X)[0]
        return max(1.0, float(prediction))

    def ensemble(self, base_preds: Dict[str, float]) -> float:
        weights = {}
        for method, errors in self.method_errors.items():
            if not errors:
                weights[method] = 1.0
            else:
                mean_err = np.mean(errors[-5:])
                weights[method] = 1.0 / (mean_err + 0.1)
        
        total_weight = sum(weights.values())
        if total_weight == 0:
            return base_preds["moving_average"]
            
        ensemble_pred = sum(base_preds[m] * (weights[m] / total_weight) for m in weights if m in base_preds)
        return max(1.0, float(ensemble_pred))

    def predict_all(self, history: List[float], process_info: Dict[str, Any] = None) -> Tuple[Dict[str, float], Dict[str, float]]:
        features = self.extract_features(history, process_info)
        
        preds = {
            "moving_average": self.moving_average(history),
            "exponential_avg": self.exponential_avg(history),
            "linear_regression": self.linear_regression(history),
            "random_forest": self.random_forest(features)
        }
        preds["ensemble"] = self.ensemble(preds)
        return preds, features

    def record_actual(self, features: Dict[str, float], actual: float, predictions: Dict[str, float]):
        """Called after actual is known to update RF and ensemble weights."""
        self.training_data_X.append(list(features.values()))
        self.training_data_y.append(actual)
        
        if len(self.training_data_X) >= 2:
            self.rf_model = RandomForestRegressor(n_estimators=10, random_state=42)
            self.rf_model.fit(self.training_data_X, self.training_data_y)
            self.is_rf_trained = True

        for method, pred in predictions.items():
            if method in self.method_errors:
                self.method_errors[method].append(abs(actual - pred))
