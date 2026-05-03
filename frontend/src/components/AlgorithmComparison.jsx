import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend,
} from 'recharts';

const ALGO_COLORS = {
  'FCFS': '#3b82f6',
  'SJF': '#10b981',
  'SRTF': '#06b6d4',
  'RR': '#f59e0b',
  'Priority': '#8b5cf6',
  'Priority-P': '#ec4899',
  'ML-SJF': '#f97316',
};

const AlgorithmComparison = ({ results }) => {
  if (!results || Object.keys(results).length === 0) return null;

  const algos = Object.keys(results);

  // Table data
  const tableData = algos.map(algo => {
    const m = results[algo].metrics;
    return {
      algorithm: algo,
      avgWaiting: m.avg_waiting_time,
      avgTurnaround: m.avg_turnaround_time,
      avgResponse: m.avg_response_time,
      throughput: m.throughput,
      cpuUtil: m.cpu_utilization,
      contextSwitches: m.total_context_switches,
      csOverhead: m.context_switch_overhead,
      idleTime: m.cpu_idle_time,
    };
  });

  // Find best (lowest) for each metric
  const bestWt = Math.min(...tableData.map(r => r.avgWaiting));
  const bestTat = Math.min(...tableData.map(r => r.avgTurnaround));
  const bestRt = Math.min(...tableData.map(r => r.avgResponse));
  const bestThroughput = Math.max(...tableData.map(r => r.throughput));
  const bestUtil = Math.max(...tableData.map(r => r.cpuUtil));

  // Bar chart data
  const chartData = algos.map(algo => ({
    name: algo,
    'Waiting Time': results[algo].metrics.avg_waiting_time,
    'Turnaround Time': results[algo].metrics.avg_turnaround_time,
    'Response Time': results[algo].metrics.avg_response_time,
  }));

  // Radar chart data — normalize to 0-100 scale (inverted for "lower is better" metrics)
  const maxWt = Math.max(...algos.map(a => results[a].metrics.avg_waiting_time)) || 1;
  const maxTat = Math.max(...algos.map(a => results[a].metrics.avg_turnaround_time)) || 1;
  const maxRt = Math.max(...algos.map(a => results[a].metrics.avg_response_time)) || 1;
  const maxCs = Math.max(...algos.map(a => results[a].metrics.total_context_switches)) || 1;

  const radarData = [
    { metric: 'Low Wait Time', ...Object.fromEntries(algos.map(a => [a, Math.round((1 - results[a].metrics.avg_waiting_time / maxWt) * 100)])) },
    { metric: 'Low Turnaround', ...Object.fromEntries(algos.map(a => [a, Math.round((1 - results[a].metrics.avg_turnaround_time / maxTat) * 100)])) },
    { metric: 'Low Response', ...Object.fromEntries(algos.map(a => [a, Math.round((1 - results[a].metrics.avg_response_time / maxRt) * 100)])) },
    { metric: 'CPU Utilization', ...Object.fromEntries(algos.map(a => [a, Math.round(results[a].metrics.cpu_utilization)])) },
    { metric: 'Throughput', ...Object.fromEntries(algos.map(a => [a, Math.round((results[a].metrics.throughput / (Math.max(...algos.map(al => results[al].metrics.throughput)) || 1)) * 100)])) },
    { metric: 'Low Switches', ...Object.fromEntries(algos.map(a => [a, Math.round((1 - results[a].metrics.total_context_switches / maxCs) * 100)])) },
  ];

  return (
    <div className="card comparison-card slide-up">
      <h2>Algorithm Comparison</h2>
      <p className="subtitle" style={{marginBottom: '1rem'}}>
        Performance analysis across {algos.length} scheduling algorithms
      </p>

      {/* Metrics Table */}
      <div className="table-container" style={{marginBottom: '2rem'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Algorithm</th>
              <th>Avg WT</th>
              <th>Avg TAT</th>
              <th>Avg RT</th>
              <th>Throughput</th>
              <th>CPU Util%</th>
              <th>CS Count</th>
              <th>CS Overhead</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx}>
                <td>
                  <div className="algo-name-cell">
                    <span className="algo-dot" style={{ backgroundColor: ALGO_COLORS[row.algorithm] }}></span>
                    <strong>{row.algorithm}</strong>
                  </div>
                </td>
                <td className={row.avgWaiting === bestWt ? 'text-best' : ''}>{row.avgWaiting}</td>
                <td className={row.avgTurnaround === bestTat ? 'text-best' : ''}>{row.avgTurnaround}</td>
                <td className={row.avgResponse === bestRt ? 'text-best' : ''}>{row.avgResponse}</td>
                <td className={row.throughput === bestThroughput ? 'text-best' : ''}>{row.throughput}</td>
                <td className={row.cpuUtil === bestUtil ? 'text-best' : ''}>{row.cpuUtil}%</td>
                <td>{row.contextSwitches}</td>
                <td>{row.csOverhead}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Bar Chart */}
        <div className="chart-wrapper">
          <h3>Time Metrics Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis tick={{fill: '#94a3b8'}} />
              <RechartsTooltip
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{ borderRadius: '8px', border: 'none', background: '#1e293b', color: '#f8fafc' }}
              />
              <Bar dataKey="Waiting Time" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="Turnaround Time" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
              <Bar dataKey="Response Time" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="chart-wrapper">
          <h3>Multi-Dimensional Analysis</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              {algos.map(algo => (
                <Radar
                  key={algo}
                  name={algo}
                  dataKey={algo}
                  stroke={ALGO_COLORS[algo] || '#3b82f6'}
                  fill={ALGO_COLORS[algo] || '#3b82f6'}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{value}</span>}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmComparison;
