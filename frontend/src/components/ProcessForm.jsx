import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';

const ProcessForm = ({ onSimulate, isLoading }) => {
  const [processes, setProcesses] = useState([
    { id: 'P1', arrival: 0, bursts: '5,6,7' },
    { id: 'P2', arrival: 2, bursts: '3,4' }
  ]);
  
  const [isValid, setIsValid] = useState(true);

  // Validate on every change
  useEffect(() => {
    let valid = true;
    for (const p of processes) {
      if (!p.id.trim()) valid = false;
      if (p.arrival < 0 || p.arrival === '') valid = false;
      if (!p.bursts.trim()) valid = false;
      
      const burstsList = p.bursts.split(',');
      for (const b of burstsList) {
        if (isNaN(parseFloat(b.trim())) || b.trim() === '') {
          valid = false;
        }
      }
    }
    setIsValid(valid && processes.length > 0);
  }, [processes]);

  const addProcess = () => {
    setProcesses([
      ...processes,
      { id: `P${processes.length + 1}`, arrival: 0, bursts: '' }
    ]);
  };

  const updateProcess = (index, field, value) => {
    const newProcesses = [...processes];
    newProcesses[index][field] = value;
    setProcesses(newProcesses);
  };

  const removeProcess = (index) => {
    const newProcesses = processes.filter((_, i) => i !== index);
    setProcesses(newProcesses);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;
    
    // Parse processes
    const parsedProcesses = processes.map(p => ({
      id: p.id,
      arrival: parseInt(p.arrival, 10) || 0,
      bursts: p.bursts.split(',').map(b => parseFloat(b.trim())).filter(b => !isNaN(b))
    }));
    
    onSimulate(parsedProcesses);
  };

  return (
    <div className="card form-card">
      <div className="card-header">
        <h2>Simulation Configuration</h2>
        <p>Define your processes. The system will run FCFS, SJF, and ML-SJF automatically for comparison.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="form-body">
        <div className="processes-section">
          <div className="processes-header">
            <span className="col-id">Process ID</span>
            <span className="col-arrival">Arrival</span>
            <span className="col-bursts">Bursts (comma separated)</span>
            <span className="col-action">Action</span>
          </div>
          
          <div className="processes-list">
            {processes.map((proc, idx) => {
              const isArrivalInvalid = proc.arrival < 0 || proc.arrival === '';
              const isBurstsInvalid = proc.bursts.trim() === '' || proc.bursts.split(',').some(b => isNaN(parseFloat(b.trim())) || b.trim() === '');
              const isIdInvalid = !proc.id.trim();
              
              return (
                <div key={idx} className="process-row-container">
                  <div className="process-row">
                    <input
                      type="text"
                      value={proc.id}
                      onChange={(e) => updateProcess(idx, 'id', e.target.value)}
                      className={`input-text col-id ${isIdInvalid ? 'input-error' : ''}`}
                      placeholder="ID"
                    />
                    <input
                      type="number"
                      min="0"
                      value={proc.arrival}
                      onChange={(e) => updateProcess(idx, 'arrival', e.target.value)}
                      className={`input-number col-arrival ${isArrivalInvalid ? 'input-error' : ''}`}
                    />
                    <input
                      type="text"
                      placeholder="e.g. 5, 6, 7"
                      value={proc.bursts}
                      onChange={(e) => updateProcess(idx, 'bursts', e.target.value)}
                      className={`input-text col-bursts ${isBurstsInvalid ? 'input-error' : ''}`}
                    />
                    <button 
                      type="button" 
                      onClick={() => removeProcess(idx)}
                      className="btn-icon btn-danger col-action"
                      disabled={processes.length === 1}
                      title="Remove Process"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {(isIdInvalid || isArrivalInvalid || isBurstsInvalid) && (
                    <div className="validation-error">
                      {isIdInvalid && <span>ID is required. </span>}
                      {isArrivalInvalid && <span>Arrival must be ≥ 0. </span>}
                      {isBurstsInvalid && <span>Bursts must be valid numbers separated by commas.</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={addProcess} className="btn btn-secondary">
            <Plus size={18} /> Add Process
          </button>
          <button type="submit" disabled={isLoading || !isValid} className="btn btn-primary">
            {isLoading ? <span className="spinner"></span> : <Play size={18} />}
            {isLoading ? 'Simulating...' : 'Run Analysis'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProcessForm;
