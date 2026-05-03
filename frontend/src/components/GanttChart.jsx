import React from 'react';

const BLOCK_COLORS = {
  cpu: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'],
  io: 'rgba(148, 163, 184, 0.4)',
  context_switch: '#ef4444',
  idle: 'rgba(71, 85, 105, 0.3)',
};

const GanttChart = ({ data, algorithm }) => {
  if (!data || data.length === 0) return null;

  // Separate CPU/IO/CS/idle blocks
  const totalTime = Math.max(...data.map(b => b.end));

  // Get unique processes (excluding CS, idle)
  const processIds = [...new Set(data.filter(b => b.block_type === 'cpu' || b.block_type === 'io').map(b => b.process))];

  // Assign colors to processes
  const processColors = {};
  processIds.forEach((pid, i) => {
    processColors[pid] = BLOCK_COLORS.cpu[i % BLOCK_COLORS.cpu.length];
  });

  // CPU timeline (main)
  const cpuBlocks = data.filter(b => b.block_type === 'cpu' || b.block_type === 'context_switch' || b.block_type === 'idle');

  // I/O blocks
  const ioBlocks = data.filter(b => b.block_type === 'io');

  // Grid lines
  const gridLines = [];
  const numGridLines = Math.min(20, Math.ceil(totalTime));
  for (let i = 1; i < numGridLines; i++) {
    gridLines.push((i / numGridLines) * 100);
  }

  // Time markers
  const timeMarkers = [];
  const markerInterval = Math.max(1, Math.ceil(totalTime / 15));
  for (let t = 0; t <= totalTime; t += markerInterval) {
    timeMarkers.push(t);
  }
  if (timeMarkers[timeMarkers.length - 1] !== totalTime) {
    timeMarkers.push(totalTime);
  }

  const getBlockStyle = (block) => {
    const left = (block.start / totalTime) * 100;
    const width = ((block.end - block.start) / totalTime) * 100;

    if (block.block_type === 'context_switch') {
      return {
        left: `${left}%`,
        width: `${Math.max(width, 0.3)}%`,
        background: `repeating-linear-gradient(45deg, ${BLOCK_COLORS.context_switch}, ${BLOCK_COLORS.context_switch} 2px, rgba(239,68,68,0.3) 2px, rgba(239,68,68,0.3) 4px)`,
      };
    }
    if (block.block_type === 'idle') {
      return {
        left: `${left}%`,
        width: `${width}%`,
        background: BLOCK_COLORS.idle,
        borderStyle: 'dashed',
        borderColor: 'rgba(148, 163, 184, 0.3)',
      };
    }
    if (block.block_type === 'io') {
      return {
        left: `${left}%`,
        width: `${width}%`,
        background: `repeating-linear-gradient(135deg, rgba(148,163,184,0.2), rgba(148,163,184,0.2) 3px, rgba(148,163,184,0.05) 3px, rgba(148,163,184,0.05) 6px)`,
        border: `1px dashed rgba(148, 163, 184, 0.4)`,
      };
    }
    // CPU block
    return {
      left: `${left}%`,
      width: `${width}%`,
      backgroundColor: processColors[block.process] || '#3b82f6',
    };
  };

  return (
    <div className="gantt-section">
      {/* CPU Timeline */}
      <div className="gantt-label">CPU Timeline</div>
      <div className="gantt-container">
        <div className="gantt-grid">
          {gridLines.map((pos, i) => (
            <div key={i} className="gantt-grid-line" style={{ left: `${pos}%` }}></div>
          ))}
        </div>

        <div className="gantt-track">
          {cpuBlocks.map((block, index) => (
            <div
              key={index}
              className={`gantt-block-abs ${block.block_type === 'cpu' ? 'has-tooltip' : ''}`}
              style={getBlockStyle(block)}
              data-tooltip={
                block.block_type === 'cpu'
                  ? `${block.process} (${block.start} → ${block.end}, dur: ${(block.end - block.start).toFixed(1)})`
                  : block.block_type === 'context_switch'
                  ? `Context Switch (${block.start} → ${block.end})`
                  : `Idle (${block.start} → ${block.end})`
              }
            >
              {block.block_type === 'cpu' && ((block.end - block.start) / totalTime * 100) > 3 && (
                <span className="gantt-process">{block.process}</span>
              )}
              {block.block_type === 'context_switch' && ((block.end - block.start) / totalTime * 100) > 2 && (
                <span className="gantt-process gantt-cs-label">CS</span>
              )}
            </div>
          ))}
        </div>

        {/* Time markers */}
        <div className="gantt-time-axis">
          {timeMarkers.map((t, i) => (
            <span key={i} className="time-marker" style={{ left: `${(t / totalTime) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* I/O Timeline (if any) */}
      {ioBlocks.length > 0 && (
        <>
          <div className="gantt-label" style={{marginTop: '1.5rem'}}>I/O Timeline</div>
          <div className="gantt-container">
            <div className="gantt-grid">
              {gridLines.map((pos, i) => (
                <div key={i} className="gantt-grid-line" style={{ left: `${pos}%` }}></div>
              ))}
            </div>

            <div className="gantt-track io-track">
              {ioBlocks.map((block, index) => (
                <div
                  key={index}
                  className="gantt-block-abs has-tooltip"
                  style={getBlockStyle(block)}
                  data-tooltip={`${block.process} I/O (${block.start} → ${block.end})`}
                >
                  {((block.end - block.start) / totalTime * 100) > 3 && (
                    <span className="gantt-process io-label">{block.process}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Legend */}
      <div className="legend">
        {processIds.map(pid => (
          <div key={pid} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: processColors[pid] }}></span>
            <span className="legend-label">{pid}</span>
          </div>
        ))}
        <div className="legend-item">
          <span className="legend-color legend-cs"></span>
          <span className="legend-label">Context Switch</span>
        </div>
        {ioBlocks.length > 0 && (
          <div className="legend-item">
            <span className="legend-color legend-io"></span>
            <span className="legend-label">I/O Burst</span>
          </div>
        )}
        <div className="legend-item">
          <span className="legend-color legend-idle"></span>
          <span className="legend-label">Idle</span>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;
