import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import { TrendingUp, Award, Zap, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const ALGO_COLORS = {
  'FCFS': '#3b82f6',
  'SJF': '#10b981',
  'SRTF': '#06b6d4',
  'RR': '#f59e0b',
  'Priority': '#8b5cf6',
  'Priority-P': '#ec4899',
  'ML-SJF': '#f97316',
};

const ALGO_DESCRIPTIONS = {
  'FCFS': 'arrival order without preemption',
  'SJF': 'perfect burst-time knowledge (oracle)',
  'SRTF': 'preemptive shortest remaining time',
  'RR': 'time-quantum based fair sharing',
  'Priority': 'static priority scheduling',
  'Priority-P': 'preemptive priority scheduling',
  'ML-SJF': 'ML-predicted burst times for SJF',
};

/* ─── Generate automated insights from results ─── */
function generateInsights(results) {
  const algos = Object.keys(results);
  if (algos.length < 2) return [];

  const insights = [];
  const metrics = {};
  algos.forEach(a => { metrics[a] = results[a].metrics; });

  // Find best algorithm for each metric
  const bestWt = algos.reduce((best, a) => metrics[a].avg_waiting_time < metrics[best].avg_waiting_time ? a : best, algos[0]);
  const bestTat = algos.reduce((best, a) => metrics[a].avg_turnaround_time < metrics[best].avg_turnaround_time ? a : best, algos[0]);
  const bestRt = algos.reduce((best, a) => metrics[a].avg_response_time < metrics[best].avg_response_time ? a : best, algos[0]);
  const bestUtil = algos.reduce((best, a) => metrics[a].cpu_utilization > metrics[best].cpu_utilization ? a : best, algos[0]);
  const worstWt = algos.reduce((worst, a) => metrics[a].avg_waiting_time > metrics[worst].avg_waiting_time ? a : worst, algos[0]);

  // 1. Overall winner insight
  insights.push({
    type: 'winner',
    icon: 'award',
    title: `${bestWt} achieves the lowest average waiting time`,
    description: `With an avg wait of ${metrics[bestWt].avg_waiting_time} units, ${bestWt} outperforms all others due to ${ALGO_DESCRIPTIONS[bestWt]}.`,
    severity: 'success',
  });

  // 2. ML-SJF vs SJF comparison
  if (metrics['ML-SJF'] && metrics['SJF']) {
    const mlWt = metrics['ML-SJF'].avg_waiting_time;
    const sjfWt = metrics['SJF'].avg_waiting_time;
    const gap = ((mlWt - sjfWt) / sjfWt * 100).toFixed(1);
    if (parseFloat(gap) <= 5) {
      insights.push({
        type: 'ml-close',
        icon: 'zap',
        title: `ML-SJF is within ${Math.abs(gap)}% of optimal SJF`,
        description: `ML predictions are closely tracking true burst times. The model provides near-oracle scheduling without requiring future knowledge.`,
        severity: 'success',
      });
    } else {
      insights.push({
        type: 'ml-gap',
        icon: 'trending',
        title: `ML-SJF is ${gap}% behind optimal SJF in wait time`,
        description: `The prediction gap suggests the ML model could benefit from more training data or feature engineering to better approximate true burst times.`,
        severity: 'warning',
      });
    }
  }

  // 3. FCFS performance warning
  if (metrics['FCFS'] && worstWt === 'FCFS') {
    const fcfsWt = metrics['FCFS'].avg_waiting_time;
    const bestWtVal = metrics[bestWt].avg_waiting_time;
    const pctWorse = bestWtVal > 0 ? ((fcfsWt - bestWtVal) / bestWtVal * 100).toFixed(0) : 0;
    insights.push({
      type: 'fcfs-warning',
      icon: 'alert',
      title: `FCFS has ${pctWorse}% higher wait time than ${bestWt}`,
      description: `FCFS processes jobs in arrival order without optimization, leading to the convoy effect where short jobs wait behind long ones.`,
      severity: 'danger',
    });
  }

  // 4. CPU utilization insight
  insights.push({
    type: 'utilization',
    icon: 'zap',
    title: `${bestUtil} achieves highest CPU utilization at ${metrics[bestUtil].cpu_utilization}%`,
    description: `Minimizing idle time is critical for throughput. ${bestUtil} keeps the CPU busy most effectively.`,
    severity: 'info',
  });

  // 5. Turnaround time insight
  if (bestTat !== bestWt) {
    insights.push({
      type: 'turnaround',
      icon: 'trending',
      title: `${bestTat} leads in turnaround time (${metrics[bestTat].avg_turnaround_time} units)`,
      description: `Different algorithms may optimize different metrics — ${bestTat} completes jobs fastest overall.`,
      severity: 'info',
    });
  }

  // 6. RR fairness insight
  if (metrics['RR'] && metrics['RR'].avg_response_time === metrics[bestRt].avg_response_time) {
    insights.push({
      type: 'rr-response',
      icon: 'award',
      title: 'Round Robin achieves best response time',
      description: 'RR ensures fairness by giving each process equal CPU time slices, making it ideal for interactive systems.',
      severity: 'success',
    });
  }

  return insights;
}

/* ─── Compute pairwise percentage improvements ─── */
function computeImprovements(results) {
  const algos = Object.keys(results);
  const metrics = ['avg_waiting_time', 'avg_turnaround_time', 'avg_response_time'];
  const metricLabels = { avg_waiting_time: 'Wait Time', avg_turnaround_time: 'Turnaround', avg_response_time: 'Response' };

  // Use SJF as baseline if available, else use FCFS
  const baseline = algos.includes('FCFS') ? 'FCFS' : algos[0];
  const comparisons = algos.filter(a => a !== baseline);

  return {
    baseline,
    comparisons: comparisons.map(algo => {
      const improvements = {};
      metrics.forEach(m => {
        const baseVal = results[baseline].metrics[m];
        const algoVal = results[algo].metrics[m];
        if (baseVal > 0) {
          improvements[metricLabels[m]] = {
            pct: (((baseVal - algoVal) / baseVal) * 100).toFixed(1),
            from: baseVal,
            to: algoVal,
          };
        } else {
          improvements[metricLabels[m]] = { pct: '0.0', from: baseVal, to: algoVal };
        }
      });
      return { algorithm: algo, improvements };
    }),
    metricLabels: Object.values(metricLabels),
  };
}

/* ─── Generate synthetic scaling data ─── */
function generateScalingData(results) {
  const algos = Object.keys(results);
  const metrics = {};
  algos.forEach(a => { metrics[a] = results[a].metrics; });

  // Use actual data point and extrapolate scaling curves
  const processCounts = [2, 4, 8, 16, 32, 64];

  return processCounts.map(n => {
    const point = { processes: n };
    algos.forEach(algo => {
      const baseWt = metrics[algo].avg_waiting_time || 0.1;
      // Different algorithms scale differently:
      let scale;
      switch (algo) {
        case 'FCFS': scale = baseWt * (n / 4) * 1.1; break;  // Linear-ish growth
        case 'SJF': scale = baseWt * Math.log2(n + 1) * 0.6; break;  // Logarithmic (optimal)
        case 'SRTF': scale = baseWt * Math.log2(n + 1) * 0.55; break;  // Slightly better than SJF
        case 'RR': scale = baseWt * (n / 4) * 0.85; break;  // Linear but fairer
        case 'Priority': scale = baseWt * (n / 4) * 0.95; break;
        case 'Priority-P': scale = baseWt * (n / 4) * 0.8; break;
        case 'ML-SJF': scale = baseWt * Math.log2(n + 1) * 0.7; break;  // Near-logarithmic
        default: scale = baseWt * (n / 4);
      }
      point[algo] = Math.round(Math.max(0.1, scale) * 10) / 10;
    });
    return point;
  });
}

const InsightIcon = ({ type }) => {
  const size = 18;
  switch (type) {
    case 'award': return <Award size={size} />;
    case 'zap': return <Zap size={size} />;
    case 'trending': return <TrendingUp size={size} />;
    case 'alert': return <AlertTriangle size={size} />;
    default: return <TrendingUp size={size} />;
  }
};

const AnalysisInsights = ({ results }) => {
  const [expandedInsight, setExpandedInsight] = useState(null);

  if (!results || Object.keys(results).length < 2) return null;

  const insights = generateInsights(results);
  const improvements = computeImprovements(results);
  const scalingData = generateScalingData(results);
  const algos = Object.keys(results);

  return (
    <div className="card analysis-insights slide-up">
      <h2>Automated Analysis</h2>
      <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
        AI-generated insights and performance scaling predictions
      </p>

      {/* ─── Insights Cards ─── */}
      <div className="insights-grid">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`insight-card insight-${insight.severity}`}
            onClick={() => setExpandedInsight(expandedInsight === idx ? null : idx)}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="insight-header">
              <div className={`insight-icon insight-icon-${insight.severity}`}>
                <InsightIcon type={insight.icon} />
              </div>
              <div className="insight-text">
                <div className="insight-title">{insight.title}</div>
                {expandedInsight === idx && (
                  <div className="insight-description">{insight.description}</div>
                )}
              </div>
              <div className="insight-expand">
                {expandedInsight === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Percentage Improvement Table ─── */}
      <div className="improvement-section">
        <h3 className="section-title">
          Percentage Improvement vs {improvements.baseline}
        </h3>
        <p className="section-subtitle">
          Negative values indicate worse performance compared to baseline
        </p>
        <div className="table-container">
          <table className="data-table improvement-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                {improvements.metricLabels.map(m => (
                  <th key={m}>{m} Δ</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {improvements.comparisons.map((row, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="algo-name-cell">
                      <span className="algo-dot" style={{ backgroundColor: ALGO_COLORS[row.algorithm] }}></span>
                      <strong>{row.algorithm}</strong>
                    </div>
                  </td>
                  {improvements.metricLabels.map(m => {
                    const imp = row.improvements[m];
                    const pct = parseFloat(imp.pct);
                    const isPositive = pct > 0;
                    return (
                      <td key={m}>
                        <div className="improvement-cell">
                          <span className={`improvement-pct ${isPositive ? 'improvement-positive' : pct < 0 ? 'improvement-negative' : ''}`}>
                            {isPositive ? '↓' : pct < 0 ? '↑' : '='} {Math.abs(pct)}%
                          </span>
                          <span className="improvement-detail">
                            {imp.from} → {imp.to}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Scaling Behavior Charts ─── */}
      <div className="scaling-section">
        <h3 className="section-title">Scaling Behavior Projection</h3>
        <p className="section-subtitle">
          Projected average waiting time as process count increases (based on algorithmic complexity)
        </p>
        <div className="charts-grid">
          {/* Line Chart */}
          <div className="chart-wrapper">
            <h3>Wait Time vs Process Count</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scalingData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="processes" tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Processes', position: 'insideBottom', offset: -2, fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8' }} label={{ value: 'Avg Wait Time', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', background: '#1e293b', color: '#f8fafc' }}
                />
                {algos.map(algo => (
                  <Line
                    key={algo}
                    type="monotone"
                    dataKey={algo}
                    stroke={ALGO_COLORS[algo] || '#3b82f6'}
                    strokeWidth={2}
                    dot={{ r: 3, fill: ALGO_COLORS[algo] || '#3b82f6' }}
                    activeDot={{ r: 5 }}
                  />
                ))}
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{value}</span>}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Area Chart */}
          <div className="chart-wrapper">
            <h3>Scaling Efficiency (Key Algorithms)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={scalingData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="processes" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', background: '#1e293b', color: '#f8fafc' }}
                />
                {['FCFS', 'SJF', 'ML-SJF'].filter(a => algos.includes(a)).map(algo => (
                  <Area
                    key={algo}
                    type="monotone"
                    dataKey={algo}
                    stroke={ALGO_COLORS[algo]}
                    fill={ALGO_COLORS[algo]}
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                ))}
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{value}</span>}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisInsights;
