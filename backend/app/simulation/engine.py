from typing import List, Tuple, Dict, Any
from app.schemas.schemas import ProcessInput, SimulationResponse, Metrics, GanttBlock, PredictionError, PredictionDetail
from app.ml_model.predictor import BurstPredictor
from dataclasses import dataclass, field
import numpy as np

@dataclass
class ProcessState:
    id: str
    arrival: float
    bursts: List[float]
    current_burst_index: int = 0
    history: List[float] = field(default_factory=list)
    completion_time: float = 0.0

    @property
    def is_finished(self) -> bool:
        return self.current_burst_index >= len(self.bursts)

    @property
    def current_burst(self) -> float:
        if self.is_finished: return 0.0
        return self.bursts[self.current_burst_index]

    def complete_current_burst(self, current_time: float):
        actual_burst = self.current_burst
        self.history.append(actual_burst)
        self.current_burst_index += 1
        self.completion_time = current_time

def run_simulation(processes_input: List[ProcessInput], algorithm: str) -> SimulationResponse:
    processes = [
        ProcessState(id=p.id, arrival=float(p.arrival), bursts=p.bursts.copy())
        for p in processes_input
    ]
    
    time = 0.0
    ready_queue: List[ProcessState] = []
    unarrived = sorted(processes, key=lambda x: x.arrival)
    
    gantt_chart: List[GanttBlock] = []
    prediction_details: List[PredictionDetail] = []

    while unarrived or ready_queue:
        # Move newly arrived processes to ready queue
        while unarrived and unarrived[0].arrival <= time:
            ready_queue.append(unarrived.pop(0))
            
        if not ready_queue:
            # Jump time to next arrival
            time = unarrived[0].arrival
            continue

        # Select next process based on algorithm
        if algorithm == "FCFS":
            selected_idx = 0
        elif algorithm == "SJF":
            selected_idx = min(range(len(ready_queue)), key=lambda i: ready_queue[i].current_burst)
        elif algorithm == "ML-SJF":
            predictions_for_queue = [
                BurstPredictor.predict(p.history, method="linear_regression")
                for p in ready_queue
            ]
            selected_idx = min(range(len(ready_queue)), key=lambda i: predictions_for_queue[i])
            
            selected_process = ready_queue[selected_idx]
            actual = selected_process.current_burst
            predicted = predictions_for_queue[selected_idx]
            error = abs(predicted - actual)
            
            prediction_details.append(
                PredictionDetail(
                    process=selected_process.id,
                    actual=round(actual, 2),
                    predicted=round(predicted, 2),
                    error=round(error, 2)
                )
            )
        else:
            selected_idx = 0 
            
        p = ready_queue.pop(selected_idx)
        
        start_time = time
        burst = p.current_burst
        time += burst
        
        gantt_chart.append(GanttBlock(process=p.id, start=start_time, end=time))
        p.complete_current_burst(time)
        
        if not p.is_finished:
            ready_queue.append(p)
            
    # Calculate Metrics
    total_waiting_time = 0.0
    total_turnaround_time = 0.0
    total_bursts_time = sum(sum(p.bursts) for p in processes)
    
    for p in processes:
        turnaround = p.completion_time - p.arrival
        waiting = turnaround - sum(p.bursts)
        total_turnaround_time += turnaround
        total_waiting_time += waiting
        
    n = len(processes)
    avg_waiting = total_waiting_time / n if n > 0 else 0.0
    avg_turnaround = total_turnaround_time / n if n > 0 else 0.0
    
    total_execution_time = gantt_chart[-1].end if gantt_chart else 0.0
    cpu_utilization = (total_bursts_time / total_execution_time * 100) if total_execution_time > 0 else 0.0
    cpu_idle_time = total_execution_time - total_bursts_time
    throughput = n / total_execution_time if total_execution_time > 0 else 0.0

    pred_error = None
    if algorithm == "ML-SJF" and prediction_details:
        errors = [d.error for d in prediction_details]
        mae = float(np.mean(errors))
        mse = float(np.mean([e**2 for e in errors]))
        pred_error = PredictionError(mae=round(mae, 2), mse=round(mse, 2), details=prediction_details)

    metrics = Metrics(
        avg_waiting_time=round(avg_waiting, 2),
        avg_turnaround_time=round(avg_turnaround, 2),
        cpu_utilization=round(cpu_utilization, 2),
        throughput=round(throughput, 4),
        cpu_idle_time=round(cpu_idle_time, 2),
        total_execution_time=round(total_execution_time, 2)
    )

    return SimulationResponse(
        metrics=metrics,
        gantt_chart=gantt_chart,
        prediction_error=pred_error
    )
