import React from 'react';

const PredictionTable = ({ predictionError }) => {
  if (!predictionError || !predictionError.details) return null;

  return (
    <div className="card slide-up">
      <h2>ML Prediction Transparency</h2>
      <p className="subtitle" style={{marginBottom: '1rem'}}>Breakdown of predicted vs actual bursts for ML-SJF</p>
      
      <div className="prediction-metrics">
        <div className="pred-stat">
          <span className="pred-label">Mean Absolute Error (MAE):</span>
          <span className="pred-value">{predictionError.mae.toFixed(2)}</span>
        </div>
        <div className="pred-stat">
          <span className="pred-label">Mean Squared Error (MSE):</span>
          <span className="pred-value">{predictionError.mse.toFixed(2)}</span>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Process</th>
              <th>Predicted Burst</th>
              <th>Actual Burst</th>
              <th>Absolute Error</th>
            </tr>
          </thead>
          <tbody>
            {predictionError.details.map((detail, idx) => (
              <tr key={idx}>
                <td><strong>{detail.process}</strong></td>
                <td>{detail.predicted.toFixed(2)}</td>
                <td>{detail.actual.toFixed(2)}</td>
                <td className={detail.error > 1.5 ? 'text-danger' : 'text-success'}>
                  {detail.error.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PredictionTable;
