from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.schemas import SimulationConfig, SimulationResponse
from app.simulation.engine import run_simulation
from app.simulation.schedulers import SCHEDULER_MAP

app = FastAPI(title="CPU Scheduler ML Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/simulate", response_model=SimulationResponse)
def simulate(config: SimulationConfig):
    try:
        response = run_simulation(config)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/algorithms")
def list_algorithms():
    """List all available scheduling algorithms and their config requirements."""
    algo_info = {
        "FCFS": {"name": "First-Come, First-Served", "preemptive": False, "needs_quantum": False, "needs_priority": False},
        "SJF": {"name": "Shortest Job First", "preemptive": False, "needs_quantum": False, "needs_priority": False},
        "SRTF": {"name": "Shortest Remaining Time First", "preemptive": True, "needs_quantum": False, "needs_priority": False},
        "RR": {"name": "Round Robin", "preemptive": True, "needs_quantum": True, "needs_priority": False},
        "Priority": {"name": "Priority (Non-Preemptive)", "preemptive": False, "needs_quantum": False, "needs_priority": True},
        "Priority-P": {"name": "Priority (Preemptive)", "preemptive": True, "needs_quantum": False, "needs_priority": True},
        "ML-SJF": {"name": "ML-Enhanced SJF", "preemptive": False, "needs_quantum": False, "needs_priority": False},
    }
    return {"algorithms": algo_info}

@app.get("/")
def read_root():
    return {"message": "CPU Scheduler ML Prediction API is running"}
