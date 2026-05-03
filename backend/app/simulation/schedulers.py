"""Concrete scheduler implementations for all 7 algorithms."""

from __future__ import annotations
from typing import List, Optional
import numpy as np

from app.schemas.schemas import (
    SimulationConfig, PredictionError, PredictionDetail, SimulationResponse
)
from app.simulation.base_scheduler import BaseScheduler
from app.simulation.process_state import ProcessState
from app.ml_model.predictor import BurstPredictor
from app.ml_model.evaluator import MLEvaluator


# ═══════════════════════════════════════════════════════════════════
# NON-PREEMPTIVE SCHEDULERS
# ═══════════════════════════════════════════════════════════════════

class FCFSScheduler(BaseScheduler):
    """First-Come, First-Served: FIFO ordering, non-preemptive."""

    def _select_process(self, ready_queue: List[ProcessState], config: SimulationConfig) -> ProcessState:
        return ready_queue[0]  # Already in arrival order

    def _get_execution_duration(self, process: ProcessState, config: SimulationConfig) -> float:
        return process.remaining_cpu_burst  # Run to completion

    def _is_preemptive(self) -> bool:
        return False


class SJFScheduler(BaseScheduler):
    """Shortest Job First: select shortest current CPU burst, non-preemptive."""

    def _select_process(self, ready_queue: List[ProcessState], config: SimulationConfig) -> ProcessState:
        return min(ready_queue, key=lambda p: p.remaining_cpu_burst)

    def _get_execution_duration(self, process: ProcessState, config: SimulationConfig) -> float:
        return process.remaining_cpu_burst

    def _is_preemptive(self) -> bool:
        return False


class PriorityScheduler(BaseScheduler):
    """Priority (Non-Preemptive): select by effective priority with aging."""

    def _select_process(self, ready_queue: List[ProcessState], config: SimulationConfig) -> ProcessState:
        self._apply_aging(ready_queue, config.aging_rate or 1.0, 0)
        return min(ready_queue, key=lambda p: p.effective_priority)

    def _apply_aging(self, ready_queue: List[ProcessState], aging_rate: float, time: float):
        for p in ready_queue:
            p.apply_aging(aging_rate, time)

    def _get_execution_duration(self, process: ProcessState, config: SimulationConfig) -> float:
        return process.remaining_cpu_burst

    def _is_preemptive(self) -> bool:
        return False


class MLSJFScheduler(BaseScheduler):
    """ML-Enhanced SJF: uses ML predictions for burst estimation."""

    def __init__(self):
        super().__init__()
        self.prediction_details: List[PredictionDetail] = []
        self.predictor = BurstPredictor()
        
        # State for evaluation
        self.all_actuals = []
        self.method_predictions = {
            "moving_average": [],
            "exponential_avg": [],
            "linear_regression": [],
            "random_forest": [],
            "ensemble": []
        }
        self.active_method = "ensemble"
        self._prediction_error = None

    def run(self, config: SimulationConfig) -> SimulationResponse:
        self.active_method = config.ml_method or "ensemble"
        response = super().run(config)
        
        # After simulation, evaluate ML
        response.prediction_error = MLEvaluator.evaluate(
            active_method=self.active_method,
            all_actuals=self.all_actuals,
            method_predictions=self.method_predictions,
            details=self.prediction_details,
            config=config,
            ml_avg_wt=response.metrics.avg_waiting_time,
            ml_avg_tat=response.metrics.avg_turnaround_time
        )
        return response

    def _select_process(self, ready_queue: List[ProcessState], config: SimulationConfig) -> ProcessState:
        predictions_map = {}
        features_map = {}
        all_preds_map = {}
        
        queue_depth = len(ready_queue)
        
        for p in ready_queue:
            process_info = {
                "queue_depth": float(queue_depth),
                "io_ratio": (p.total_io_time / p.first_run_time) if p.first_run_time and p.first_run_time > 0 else 0.0
            }
            
            preds, features = self.predictor.predict_all(p.history, process_info)
            all_preds_map[p.id] = preds
            features_map[p.id] = features
            predictions_map[p.id] = preds.get(self.active_method, preds["moving_average"])

        selected = min(ready_queue, key=lambda p: predictions_map[p.id])
        
        actual = selected.remaining_cpu_burst
        predicted = predictions_map[selected.id]
        error = abs(predicted - actual)
        
        self.predictor.record_actual(features_map[selected.id], actual, all_preds_map[selected.id])
        
        self.all_actuals.append(actual)
        for method, p_val in all_preds_map[selected.id].items():
            if method not in self.method_predictions:
                self.method_predictions[method] = []
            self.method_predictions[method].append(p_val)
            
        self.prediction_details.append(PredictionDetail(
            process=selected.id,
            actual=round(actual, 2),
            predicted=round(predicted, 2),
            error=round(error, 2),
            method=self.active_method,
            features_used={k: round(v, 2) for k, v in features_map[selected.id].items()}
        ))

        return selected

    def _get_execution_duration(self, process: ProcessState, config: SimulationConfig) -> float:
        return process.remaining_cpu_burst

    def _is_preemptive(self) -> bool:
        return False


# ═══════════════════════════════════════════════════════════════════
# PREEMPTIVE SCHEDULERS
# ═══════════════════════════════════════════════════════════════════

class SRTFScheduler(BaseScheduler):
    """Shortest Remaining Time First: preemptive version of SJF."""

    def _select_process(self, ready_queue: List[ProcessState], config: SimulationConfig) -> ProcessState:
        return min(ready_queue, key=lambda p: p.remaining_cpu_burst)

    def _get_execution_duration(self, process: ProcessState, config: SimulationConfig) -> float:
        # Run until the next possible event (arrival/IO completion)
        return process.remaining_cpu_burst

    def _is_preemptive(self) -> bool:
        return True

    def _should_preempt(
        self, current: ProcessState, ready_queue: List[ProcessState],
        unarrived: List[ProcessState], time: float, config: SimulationConfig
    ) -> bool:
        if not ready_queue:
            return False
        shortest_in_queue = min(p.remaining_cpu_burst for p in ready_queue)
        return shortest_in_queue < current.remaining_cpu_burst


class RoundRobinScheduler(BaseScheduler):
    """Round Robin: time-quantum based preemption, FIFO ready queue."""

    def _select_process(self, ready_queue: List[ProcessState], config: SimulationConfig) -> ProcessState:
        return ready_queue[0]  # FIFO

    def _get_execution_duration(self, process: ProcessState, config: SimulationConfig) -> float:
        quantum = config.time_quantum or 2.0
        return min(quantum, process.remaining_cpu_burst)

    def _is_preemptive(self) -> bool:
        return True

    def _should_preempt(
        self, current: ProcessState, ready_queue: List[ProcessState],
        unarrived: List[ProcessState], time: float, config: SimulationConfig
    ) -> bool:
        # RR preemption is handled by _get_execution_duration limiting the burst.
        # After execution, if remaining > 0, the base loop will see this and
        # we return True to send it back to the queue.
        return current.remaining_cpu_burst > 1e-9


class PreemptivePriorityScheduler(BaseScheduler):
    """Priority (Preemptive): re-evaluate on arrival, with aging."""

    def _select_process(self, ready_queue: List[ProcessState], config: SimulationConfig) -> ProcessState:
        self._apply_aging(ready_queue, config.aging_rate or 1.0, 0)
        return min(ready_queue, key=lambda p: p.effective_priority)

    def _apply_aging(self, ready_queue: List[ProcessState], aging_rate: float, time: float):
        for p in ready_queue:
            p.apply_aging(aging_rate, time)

    def _get_execution_duration(self, process: ProcessState, config: SimulationConfig) -> float:
        return process.remaining_cpu_burst

    def _is_preemptive(self) -> bool:
        return True

    def _should_preempt(
        self, current: ProcessState, ready_queue: List[ProcessState],
        unarrived: List[ProcessState], time: float, config: SimulationConfig
    ) -> bool:
        if not ready_queue:
            return False
        # Apply aging before comparison
        self._apply_aging(ready_queue, config.aging_rate or 1.0, time)
        best_in_queue = min(p.effective_priority for p in ready_queue)
        return best_in_queue < current.effective_priority


# ═══════════════════════════════════════════════════════════════════
# SCHEDULER REGISTRY
# ═══════════════════════════════════════════════════════════════════

SCHEDULER_MAP = {
    "FCFS": FCFSScheduler,
    "SJF": SJFScheduler,
    "SRTF": SRTFScheduler,
    "RR": RoundRobinScheduler,
    "Priority": PriorityScheduler,
    "Priority-P": PreemptivePriorityScheduler,
    "ML-SJF": MLSJFScheduler,
}


def get_scheduler(algorithm: str) -> BaseScheduler:
    """Factory function to get a scheduler instance by algorithm name."""
    cls = SCHEDULER_MAP.get(algorithm)
    if cls is None:
        raise ValueError(
            f"Unknown algorithm '{algorithm}'. "
            f"Available: {list(SCHEDULER_MAP.keys())}"
        )
    return cls()
