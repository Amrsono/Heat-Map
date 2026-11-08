# services/inference-engine/model.py
"""
Gradient Booster Matrix Model for Rideshare Driver Profit Optimization.
Vector inputs: [Day, Time Window, Hex Index Hash, Event Proximity, Volume, Weather Coefficient]
Predicts: 30-minute advance surge multiplier (profit_coefficient).
"""

import os
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
import joblib

MODEL_PATH = os.environ.get("MODEL_PATH", "surge_gradient_booster.joblib")

class SurgePredictorModel:
    def __init__(self):
        # High-performance Gradient Boosting Regressor for real-time edge scoring
        self.regressor = GradientBoostingRegressor(
            n_estimators=120,
            learning_rate=0.08,
            max_depth=5,
            subsample=0.85,
            random_state=42
        )
        self.is_trained = False

    @staticmethod
    def hash_hex_index(h3_index: str) -> int:
        """Deterministically hashes H3 hex string to an integer bucket."""
        return int(h3_index, 16) % 1000

    def prepare_feature_matrix(self, records: list[dict]) -> np.ndarray:
        """
        Extracts vector: [day_of_week, time_window, hex_hash, event_proximity_m, volume, weather_coeff]
        """
        features = []
        for r in records:
            day_of_week = r.get("day_of_week", 0)  # 0: Monday ... 6: Sunday
            time_window = r.get("time_window", 18) # 0 to 23 hours
            hex_hash = self.hash_hex_index(r.get("h3_index", "8828308281fffff"))
            event_proximity = r.get("event_proximity_m", 1500.0) # meters
            volume = r.get("volume", 50.0) # expected attendee or passenger volume
            weather_coeff = r.get("weather_coeff", 1.0) # 1.0 = clear, 1.4 = heavy rain

            features.append([
                day_of_week,
                time_window,
                hex_hash,
                event_proximity,
                volume,
                weather_coeff
            ])
        return np.array(features, dtype=np.float32)

    def train_synthetic_baseline(self):
        """
        Generates domain-grounded synthetic historical matrices to initialize
        the gradient booster when historical training logs are cold-starting.
        """
        np.random.seed(42)
        n_samples = 2500

        day = np.random.randint(0, 7, size=n_samples)
        hour = np.random.randint(0, 24, size=n_samples)
        hex_hash = np.random.randint(0, 1000, size=n_samples)
        proximity = np.random.uniform(50, 6000, size=n_samples) # meters
        volume = np.random.uniform(10, 300, size=n_samples)
        weather = np.random.choice([1.0, 1.1, 1.25, 1.45], p=[0.7, 0.15, 0.1, 0.05], size=n_samples)

        # Ground truth surge physics:
        # Surge is higher during rush hours (8-10, 17-21), closer proximity (< 1km),
        # higher volume, and poor weather.
        rush_hour_boost = np.where((hour >= 7) & (hour <= 9) | (hour >= 17) & (hour <= 22), 0.35, 0.0)
        proximity_boost = np.clip(1.2 - (proximity / 4000.0), 0.0, 0.8)
        volume_boost = (volume / 300.0) * 0.7
        weather_boost = (weather - 1.0) * 1.2

        noise = np.random.normal(0, 0.05, size=n_samples)
        y = 1.0 + rush_hour_boost + proximity_boost + volume_boost + weather_boost + noise
        y = np.clip(y, 1.00, 2.75)

        X = np.column_stack([day, hour, hex_hash, proximity, volume, weather])
        self.regressor.fit(X, y)
        self.is_trained = True
        return self

    def predict_surge(self, records: list[dict]) -> np.ndarray:
        """
        Outputs 30-minute advance forecast surge multiplier for each record.
        """
        if not self.is_trained:
            self.train_synthetic_baseline()

        X = self.prepare_feature_matrix(records)
        predictions = self.regressor.predict(X)
        return np.round(np.clip(predictions, 1.00, 2.80), 2)

    def save(self, filepath: str = MODEL_PATH):
        joblib.dump(self.regressor, filepath)

    def load(self, filepath: str = MODEL_PATH):
        if os.path.exists(filepath):
            self.regressor = joblib.load(filepath)
            self.is_trained = True
