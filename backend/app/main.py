from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.schemas import SimulationRequest, SimulationResponse
from app.simulation.engine import run_simulation

app = FastAPI(title="CPU Scheduler ML Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/simulate", response_model=SimulationResponse)
def simulate(request: SimulationRequest):
    try:
        response = run_simulation(request.processes, request.algorithm)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"message": "CPU Scheduler ML Prediction API is running"}
