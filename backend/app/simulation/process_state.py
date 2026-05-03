"""Enhanced process state for all scheduling algorithms."""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional


class ProcessStatus(str, Enum):
    NEW = "new"
    READY = "ready"
    RUNNING = "running"
    BLOCKED = "blocked"  # Waiting for I/O
    FINISHED = "finished"


@dataclass
class ProcessState:
    """Tracks the full lifecycle of a process through the scheduler."""

    id: str
    arrival: float
    cpu_bursts: List[float]
    io_bursts: List[float] = field(default_factory=list)
    base_priority: int = 10  # Lower = higher priority (Unix-style)

    # --- Runtime state ---
    status: ProcessStatus = ProcessStatus.NEW
    current_cpu_burst_index: int = 0
    current_io_burst_index: int = 0
    remaining_cpu_burst: float = 0.0

    # --- Scheduling metadata ---
    effective_priority: float = 0.0  # Modified by aging
    last_ready_time: float = 0.0     # When the process last entered READY
    history: List[float] = field(default_factory=list)  # Completed burst history for ML

    # --- Metrics tracking ---
    first_run_time: Optional[float] = None
    completion_time: float = 0.0
    total_wait_time: float = 0.0
    total_io_time: float = 0.0
    num_preemptions: int = 0

    # --- I/O tracking ---
    io_completion_time: Optional[float] = None  # When current I/O finishes

    def __post_init__(self):
        self.effective_priority = float(self.base_priority)
        if self.cpu_bursts:
            self.remaining_cpu_burst = self.cpu_bursts[0]

    @property
    def is_finished(self) -> bool:
        return self.current_cpu_burst_index >= len(self.cpu_bursts)

    @property
    def current_cpu_burst_total(self) -> float:
        """The full duration of the current CPU burst (before any execution)."""
        if self.is_finished:
            return 0.0
        return self.cpu_bursts[self.current_cpu_burst_index]

    @property
    def has_next_io(self) -> bool:
        """Whether there's an I/O burst after the current CPU burst completes."""
        return self.current_io_burst_index < len(self.io_bursts)

    @property
    def current_io_burst(self) -> float:
        if not self.has_next_io:
            return 0.0
        return self.io_bursts[self.current_io_burst_index]

    def start_running(self, current_time: float):
        """Mark this process as running. Record first-run for response time."""
        # Accumulate waiting time
        if self.status == ProcessStatus.READY:
            self.total_wait_time += current_time - self.last_ready_time
        self.status = ProcessStatus.RUNNING
        if self.first_run_time is None:
            self.first_run_time = current_time

    def execute(self, duration: float):
        """Execute for `duration` time units. Returns actual time executed."""
        actual = min(duration, self.remaining_cpu_burst)
        self.remaining_cpu_burst -= actual
        return actual

    def complete_cpu_burst(self, current_time: float):
        """Mark current CPU burst as done. Move to next state."""
        self.history.append(self.cpu_bursts[self.current_cpu_burst_index])
        self.current_cpu_burst_index += 1

        if self.is_finished:
            self.status = ProcessStatus.FINISHED
            self.completion_time = current_time
        elif self.has_next_io:
            # Move to I/O
            io_dur = self.current_io_burst
            self.status = ProcessStatus.BLOCKED
            self.io_completion_time = current_time + io_dur
            self.total_io_time += io_dur
            self.current_io_burst_index += 1
        else:
            # Next CPU burst, no I/O
            self.status = ProcessStatus.READY
            self.last_ready_time = current_time
            self.remaining_cpu_burst = self.cpu_bursts[self.current_cpu_burst_index]

    def complete_io(self, current_time: float):
        """I/O finished. Move back to READY and load next CPU burst."""
        self.status = ProcessStatus.READY
        self.last_ready_time = current_time
        self.io_completion_time = None
        if not self.is_finished:
            self.remaining_cpu_burst = self.cpu_bursts[self.current_cpu_burst_index]

    def preempt(self, current_time: float):
        """Process is preempted. Move back to READY."""
        self.status = ProcessStatus.READY
        self.last_ready_time = current_time
        self.num_preemptions += 1

    def apply_aging(self, aging_rate: float, current_time: float):
        """Decrease effective priority number (= increase priority) based on wait time."""
        if self.status == ProcessStatus.READY:
            wait_duration = current_time - self.last_ready_time
            self.effective_priority = self.base_priority - (wait_duration * aging_rate)

    def reset_aging(self):
        """Reset effective priority after being selected to run."""
        self.effective_priority = float(self.base_priority)

    @property
    def response_time(self) -> float:
        if self.first_run_time is None:
            return 0.0
        return self.first_run_time - self.arrival

    @property
    def turnaround_time(self) -> float:
        return self.completion_time - self.arrival

    @property
    def waiting_time(self) -> float:
        return self.total_wait_time
