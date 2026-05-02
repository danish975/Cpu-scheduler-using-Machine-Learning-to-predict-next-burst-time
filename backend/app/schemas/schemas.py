from pydantic import BaseModel
from typing import List, Optional

class ProcessInput(BaseModel):
    id: str
    arrival: int
    bursts: List[float]

class SimulationRequest(BaseModel):
    algorithm: str # "FCFS", "SJF", "ML-SJF"
    processes: List[ProcessInput]

class Metrics(BaseModel):
    avg_waiting_time: float
    avg_turnaround_time: float
    cpu_utilization: float
    throughput: float
    cpu_idle_time: float
    total_execution_time: float

class GanttBlock(BaseModel):
    process: str
    start: float
    end: float

class PredictionDetail(BaseModel):
    process: str
    actual: float
    predicted: float
    error: float

class PredictionError(BaseModel):
    mae: Optional[float] = None
    mse: Optional[float] = None
    details: Optional[List[PredictionDetail]] = None

class SimulationResponse(BaseModel):
    metrics: Metrics
    gantt_chart: List[GanttBlock]
    prediction_error: Optional[PredictionError] = None
