import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend, Cell
} from 'recharts';

const METHOD_COLORS = {
  'ensemble': '#3b82f6',
  'random_forest': '#10b981',
  'linear_regression': '#f59e0b',
  'exponential_avg': '#8b5cf6',
  'moving_average': '#ec4899',
};

const PredictionTable = ({ predictionError }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!predictionError || !predictionError.details) return null;

  const { mae, mse, mape, r_squared, method_used, all_methods, details, oracle_wt_improvement_pct, oracle_tat_improvement_pct } = predictionError;

  // Chart data for method comparison
  const comparisonData = all_methods ? all_methods.map(m => ({
    name: m.method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    methodKey: m.method,
    MAE: m.mae,
    MSE: m.mse,
    MAPE: m.mape,
    R2: m.r_squared
  })) : [];

  // Scatter data (Actual vs Predicted)
  const scatterData = details.map((d, i) => ({
    x: d.actual,
    y: d.predicted,
    z: 100, // Dot size
    name: d.process,
    error: d.error
  }));

  // Find max value for identity line
  const maxVal = details.length > 0 
    ? Math.max(...details.map(d => Math.max(d.actual, d.predicted))) + 2
    : 10;

  const identityLine = [
    { x: 0, y: 0 },
    { x: maxVal, y: maxVal }
  ];

  return (
    <div className="card slide-up" style={{ marginTop: '2rem' }}>
      <div className="ml-insights-header">
        <div>
          <h2>ML Insights Panel</h2>
          <p className="subtitle">
            Active Predictor: <strong style={{color: METHOD_COLORS[method_used] || '#3b82f6'}}>{(method_used || 'ensemble').replace('_', ' ').toUpperCase()}</strong>
          </p>
        </div>
        
        {oracle_wt_improvement_pct !== null && (
          <div className="oracle-badge">
            <span className="oracle-label">vs Oracle SJF:</span>
            <span className="oracle-value">+{oracle_wt_improvement_pct}% Wait Time</span>
            <span className="oracle-hint">(Lower % is closer to perfect)</span>
          </div>
        )}
      </div>

      {/* Metrics Summary */}
      <div className="prediction-metrics">
        <div className="pred-stat-box">
          <span className="pred-label">R² Score</span>
          <span className="pred-value">{r_squared?.toFixed(2)}</span>
          <span className="pred-sub">Accuracy (1.0 = perfect)</span>
        </div>
        <div className="pred-stat-box">
          <span className="pred-label">MAE</span>
          <span className="pred-value">{mae?.toFixed(2)}</span>
          <span className="pred-sub">Mean Absolute Error</span>
        </div>
        <div className="pred-stat-box">
          <span className="pred-label">MSE</span>
          <span className="pred-value">{mse?.toFixed(2)}</span>
          <span className="pred-sub">Mean Squared Error</span>
        </div>
        <div className="pred-stat-box">
          <span className="pred-label">MAPE</span>
          <span className="pred-value">{mape?.toFixed(1)}%</span>
          <span className="pred-sub">Mean Abs Pct Error</span>
        </div>
      </div>

      <div className="ml-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Method Comparison</button>
        <button className={`tab-btn ${activeTab === 'scatter' ? 'active' : ''}`} onClick={() => setActiveTab('scatter')}>Prediction Scatter</button>
        <button className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>Data & Features</button>
      </div>

      <div className="ml-tab-content">
        {activeTab === 'overview' && all_methods && (
          <div className="chart-wrapper">
            <h3>Algorithm Performance Comparison (Lower is Better)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis yAxisId="left" tick={{fill: '#94a3b8'}} />
                <YAxis yAxisId="right" orientation="right" tick={{fill: '#94a3b8'}} />
                <RechartsTooltip
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', background: '#1e293b', color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="MAE" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="MSE" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="MAPE" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'scatter' && (
          <div className="chart-wrapper">
            <h3>Actual vs Predicted Burst Time (Closer to diagonal is better)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" dataKey="x" name="Actual Burst" domain={[0, maxVal]} tick={{fill: '#94a3b8'}} />
                <YAxis type="number" dataKey="y" name="Predicted Burst" domain={[0, maxVal]} tick={{fill: '#94a3b8'}} />
                <ZAxis type="number" dataKey="z" range={[60, 60]} />
                <RechartsTooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{ borderRadius: '8px', border: 'none', background: '#1e293b' }} />
                
                {/* Identity Line */}
                <Scatter name="Perfect Prediction" data={identityLine} fill="transparent" line={{ stroke: '#94a3b8', strokeDasharray: '5 5' }} shape={() => null} />
                
                <Scatter name="Predictions" data={scatterData} fill={METHOD_COLORS[method_used] || "#3b82f6"}>
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.error > 1.5 ? '#ef4444' : (METHOD_COLORS[method_used] || '#3b82f6')} />
                  ))}
                </Scatter>
                <Legend />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Process</th>
                  <th>Actual</th>
                  <th>Predicted</th>
                  <th>Error</th>
                  <th>Features Used (for RF)</th>
                </tr>
              </thead>
              <tbody>
                {details.map((detail, idx) => (
                  <tr key={idx}>
                    <td><strong>{detail.process}</strong></td>
                    <td>{detail.actual.toFixed(2)}</td>
                    <td>{detail.predicted.toFixed(2)}</td>
                    <td className={detail.error > 1.5 ? 'text-danger' : 'text-success'}>
                      {detail.error.toFixed(2)}
                    </td>
                    <td className="feature-cell">
                      {detail.features_used ? (
                        <div className="feature-tags">
                          <span title="Mean of past bursts">μ={detail.features_used.mean_burst}</span>
                          <span title="Last burst">last={detail.features_used.last_burst}</span>
                          <span title="Burst standard deviation">σ={detail.features_used.std_burst}</span>
                          <span title="Recent trend slope">trend={detail.features_used.trend}</span>
                          <span title="I/O Ratio">I/O={detail.features_used.io_ratio}</span>
                          <span title="Queue Depth">Q={detail.features_used.queue_depth}</span>
                        </div>
                      ) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionTable;
