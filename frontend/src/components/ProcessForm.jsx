import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Settings, ChevronDown, ChevronUp, Zap, Dices } from 'lucide-react';

const ALGORITHMS = ['FCFS', 'SJF', 'SRTF', 'RR', 'Priority', 'Priority-P', 'ML-SJF'];

const ProcessForm = ({ onSimulate, isLoading }) => {
  const [processes, setProcesses] = useState([
    { id: 'P1', arrival: 0, cpuBursts: '5,6,7', ioBursts: '2,3', priority: 1 },
    { id: 'P2', arrival: 2, cpuBursts: '3,4', ioBursts: '1', priority: 2 },
    { id: 'P3', arrival: 4, cpuBursts: '8', ioBursts: '', priority: 3 },
  ]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showIO, setShowIO] = useState(false);
  const [timeQuantum, setTimeQuantum] = useState(2);
  const [contextSwitchTime, setContextSwitchTime] = useState(0.5);
  const [agingRate, setAgingRate] = useState(1.0);
  const [mlMethod, setMlMethod] = useState('ensemble');
  const [isValid, setIsValid] = useState(true);

  const [showGenerator, setShowGenerator] = useState(false);
  const [genCount, setGenCount] = useState(50);
  const [genProfile, setGenProfile] = useState('mixed');

  useEffect(() => {
    let valid = true;
    for (const p of processes) {
      if (!p.id.trim()) valid = false;
      if (p.arrival < 0 || p.arrival === '') valid = false;
      if (!p.cpuBursts.trim()) valid = false;

      const burstsList = p.cpuBursts.split(',');
      for (const b of burstsList) {
        if (isNaN(parseFloat(b.trim())) || b.trim() === '') valid = false;
      }
      if (showIO && p.ioBursts.trim()) {
        const ioBurstsList = p.ioBursts.split(',');
        for (const b of ioBurstsList) {
          if (isNaN(parseFloat(b.trim())) || b.trim() === '') valid = false;
        }
      }
    }
    setIsValid(valid && processes.length > 0);
  }, [processes, showIO]);

  const addProcess = () => {
    setProcesses([
      ...processes,
      { id: `P${processes.length + 1}`, arrival: 0, cpuBursts: '', ioBursts: '', priority: processes.length + 1 }
    ]);
  };

  const updateProcess = (index, field, value) => {
    const newProcesses = [...processes];
    newProcesses[index][field] = value;
    setProcesses(newProcesses);
  };

  const removeProcess = (index) => {
    setProcesses(processes.filter((_, i) => i !== index));
  };

  const generateRandomWorkload = () => {
    const count = parseInt(genCount, 10) || 50;
    const newProcesses = [];
    
    // Ensure I/O is enabled if generating I/O-bound or mixed
    if (genProfile === 'io-bound' || genProfile === 'mixed') {
      setShowIO(true);
    }

    for (let i = 1; i <= count; i++) {
      const arrival = Math.floor(Math.random() * count); // Spread arrivals over time
      const priority = Math.floor(Math.random() * 10) + 1;
      
      let numBursts = Math.floor(Math.random() * 4) + 1; // 1 to 4 CPU bursts
      let cpuBursts = [];
      let ioBursts = [];
      
      for (let b = 0; b < numBursts; b++) {
        if (genProfile === 'cpu-bound') {
          cpuBursts.push(Math.floor(Math.random() * 40) + 10); // 10-49
          if (b < numBursts - 1) ioBursts.push(Math.floor(Math.random() * 5) + 1); // 1-5
        } else if (genProfile === 'io-bound') {
          cpuBursts.push(Math.floor(Math.random() * 5) + 1); // 1-5
          if (b < numBursts - 1) ioBursts.push(Math.floor(Math.random() * 20) + 10); // 10-29
        } else {
          // Mixed
          cpuBursts.push(Math.floor(Math.random() * 30) + 1);
          if (b < numBursts - 1) ioBursts.push(Math.floor(Math.random() * 30) + 1);
        }
      }
      
      newProcesses.push({
        id: `P${i}`,
        arrival,
        priority,
        cpuBursts: cpuBursts.join(','),
        ioBursts: ioBursts.join(',')
      });
    }
    
    setProcesses(newProcesses);
    setShowGenerator(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    const parsedProcesses = processes.map(p => ({
      id: p.id,
      arrival: parseInt(p.arrival, 10) || 0,
      cpu_bursts: p.cpuBursts.split(',').map(b => parseFloat(b.trim())).filter(b => !isNaN(b)),
      io_bursts: showIO && p.ioBursts.trim()
        ? p.ioBursts.split(',').map(b => parseFloat(b.trim())).filter(b => !isNaN(b))
        : null,
      priority: parseInt(p.priority, 10) || 10,
    }));

    const config = {
      timeQuantum: parseFloat(timeQuantum),
      contextSwitchTime: parseFloat(contextSwitchTime),
      agingRate: parseFloat(agingRate),
      mlMethod: mlMethod,
    };

    onSimulate(parsedProcesses, config);
  };

  return (
    <div className="card form-card">
      <div className="card-header">
        <h2>Simulation Configuration</h2>
        <p>Define processes and parameters. All 7 algorithms run automatically for comparison.</p>
      </div>

      <form onSubmit={handleSubmit} className="form-body">
        {/* Advanced Settings Toggle */}
        <div className="advanced-toggle-section">
          <button
            type="button"
            className="advanced-toggle-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings size={16} />
            <span>Advanced Settings</span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <button
            type="button"
            className={`io-toggle-btn ${showIO ? 'active' : ''}`}
            onClick={() => setShowIO(!showIO)}
          >
            <Zap size={14} />
            {showIO ? 'I/O Enabled' : 'Enable I/O'}
          </button>
          
          <button
            type="button"
            className="advanced-toggle-btn"
            onClick={() => setShowGenerator(!showGenerator)}
            style={{ marginLeft: 'auto' }}
          >
            <Dices size={16} />
            <span>Generator</span>
            {showGenerator ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Generator Panel */}
        {showGenerator && (
          <div className="advanced-panel fade-in" style={{ backgroundColor: 'var(--bg-secondary)', borderLeft: '4px solid var(--accent)', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Random Workload Generator</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="slider-group" style={{ flex: 1, minWidth: '120px' }}>
                <label>Process Count</label>
                <input 
                  type="number" 
                  min="1" 
                  max="100" 
                  value={genCount} 
                  onChange={e => setGenCount(e.target.value)} 
                  className="input-number"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                />
              </div>
              <div className="slider-group" style={{ flex: 2, minWidth: '200px' }}>
                <label>Workload Profile</label>
                <select 
                  value={genProfile} 
                  onChange={e => setGenProfile(e.target.value)}
                  className="input-select"
                  style={{ marginTop: '0.5rem' }}
                >
                  <option value="cpu-bound">CPU-Bound (Long CPU, Short I/O)</option>
                  <option value="io-bound">I/O-Bound (Short CPU, Long I/O)</option>
                  <option value="mixed">Mixed Workload (Random)</option>
                </select>
              </div>
              <div style={{ paddingBottom: '4px' }}>
                <button type="button" onClick={generateRandomWorkload} className="btn btn-primary">
                  <Dices size={16} /> Generate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings Panel */}
        {showAdvanced && (
          <div className="advanced-panel fade-in">
            <div className="slider-group">
              <label>
                Time Quantum <span className="slider-value">{timeQuantum}</span>
                <span className="slider-hint">For Round Robin</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                value={timeQuantum}
                onChange={e => setTimeQuantum(e.target.value)}
                className="slider"
              />
              <div className="slider-range"><span>0.5</span><span>20</span></div>
            </div>

            <div className="slider-group">
              <label>
                Context Switch Time <span className="slider-value">{contextSwitchTime}</span>
                <span className="slider-hint">Overhead per switch</span>
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={contextSwitchTime}
                onChange={e => setContextSwitchTime(e.target.value)}
                className="slider"
              />
              <div className="slider-range"><span>0</span><span>5</span></div>
            </div>

            <div className="slider-group">
              <label>
                Aging Rate <span className="slider-value">{agingRate}</span>
                <span className="slider-hint">For Priority algorithms</span>
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={agingRate}
                onChange={e => setAgingRate(e.target.value)}
                className="slider"
              />
              <div className="slider-range"><span>0</span><span>5</span></div>
            </div>

            <div className="slider-group" style={{marginTop: '0.5rem'}}>
              <label>ML Prediction Method</label>
              <select 
                value={mlMethod} 
                onChange={e => setMlMethod(e.target.value)}
                className="input-select"
              >
                <option value="ensemble">Ensemble (Weighted Best)</option>
                <option value="random_forest">Random Forest (Engineered Features)</option>
                <option value="moving_average">Moving Average (Window=3)</option>
                <option value="exponential_avg">Exponential Smoothing</option>
                <option value="linear_regression">Linear Regression</option>
              </select>
            </div>
          </div>
        )}

        {/* Process List */}
        <div className="processes-section">
          <div className="processes-header">
            <span className="col-id">ID</span>
            <span className="col-arrival">Arrival</span>
            <span className="col-priority">Priority</span>
            <span className="col-bursts">CPU Bursts</span>
            {showIO && <span className="col-io">I/O Bursts</span>}
            <span className="col-action"></span>
          </div>

          <div className="processes-list">
            {processes.map((proc, idx) => {
              const isArrivalInvalid = proc.arrival < 0 || proc.arrival === '';
              const isBurstsInvalid = proc.cpuBursts.trim() === '' || proc.cpuBursts.split(',').some(b => isNaN(parseFloat(b.trim())) || b.trim() === '');
              const isIdInvalid = !proc.id.trim();
              const isIOInvalid = showIO && proc.ioBursts.trim() && proc.ioBursts.split(',').some(b => isNaN(parseFloat(b.trim())) || b.trim() === '');

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
                      type="number"
                      min="0"
                      value={proc.priority}
                      onChange={(e) => updateProcess(idx, 'priority', e.target.value)}
                      className="input-number col-priority"
                      title="Lower = higher priority"
                    />
                    <input
                      type="text"
                      placeholder="e.g. 5, 6, 7"
                      value={proc.cpuBursts}
                      onChange={(e) => updateProcess(idx, 'cpuBursts', e.target.value)}
                      className={`input-text col-bursts ${isBurstsInvalid ? 'input-error' : ''}`}
                    />
                    {showIO && (
                      <input
                        type="text"
                        placeholder="e.g. 2, 3"
                        value={proc.ioBursts}
                        onChange={(e) => updateProcess(idx, 'ioBursts', e.target.value)}
                        className={`input-text col-io ${isIOInvalid ? 'input-error' : ''}`}
                      />
                    )}
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
                  {(isIdInvalid || isArrivalInvalid || isBurstsInvalid || isIOInvalid) && (
                    <div className="validation-error">
                      {isIdInvalid && <span>ID required. </span>}
                      {isArrivalInvalid && <span>Arrival ≥ 0. </span>}
                      {isBurstsInvalid && <span>CPU bursts: valid numbers, comma-separated. </span>}
                      {isIOInvalid && <span>I/O bursts: valid numbers, comma-separated.</span>}
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
