"""Base scheduler with shared logic for arrival, I/O, context switch, and metrics."""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple

from app.schemas.schemas import (
    SimulationConfig, SimulationResponse, Metrics, GanttBlock,
    PerProcessMetrics, PredictionError,
)
from app.simulation.process_state import ProcessState, ProcessStatus


class BaseScheduler(ABC):
    """Abstract base for all scheduling algorithms."""

    def __init__(self):
        self.gantt_chart: List[GanttBlock] = []
        self.context_switch_count: int = 0
        self.context_switch_total_time: float = 0.0
        self.last_running_pid: Optional[str] = None

    # ── Public entry point ──────────────────────────────────────────

    def run(self, config: SimulationConfig) -> SimulationResponse:
        processes = self._build_processes(config)
        self._simulate(processes, config)
        return self._build_response(processes, config)

    # ── Process construction ────────────────────────────────────────

    @staticmethod
    def _build_processes(config: SimulationConfig) -> List[ProcessState]:
        result = []
        for p in config.processes:
            ps = ProcessState(
                id=p.id,
                arrival=float(p.arrival),
                cpu_bursts=p.cpu_bursts.copy(),
                io_bursts=(p.io_bursts or []).copy(),
                base_priority=p.priority if p.priority is not None else 10,
            )
            result.append(ps)
        return result

    # ── Simulation loop (template method) ───────────────────────────

    def _simulate(self, processes: List[ProcessState], config: SimulationConfig):
        time = 0.0
        ready_queue: List[ProcessState] = []
        blocked_queue: List[ProcessState] = []
        unarrived = sorted(processes, key=lambda x: x.arrival)
        current_process: Optional[ProcessState] = None
        cs_time = config.context_switch_time or 0.0

        while unarrived or ready_queue or blocked_queue or current_process:
            # 1. Check I/O completions
            newly_ready_from_io = self._check_io_completions(blocked_queue, time)
            for p in newly_ready_from_io:
                blocked_queue.remove(p)
                ready_queue.append(p)

            # 2. Admit newly arrived processes
            while unarrived and unarrived[0].arrival <= time:
                p = unarrived.pop(0)
                p.status = ProcessStatus.READY
                p.last_ready_time = time
                ready_queue.append(p)

            # 3. If nothing ready and nothing running, advance time
            if not ready_queue and current_process is None:
                next_time = self._next_event_time(unarrived, blocked_queue)
                if next_time is None:
                    break
                if next_time > time:
                    self.gantt_chart.append(GanttBlock(
                        process="idle", start=time, end=next_time, block_type="idle"
                    ))
                    time = next_time
                continue

            # 4. Apply aging to ready queue (for priority algorithms)
            if hasattr(self, '_apply_aging') and config.aging_rate:
                self._apply_aging(ready_queue, config.aging_rate, time)

            # 5. Select process (algorithm-specific)
            if current_process is None and ready_queue:
                current_process = self._select_process(ready_queue, config)
                ready_queue.remove(current_process)

                # Context switch
                if self.last_running_pid is not None and self.last_running_pid != current_process.id:
                    if cs_time > 0:
                        self.gantt_chart.append(GanttBlock(
                            process="CS", start=time, end=time + cs_time,
                            block_type="context_switch"
                        ))
                        self.context_switch_count += 1
                        self.context_switch_total_time += cs_time
                        time += cs_time
                        # Re-check arrivals after CS
                        while unarrived and unarrived[0].arrival <= time:
                            p2 = unarrived.pop(0)
                            p2.status = ProcessStatus.READY
                            p2.last_ready_time = time
                            ready_queue.append(p2)
                        newly_ready = self._check_io_completions(blocked_queue, time)
                        for p2 in newly_ready:
                            blocked_queue.remove(p2)
                            ready_queue.append(p2)

                current_process.start_running(time)
                if hasattr(current_process, 'reset_aging'):
                    current_process.reset_aging()

            if current_process is None:
                # Edge case: nothing to run even after selection
                next_time = self._next_event_time(unarrived, blocked_queue)
                if next_time is None:
                    break
                time = next_time
                continue

            # 6. Execute (algorithm determines duration)
            exec_duration = self._get_execution_duration(current_process, config)

            # Clamp to next event (arrival or IO completion) for preemptive algorithms
            if self._is_preemptive():
                next_event = self._next_event_time(unarrived, blocked_queue)
                if next_event is not None and next_event < time + exec_duration:
                    exec_duration = next_event - time

            actual_executed = current_process.execute(exec_duration)
            end_time = time + actual_executed

            self.gantt_chart.append(GanttBlock(
                process=current_process.id, start=time, end=end_time, block_type="cpu"
            ))
            self.last_running_pid = current_process.id
            time = end_time

            # 7. Check if CPU burst completed
            if current_process.remaining_cpu_burst <= 1e-9:
                current_process.complete_cpu_burst(time)
                if current_process.status == ProcessStatus.BLOCKED:
                    # Record I/O block in gantt
                    io_end = current_process.io_completion_time
                    self.gantt_chart.append(GanttBlock(
                        process=current_process.id, start=time, end=io_end,
                        block_type="io"
                    ))
                    blocked_queue.append(current_process)
                elif current_process.status == ProcessStatus.READY:
                    ready_queue.append(current_process)
                current_process = None
            else:
                # Burst not done — check for preemption
                preempt = self._should_preempt(current_process, ready_queue, unarrived, time, config)
                if preempt:
                    current_process.preempt(time)
                    ready_queue.append(current_process)
                    current_process = None
                # For RR: quantum expired handled by _get_execution_duration

    # ── Abstract methods (algorithm-specific) ───────────────────────

    @abstractmethod
    def _select_process(self, ready_queue: List[ProcessState], config: SimulationConfig) -> ProcessState:
        """Select the next process to run from the ready queue."""
        ...

    @abstractmethod
    def _get_execution_duration(self, process: ProcessState, config: SimulationConfig) -> float:
        """How long will this process run before we re-evaluate?"""
        ...

    @abstractmethod
    def _is_preemptive(self) -> bool:
        """Whether this scheduler can preempt a running process."""
        ...

    def _should_preempt(
        self, current: ProcessState, ready_queue: List[ProcessState],
        unarrived: List[ProcessState], time: float, config: SimulationConfig
    ) -> bool:
        """Check if the running process should be preempted. Override in preemptive schedulers."""
        return False

    # ── Helpers ─────────────────────────────────────────────────────

    @staticmethod
    def _check_io_completions(blocked_queue: List[ProcessState], time: float) -> List[ProcessState]:
        completed = []
        for p in blocked_queue:
            if p.io_completion_time is not None and p.io_completion_time <= time:
                p.complete_io(time)
                completed.append(p)
        return completed

    @staticmethod
    def _next_event_time(
        unarrived: List[ProcessState],
        blocked_queue: List[ProcessState]
    ) -> Optional[float]:
        times = []
        if unarrived:
            times.append(unarrived[0].arrival)
        for p in blocked_queue:
            if p.io_completion_time is not None:
                times.append(p.io_completion_time)
        return min(times) if times else None

    # ── Response construction ───────────────────────────────────────

    def _build_response(
        self, processes: List[ProcessState], config: SimulationConfig
    ) -> SimulationResponse:
        per_process = []
        total_cpu_time = 0.0

        for p in processes:
            total_cpu_time += sum(p.cpu_bursts)
            per_process.append(PerProcessMetrics(
                process_id=p.id,
                arrival_time=p.arrival,
                completion_time=round(p.completion_time, 2),
                turnaround_time=round(p.turnaround_time, 2),
                waiting_time=round(p.waiting_time, 2),
                response_time=round(p.response_time, 2),
                io_time=round(p.total_io_time, 2),
                num_preemptions=p.num_preemptions,
            ))

        n = len(processes)
        total_exec = self.gantt_chart[-1].end if self.gantt_chart else 0.0

        # Filter only CPU gantt blocks for utilization
        cpu_busy_time = sum(
            b.end - b.start for b in self.gantt_chart if b.block_type == "cpu"
        )

        avg_wt = sum(m.waiting_time for m in per_process) / n if n else 0.0
        avg_tat = sum(m.turnaround_time for m in per_process) / n if n else 0.0
        avg_rt = sum(m.response_time for m in per_process) / n if n else 0.0

        cpu_util = (cpu_busy_time / total_exec * 100) if total_exec > 0 else 0.0
        idle_time = total_exec - cpu_busy_time - self.context_switch_total_time

        metrics = Metrics(
            avg_waiting_time=round(avg_wt, 2),
            avg_turnaround_time=round(avg_tat, 2),
            avg_response_time=round(avg_rt, 2),
            cpu_utilization=round(cpu_util, 2),
            throughput=round(n / total_exec, 4) if total_exec > 0 else 0.0,
            cpu_idle_time=round(max(0, idle_time), 2),
            total_execution_time=round(total_exec, 2),
            total_context_switches=self.context_switch_count,
            context_switch_overhead=round(self.context_switch_total_time, 2),
            per_process=per_process,
        )

        return SimulationResponse(
            metrics=metrics,
            gantt_chart=self.gantt_chart,
            prediction_error=self._get_prediction_error(),
        )

    def _get_prediction_error(self) -> Optional[PredictionError]:
        """Override in ML-SJF to provide prediction details."""
        return None
