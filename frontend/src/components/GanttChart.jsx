import React from 'react';

const GanttChart = ({ data, algorithm }) => {
  if (!data || data.length === 0) return null;

  const totalTime = data[data.length - 1].end;
  
  const processColors = {};
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
  let colorIndex = 0;
  
  data.forEach(block => {
    if (!processColors[block.process]) {
      processColors[block.process] = colors[colorIndex % colors.length];
      colorIndex++;
    }
  });

  const gridLines = [];
  const numGridLines = 10;
  for (let i = 1; i < numGridLines; i++) {
    gridLines.push((i / numGridLines) * 100);
  }

  return (
    <div className="card gantt-card slide-up">
      <h2>Execution Timeline {algorithm ? `(${algorithm})` : ''}</h2>
      <div className="gantt-container">
        
        <div className="gantt-grid">
          {gridLines.map((pos, i) => (
            <div key={i} className="gantt-grid-line" style={{ left: `${pos}%` }}></div>
          ))}
        </div>

        <div className="gantt-chart">
          {data.map((block, index) => {
            const width = ((block.end - block.start) / totalTime) * 100;
            return (
              <div 
                key={index} 
                className="gantt-block has-tooltip"
                style={{ 
                  width: `${width}%`,
                  backgroundColor: processColors[block.process]
                }}
                data-tooltip={`${block.process} (Start: ${block.start}, End: ${block.end})`}
              >
                <span className="gantt-process">{block.process}</span>
              </div>
            );
          })}
        </div>
        <div className="gantt-ticks">
          {data.map((block, index) => (
            <React.Fragment key={`tick-${index}`}>
              {index === 0 && <span className="tick tick-start">{block.start}</span>}
              <span 
                className="tick tick-end"
                style={{ left: `${(block.end / totalTime) * 100}%` }}
              >
                {block.end}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="legend">
        {Object.entries(processColors).map(([process, color]) => (
          <div key={process} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: color }}></span>
            <span className="legend-label">{process}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GanttChart;
