import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MetricsChart = ({ metrics, predictionError }) => {
  if (!metrics) return null;

  const data = [
    {
      name: 'Time Averages',
      'Avg Waiting Time': metrics.avg_waiting_time,
      'Avg Turnaround Time': metrics.avg_turnaround_time,
    }
  ];

  return (
    <div className="metrics-container">
      <div className="metrics-grid">
        <div className="card stat-card highlight-card">
          <h3>CPU Utilization</h3>
          <div className="stat-value">{metrics.cpu_utilization}%</div>
          <p className="stat-label">Percentage of time CPU is active</p>
        </div>
        
        {predictionError && (
          <>
            <div className="card stat-card">
              <h3>Prediction MAE</h3>
              <div className="stat-value">{predictionError.mae.toFixed(2)}</div>
              <p className="stat-label">Mean Absolute Error</p>
            </div>
            <div className="card stat-card">
              <h3>Prediction MSE</h3>
              <div className="stat-value">{predictionError.mse.toFixed(2)}</div>
              <p className="stat-label">Mean Squared Error</p>
            </div>
          </>
        )}
      </div>

      <div className="card chart-card">
        <h2>Performance Comparison</h2>
        <div className="recharts-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{fill: '#6b7280'}} />
              <YAxis tick={{fill: '#6b7280'}} />
              <Tooltip 
                cursor={{fill: '#f3f4f6'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }}/>
              <Bar dataKey="Avg Waiting Time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Avg Turnaround Time" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MetricsChart;
