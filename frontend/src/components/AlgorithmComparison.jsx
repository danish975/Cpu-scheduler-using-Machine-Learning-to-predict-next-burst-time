import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const AlgorithmComparison = ({ results }) => {
  if (!results || Object.keys(results).length === 0) return null;

  const tableData = [];
  const chartDataWait = [];
  const chartDataTurnaround = [];

  Object.entries(results).forEach(([algo, res]) => {
    tableData.push({
      algorithm: algo,
      avgWaiting: res.metrics.avg_waiting_time,
      avgTurnaround: res.metrics.avg_turnaround_time,
      throughput: res.metrics.throughput,
      idleTime: res.metrics.cpu_idle_time
    });

    chartDataWait.push({
      name: algo,
      'Waiting Time': res.metrics.avg_waiting_time
    });

    chartDataTurnaround.push({
      name: algo,
      'Turnaround Time': res.metrics.avg_turnaround_time
    });
  });

  return (
    <div className="card comparison-card slide-up">
      <h2>Algorithm Comparison</h2>
      <p className="subtitle" style={{marginBottom: '1rem'}}>Side-by-side performance analysis</p>
      
      <div className="table-container" style={{marginBottom: '2rem'}}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Algorithm</th>
              <th>Avg Waiting Time</th>
              <th>Avg Turnaround Time</th>
              <th>Throughput (proc/time)</th>
              <th>CPU Idle Time</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx}>
                <td><strong>{row.algorithm}</strong></td>
                <td>{row.avgWaiting}</td>
                <td>{row.avgTurnaround}</td>
                <td>{row.throughput}</td>
                <td>{row.idleTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="charts-grid">
        <div className="chart-wrapper">
          <h3>Average Waiting Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartDataWait} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{fill: '#94a3b8'}} />
              <YAxis tick={{fill: '#94a3b8'}} />
              <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ borderRadius: '8px', border: 'none', background: '#1e293b', color: '#f8fafc' }} />
              <Bar dataKey="Waiting Time" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-wrapper">
          <h3>Average Turnaround Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartDataTurnaround} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{fill: '#94a3b8'}} />
              <YAxis tick={{fill: '#94a3b8'}} />
              <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ borderRadius: '8px', border: 'none', background: '#1e293b', color: '#f8fafc' }} />
              <Bar dataKey="Turnaround Time" fill="#10b981" radius={[4, 4, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AlgorithmComparison;
