"""Simulation engine — dispatches to the correct scheduler."""

from app.schemas.schemas import SimulationConfig, SimulationResponse
from app.simulation.schedulers import get_scheduler


def run_simulation(config: SimulationConfig) -> SimulationResponse:
    """Run a scheduling simulation with the given configuration."""
    scheduler = get_scheduler(config.algorithm)
    return scheduler.run(config)
