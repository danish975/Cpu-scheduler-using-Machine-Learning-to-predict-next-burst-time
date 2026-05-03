from pydantic import BaseModel
from typing import List, Optional, Dict


class ProcessInput(BaseModel):
    id: str
    arrival: int
    cpu_bursts: List[float]
    io_bursts: Optional[List[float]] = None
    priority: Optional[int] = None  # Lower number = higher priority (Unix-style)


class SimulationConfig(BaseModel):
    algorithm: str  # "FCFS", "SJF", "SRTF", "RR", "Priority", "Priority-P", "ML-SJF"
    processes: List[ProcessInput]
    time_quantum: Optional[float] = 2.0
    context_switch_time: Optional[float] = 0.0
    aging_rate: Optional[float] = 1.0
    ml_method: Optional[str] = "ensemble"  # "moving_average", "exponential_avg", "linear_regression", "random_forest", "ensemble"


class GanttBlock(BaseModel):
    process: str
    start: float
    end: float
    block_type: str = "cpu"  # "cpu", "io", "context_switch", "idle"


class PerProcessMetrics(BaseModel):
    process_id: str
    arrival_time: float
    completion_time: float
    turnaround_time: float
    waiting_time: float
    response_time: float
    io_time: float
    num_preemptions: int


class PredictionDetail(BaseModel):
    process: str
    actual: float
    predicted: float
    error: float
    method: Optional[str] = None
    features_used: Optional[Dict[str, float]] = None


class MethodEvaluation(BaseModel):
    method: str
    mae: float
    mse: float
    mape: float
    r_squared: float


class PredictionError(BaseModel):
    mae: Optional[float] = None
    mse: Optional[float] = None
    mape: Optional[float] = None
    r_squared: Optional[float] = None
    method_used: Optional[str] = None
    all_methods: Optional[List[MethodEvaluation]] = None
    oracle_wt_improvement_pct: Optional[float] = None
    oracle_tat_improvement_pct: Optional[float] = None
    details: Optional[List[PredictionDetail]] = None


class Metrics(BaseModel):
    avg_waiting_time: float
    avg_turnaround_time: float
    avg_response_time: float
    cpu_utilization: float
    throughput: float
    cpu_idle_time: float
    total_execution_time: float
    total_context_switches: int
    context_switch_overhead: float
    per_process: List[PerProcessMetrics]


class SimulationResponse(BaseModel):
    metrics: Metrics
    gantt_chart: List[GanttBlock]
    prediction_error: Optional[PredictionError] = None
