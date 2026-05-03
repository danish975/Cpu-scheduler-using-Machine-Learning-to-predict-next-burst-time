import React, { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

const ProcessMetricsTable = ({ perProcess, algorithm }) => {
  const [sortKey, setSortKey] = useState('process_id');
  const [sortDir, setSortDir] = useState('asc');

  if (!perProcess || perProcess.length === 0) return null;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...perProcess].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const avgWait = perProcess.reduce((s, p) => s + p.waiting_time, 0) / perProcess.length;

  const columns = [
    { key: 'process_id', label: 'Process' },
    { key: 'arrival_time', label: 'Arrival' },
    { key: 'completion_time', label: 'Completion' },
    { key: 'turnaround_time', label: 'Turnaround' },
    { key: 'waiting_time', label: 'Waiting' },
    { key: 'response_time', label: 'Response' },
    { key: 'io_time', label: 'I/O Time' },
    { key: 'num_preemptions', label: 'Preemptions' },
  ];

  return (
    <div className="card slide-up" style={{ marginBottom: '2rem' }}>
      <h2>Per-Process Metrics</h2>
      <p className="subtitle" style={{ marginBottom: '1rem' }}>
        Detailed breakdown for {algorithm} — click headers to sort
      </p>

      <div className="table-container">
        <table className="data-table sortable-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="sortable-th"
                >
                  <span className="th-content">
                    {col.label}
                    <ArrowUpDown size={12} className={`sort-icon ${sortKey === col.key ? 'active' : ''}`} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, idx) => {
              const isStarved = p.waiting_time > avgWait * 3 && avgWait > 0;
              return (
                <tr key={idx} className={isStarved ? 'row-starvation' : ''}>
                  <td><strong>{p.process_id}</strong></td>
                  <td>{p.arrival_time}</td>
                  <td>{p.completion_time}</td>
                  <td>{p.turnaround_time}</td>
                  <td className={isStarved ? 'text-danger' : ''}>{p.waiting_time}</td>
                  <td>{p.response_time}</td>
                  <td>{p.io_time > 0 ? p.io_time : '—'}</td>
                  <td>
                    {p.num_preemptions > 0 ? (
                      <span className="preemption-badge">{p.num_preemptions}</span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.some(p => p.waiting_time > avgWait * 3 && avgWait > 0) && (
        <div className="starvation-warning">
          ⚠️ Highlighted rows indicate potential starvation (waiting time &gt; 3× average)
        </div>
      )}
    </div>
  );
};

export default ProcessMetricsTable;
