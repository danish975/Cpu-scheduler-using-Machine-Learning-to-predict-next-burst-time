import numpy as np
from typing import List, Dict, Any
from sklearn.metrics import r2_score

from app.schemas.schemas import MethodEvaluation, PredictionError, PredictionDetail
from app.schemas.schemas import SimulationConfig, ProcessInput
from app.simulation.base_scheduler import BaseScheduler

class MLEvaluator:
    @staticmethod
    def calculate_metrics(actuals: List[float], predicteds: List[float], method_name: str) -> MethodEvaluation:
        if not actuals:
            return MethodEvaluation(method=method_name, mae=0.0, mse=0.0, mape=0.0, r_squared=0.0)
        
        y_true = np.array(actuals)
        y_pred = np.array(predicteds)
        
        mae = float(np.mean(np.abs(y_true - y_pred)))
        mse = float(np.mean((y_true - y_pred) ** 2))
        mape = float(np.mean(np.abs((y_true - y_pred) / np.maximum(y_true, 1e-5))) * 100)
        
        if len(y_true) > 1 and np.var(y_true) > 0:
            r2 = float(r2_score(y_true, y_pred))
        else:
            r2 = 0.0
            
        return MethodEvaluation(
            method=method_name,
            mae=round(mae, 2),
            mse=round(mse, 2),
            mape=round(mape, 2),
            r_squared=round(r2, 2)
        )

    @staticmethod
    def evaluate(
        active_method: str,
        all_actuals: List[float],
        method_predictions: Dict[str, List[float]],
        details: List[PredictionDetail],
        config: SimulationConfig,
        ml_avg_wt: float,
        ml_avg_tat: float
    ) -> PredictionError:
        
        # Calculate metrics for all methods
        all_methods_eval = []
        for method, preds in method_predictions.items():
            if preds:
                eval_metrics = MLEvaluator.calculate_metrics(all_actuals, preds, method)
                all_methods_eval.append(eval_metrics)
                
        # Find active method evaluation
        active_eval = next((m for m in all_methods_eval if m.method == active_method), None)
        
        # Calculate Oracle SJF performance for comparison
        # SJF already uses perfect knowledge of remaining_cpu_burst
        try:
            from app.simulation.schedulers import SJFScheduler
            sjf_scheduler = SJFScheduler()
            sjf_response = sjf_scheduler.run(config)
            sjf_avg_wt = sjf_response.metrics.avg_waiting_time
            sjf_avg_tat = sjf_response.metrics.avg_turnaround_time
            
            # How much WORSE is ML-SJF than Oracle SJF? 
            # Note: Oracle SJF is the theoretical optimum. So ML-SJF will be slightly slower.
            # We express this as a positive % difference (e.g., 5% worse than Oracle)
            wt_diff_pct = ((ml_avg_wt - sjf_avg_wt) / max(sjf_avg_wt, 1e-5)) * 100
            tat_diff_pct = ((ml_avg_tat - sjf_avg_tat) / max(sjf_avg_tat, 1e-5)) * 100
            
            # Cap at 0 if ML somehow beat Oracle (e.g. tie-breaker luck)
            wt_diff_pct = max(0.0, wt_diff_pct)
            tat_diff_pct = max(0.0, tat_diff_pct)
        except Exception:
            wt_diff_pct = None
            tat_diff_pct = None

        return PredictionError(
            mae=active_eval.mae if active_eval else 0.0,
            mse=active_eval.mse if active_eval else 0.0,
            mape=active_eval.mape if active_eval else 0.0,
            r_squared=active_eval.r_squared if active_eval else 0.0,
            method_used=active_method,
            all_methods=all_methods_eval,
            oracle_wt_improvement_pct=round(wt_diff_pct, 2) if wt_diff_pct is not None else None,
            oracle_tat_improvement_pct=round(tat_diff_pct, 2) if tat_diff_pct is not None else None,
            details=details
        )
