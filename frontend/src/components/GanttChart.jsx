import React, { useState, useRef, useEffect } from 'react';

const BLOCK_COLORS = {
  cpu: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'],
  io: 'rgba(148, 163, 184, 0.4)',
  context_switch: '#ef4444',
  idle: 'rgba(71, 85, 105, 0.3)',
};

const GanttChart = ({ data, algorithm, compact = false }) => {
  const [tooltip, setTooltip] = useState(null);
  const [animatedBlocks, setAnimatedBlocks] = useState(new Set());
  const trackRef = useRef(null);
  const containerRef = useRef(null);

  if (!data || data.length === 0) return null;

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
  const markerInterval = Math.max(1, Math.ceil(totalTime / (compact ? 8 : 15)));
  for (let t = 0; t <= totalTime; t += markerInterval) {
    timeMarkers.push(t);
  }
  if (timeMarkers[timeMarkers.length - 1] !== totalTime) {
    timeMarkers.push(totalTime);
  }

  // Staggered animation on mount
  useEffect(() => {
    const allBlocks = [...cpuBlocks, ...ioBlocks];
    const sorted = [...allBlocks].sort((a, b) => a.start - b.start);
    const ids = new Set();

    sorted.forEach((block, index) => {
      const delay = Math.min(index * 60, 1200);
      setTimeout(() => {
        ids.add(index);
        setAnimatedBlocks(new Set(ids));
      }, delay);
    });

    return () => setAnimatedBlocks(new Set());
  }, [data]);

  const getBlockStyle = (block, index, isAnimated) => {
    const left = (block.start / totalTime) * 100;
    const width = ((block.end - block.start) / totalTime) * 100;

    const baseTransition = 'filter 0.2s, transform 0.2s, opacity 0.4s ease-out, width 0.5s ease-out';

    if (block.block_type === 'context_switch') {
      return {
        left: `${left}%`,
        width: isAnimated ? `${Math.max(width, 0.3)}%` : '0%',
        opacity: isAnimated ? 1 : 0,
        background: `repeating-linear-gradient(45deg, ${BLOCK_COLORS.context_switch}, ${BLOCK_COLORS.context_switch} 2px, rgba(239,68,68,0.3) 2px, rgba(239,68,68,0.3) 4px)`,
        transition: baseTransition,
      };
    }
    if (block.block_type === 'idle') {
      return {
        left: `${left}%`,
        width: isAnimated ? `${width}%` : '0%',
        opacity: isAnimated ? 1 : 0,
        background: BLOCK_COLORS.idle,
        borderStyle: 'dashed',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        transition: baseTransition,
      };
    }
    if (block.block_type === 'io') {
      return {
        left: `${left}%`,
        width: isAnimated ? `${width}%` : '0%',
        opacity: isAnimated ? 1 : 0,
        background: `repeating-linear-gradient(135deg, rgba(148,163,184,0.2), rgba(148,163,184,0.2) 3px, rgba(148,163,184,0.05) 3px, rgba(148,163,184,0.05) 6px)`,
        border: `1px dashed rgba(148, 163, 184, 0.4)`,
        transition: baseTransition,
      };
    }
    // CPU block
    const color = processColors[block.process] || '#3b82f6';
    return {
      left: `${left}%`,
      width: isAnimated ? `${width}%` : '0%',
      opacity: isAnimated ? 1 : 0,
      backgroundColor: color,
      boxShadow: isAnimated ? `0 2px 8px ${color}44` : 'none',
      transition: baseTransition,
    };
  };

  const handleBlockMouseEnter = (e, block) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    const duration = (block.end - block.start).toFixed(1);

    let type = block.block_type;
    let label = '';
    if (type === 'cpu') label = block.process;
    else if (type === 'context_switch') label = 'Context Switch';
    else if (type === 'idle') label = 'CPU Idle';
    else if (type === 'io') label = `${block.process} (I/O)`;

    // Position tooltip above block, centered
    const tooltipLeft = rect.left + rect.width / 2 - (containerRect?.left || 0);
    const tooltipTop = rect.top - (containerRect?.top || 0) - 8;

    setTooltip({
      visible: true,
      x: tooltipLeft,
      y: tooltipTop,
      label,
      type,
      start: block.start,
      end: block.end,
      duration: parseFloat(duration),
      process: block.process,
      color: type === 'cpu' ? processColors[block.process] : undefined,
    });
  };

  const handleBlockMouseLeave = () => {
    setTooltip(null);
  };

  const trackHeight = compact ? 40 : 52;
  const ioTrackHeight = compact ? 30 : 40;

  return (
    <div className={`gantt-section ${compact ? 'gantt-compact' : ''}`} ref={containerRef} style={{ position: 'relative' }}>
      {/* CPU Timeline */}
      <div className="gantt-label">{compact ? `${algorithm}` : 'CPU Timeline'}</div>
      <div className="gantt-container">
        <div className="gantt-grid">
          {gridLines.map((pos, i) => (
            <div key={i} className="gantt-grid-line" style={{ left: `${pos}%` }}></div>
          ))}
        </div>

        <div className="gantt-track" ref={trackRef} style={{ height: `${trackHeight}px` }}>
          {cpuBlocks.map((block, index) => {
            const isAnimated = animatedBlocks.has(index);
            return (
              <div
                key={index}
                className={`gantt-block-abs gantt-block-animated`}
                style={getBlockStyle(block, index, isAnimated)}
                onMouseEnter={(e) => handleBlockMouseEnter(e, block)}
                onMouseLeave={handleBlockMouseLeave}
              >
                {block.block_type === 'cpu' && ((block.end - block.start) / totalTime * 100) > (compact ? 5 : 3) && (
                  <span className="gantt-process">{block.process}</span>
                )}
                {block.block_type === 'context_switch' && ((block.end - block.start) / totalTime * 100) > (compact ? 4 : 2) && (
                  <span className="gantt-process gantt-cs-label">CS</span>
                )}
              </div>
            );
          })}
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
      {!compact && ioBlocks.length > 0 && (
        <>
          <div className="gantt-label" style={{marginTop: '1.5rem'}}>I/O Timeline</div>
          <div className="gantt-container">
            <div className="gantt-grid">
              {gridLines.map((pos, i) => (
                <div key={i} className="gantt-grid-line" style={{ left: `${pos}%` }}></div>
              ))}
            </div>

            <div className="gantt-track io-track" style={{ height: `${ioTrackHeight}px` }}>
              {ioBlocks.map((block, index) => {
                const globalIndex = cpuBlocks.length + index;
                const isAnimated = animatedBlocks.has(globalIndex);
                return (
                  <div
                    key={index}
                    className="gantt-block-abs gantt-block-animated"
                    style={getBlockStyle(block, globalIndex, isAnimated)}
                    onMouseEnter={(e) => handleBlockMouseEnter(e, block)}
                    onMouseLeave={handleBlockMouseLeave}
                  >
                    {((block.end - block.start) / totalTime * 100) > 3 && (
                      <span className="gantt-process io-label">{block.process}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Rich Tooltip */}
      {tooltip && tooltip.visible && (
        <div
          className="gantt-tooltip"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <div className="gantt-tooltip-header">
            {tooltip.color && <span className="gantt-tooltip-dot" style={{ backgroundColor: tooltip.color }}></span>}
            <span className="gantt-tooltip-title">{tooltip.label}</span>
          </div>
          <div className="gantt-tooltip-body">
            <div className="gantt-tooltip-row">
              <span className="gantt-tooltip-key">Start</span>
              <span className="gantt-tooltip-val">{tooltip.start}</span>
            </div>
            <div className="gantt-tooltip-row">
              <span className="gantt-tooltip-key">End</span>
              <span className="gantt-tooltip-val">{tooltip.end}</span>
            </div>
            <div className="gantt-tooltip-row gantt-tooltip-duration">
              <span className="gantt-tooltip-key">Duration</span>
              <span className="gantt-tooltip-val gantt-tooltip-val-highlight">{tooltip.duration}</span>
            </div>
          </div>
          <div className="gantt-tooltip-arrow"></div>
        </div>
      )}

      {/* Legend (only for non-compact) */}
      {!compact && (
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
      )}
    </div>
  );
};

export default GanttChart;
