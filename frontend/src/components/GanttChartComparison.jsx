import React from 'react';
import GanttChart from './GanttChart';

const COMPARISON_ALGOS = ['FCFS', 'SJF', 'ML-SJF'];

const ALGO_LABELS = {
  'FCFS': { name: 'First Come First Served', color: '#3b82f6', tag: 'Baseline' },
  'SJF': { name: 'Shortest Job First', color: '#10b981', tag: 'Optimal' },
  'ML-SJF': { name: 'ML-Predicted SJF', color: '#f97316', tag: 'AI-Powered' },
};

const GanttChartComparison = ({ results }) => {
  if (!results) return null;

  // Filter to only the algorithms we have results for
  const availableAlgos = COMPARISON_ALGOS.filter(algo => results[algo]?.gantt_chart);

  if (availableAlgos.length === 0) return null;

  return (
    <div className="gantt-comparison card slide-up">
      <div className="gantt-comparison-header">
        <div>
          <h2>Timeline Comparison</h2>
          <p className="subtitle">Side-by-side execution timeline across scheduling strategies</p>
        </div>
        <div className="gantt-comparison-legend">
          {availableAlgos.map(algo => (
            <div key={algo} className="gantt-comparison-algo-badge" style={{ borderColor: ALGO_LABELS[algo].color }}>
              <span className="gantt-comparison-algo-dot" style={{ backgroundColor: ALGO_LABELS[algo].color }}></span>
              <span className="gantt-comparison-algo-name">{algo}</span>
              <span className="gantt-comparison-algo-tag" style={{ color: ALGO_LABELS[algo].color }}>{ALGO_LABELS[algo].tag}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="gantt-comparison-grid" data-count={availableAlgos.length}>
        {availableAlgos.map((algo, idx) => {
          const metrics = results[algo]?.metrics;
          const makespan = Math.max(...results[algo].gantt_chart.map(b => b.end));

          return (
            <div key={algo} className="gantt-comparison-panel" style={{ '--algo-color': ALGO_LABELS[algo].color, animationDelay: `${idx * 150}ms` }}>
              <div className="gantt-comparison-panel-header">
                <div className="gantt-comparison-panel-title">
                  <span className="gantt-comparison-panel-dot" style={{ backgroundColor: ALGO_LABELS[algo].color }}></span>
                  <span className="gantt-comparison-panel-algo">{algo}</span>
                  <span className="gantt-comparison-panel-fullname">{ALGO_LABELS[algo].name}</span>
                </div>
                {metrics && (
                  <div className="gantt-comparison-stats">
                    <div className="gantt-comparison-stat">
                      <span className="gantt-comparison-stat-label">Avg WT</span>
                      <span className="gantt-comparison-stat-value">{metrics.avg_waiting_time}</span>
                    </div>
                    <div className="gantt-comparison-stat">
                      <span className="gantt-comparison-stat-label">Avg TAT</span>
                      <span className="gantt-comparison-stat-value">{metrics.avg_turnaround_time}</span>
                    </div>
                    <div className="gantt-comparison-stat">
                      <span className="gantt-comparison-stat-label">Makespan</span>
                      <span className="gantt-comparison-stat-value">{makespan}</span>
                    </div>
                    <div className="gantt-comparison-stat">
                      <span className="gantt-comparison-stat-label">CPU Util</span>
                      <span className="gantt-comparison-stat-value">{metrics.cpu_utilization}%</span>
                    </div>
                  </div>
                )}
              </div>
              <GanttChart data={results[algo].gantt_chart} algorithm={algo} compact={true} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GanttChartComparison;
