from typing import List
import numpy as np
from sklearn.linear_model import LinearRegression

class BurstPredictor:
    @staticmethod
    def moving_average(history: List[float], window: int = 3) -> float:
        if not history:
            return 5.0  # Default initial guess
        n = min(len(history), window)
        return sum(history[-n:]) / n

    @staticmethod
    def exponential_averaging(history: List[float], alpha: float = 0.5, initial_guess: float = 5.0) -> float:
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
        
        next_idx = np.array([[len(history) + 1]])
        prediction = model.predict(next_idx)[0]
        
        # Avoid negative predictions
        return max(1.0, float(prediction))

    @classmethod
    def predict(cls, history: List[float], method: str = "linear_regression") -> float:
        if method == "moving_average":
            return cls.moving_average(history)
        elif method == "exponential_averaging":
            return cls.exponential_averaging(history)
        else: # linear_regression
            return cls.linear_regression(history)
