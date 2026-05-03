import React, { useState } from 'react';
import ProcessForm from '../components/ProcessForm';
import GanttChart from '../components/GanttChart';
import AlgorithmComparison from '../components/AlgorithmComparison';
import PredictionTable from '../components/PredictionTable';
import ProcessMetricsTable from '../components/ProcessMetricsTable';
import Toast from '../components/Toast';
import { simulateScheduling } from '../services/api';
import { Cpu, Download } from 'lucide-react';

const ALGORITHMS = ['FCFS', 'SJF', 'SRTF', 'RR', 'Priority', 'Priority-P', 'ML-SJF'];

const Dashboard = () => {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [activeAlgorithm, setActiveAlgorithm] = useState('ML-SJF');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleSimulate = async (processes, config) => {
    setIsLoading(true);
    setResults(null);
    try {
      const promises = ALGORITHMS.map(algo =>
        simulateScheduling(algo, processes, config)
          .then(data => ({ algo, data, error: null }))
          .catch(err => ({ algo, data: null, error: err.response?.data?.detail || err.message }))
      );

      const responses = await Promise.all(promises);
      const newResults = {};
      const errors = [];

      for (const { algo, data, error } of responses) {
        if (data) {
          newResults[algo] = data;
        } else {
          errors.push(`${algo}: ${error}`);
        }
      }

      if (Object.keys(newResults).length > 0) {
        setResults(newResults);
        const successCount = Object.keys(newResults).length;
        if (errors.length > 0) {
          showToast(`${successCount}/${ALGORITHMS.length} algorithms completed. Failed: ${errors.join('; ')}`, 'warning');
        } else {
          showToast(`All ${successCount} algorithm simulations completed!`);
        }
        // Default to first available algorithm
        if (!newResults[activeAlgorithm]) {
          setActiveAlgorithm(Object.keys(newResults)[0]);
        }
      } else {
        showToast('All simulations failed. Check your input and backend.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "An error occurred during simulation.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    if (!results) return;

    const exportObj = {
      timestamp: new Date().toISOString(),
      algorithms: Object.keys(results),
      results: results
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "nexus_scheduler_results.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast('Results exported as JSON');
  };

  return (
    <div className="dashboard">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({message: '', type: ''})} />

      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="logo-container">
          <div className="logo-icon">
            <Cpu size={28} color="#ffffff" />
          </div>
          <div className="logo-text">
            <h1>Nexus <span>Scheduler</span></h1>
            <p className="subtitle">Advanced Predictive ML Task Scheduling & Analysis</p>
          </div>
        </div>
        {results && (
          <button onClick={exportData} className="btn btn-secondary">
            <Download size={16} /> Export JSON
          </button>
        )}
      </header>

      <main className="main-content">
        <div className="grid-layout">
          <div className="sidebar">
            <ProcessForm onSimulate={handleSimulate} isLoading={isLoading} />
          </div>

          <div className="results-area">
            {results ? (
              <div className="results-content fade-in">
                <AlgorithmComparison results={results} />

                <div className="detailed-view-controls card slide-up" style={{marginBottom: '2rem'}}>
                  <h3>Detailed Timeline View</h3>
                  <div className="algo-tabs">
                    {Object.keys(results).map(algo => (
                      <button
                        key={algo}
                        className={`tab-btn ${activeAlgorithm === algo ? 'active' : ''}`}
                        onClick={() => setActiveAlgorithm(algo)}
                      >
                        {algo}
                      </button>
                    ))}
                  </div>

                  <div style={{marginTop: '1.5rem'}}>
                    <GanttChart data={results[activeAlgorithm].gantt_chart} algorithm={activeAlgorithm} />
                  </div>
                </div>

                {/* Per-Process Metrics */}
                {results[activeAlgorithm]?.metrics?.per_process && (
                  <ProcessMetricsTable
                    perProcess={results[activeAlgorithm].metrics.per_process}
                    algorithm={activeAlgorithm}
                  />
                )}

                {/* ML Prediction Transparency */}
                {activeAlgorithm === 'ML-SJF' && results['ML-SJF']?.prediction_error && (
                  <PredictionTable predictionError={results['ML-SJF'].prediction_error} />
                )}
              </div>
            ) : (
              <div className="empty-results card fade-in">
                <div className="empty-icon-container">
                  <Cpu size={64} className="empty-icon" />
                </div>
                <h2>Awaiting Configuration</h2>
                <p>Define your processes on the left and run the simulation. The system will evaluate all 7 scheduling algorithms automatically for comparison.</p>
                <div className="algo-badges">
                  {ALGORITHMS.map(a => (
                    <span key={a} className="algo-badge">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
