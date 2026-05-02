import React, { useState } from 'react';
import ProcessForm from '../components/ProcessForm';
import GanttChart from '../components/GanttChart';
import AlgorithmComparison from '../components/AlgorithmComparison';
import PredictionTable from '../components/PredictionTable';
import Toast from '../components/Toast';
import { simulateScheduling } from '../services/api';
import { Cpu, Download } from 'lucide-react';

const Dashboard = () => {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [activeAlgorithm, setActiveAlgorithm] = useState('ML-SJF');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleSimulate = async (processes) => {
    setIsLoading(true);
    setResults(null);
    try {
      const [fcfs, sjf, mlsjf] = await Promise.all([
        simulateScheduling('FCFS', processes),
        simulateScheduling('SJF', processes),
        simulateScheduling('ML-SJF', processes)
      ]);

      setResults({
        'FCFS': fcfs,
        'SJF': sjf,
        'ML-SJF': mlsjf
      });
      showToast('Simulation and multi-algorithm comparison completed!');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || "An error occurred during simulation.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    if (!results) return;
    
    const exportObj = {
      timestamp: new Date().toISOString(),
      results: results
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "cpu_scheduling_results.json");
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
            <p className="subtitle">Predictive ML Task Scheduling & Analysis</p>
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
                
                {activeAlgorithm === 'ML-SJF' && (
                  <PredictionTable predictionError={results['ML-SJF'].prediction_error} />
                )}
              </div>
            ) : (
              <div className="empty-results card fade-in">
                <div className="empty-icon-container">
                  <Cpu size={64} className="empty-icon" />
                </div>
                <h2>Awaiting Configuration</h2>
                <p>Define your processes on the left and run the simulation. The system will evaluate FCFS, SJF, and ML-SJF automatically for comparison.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
