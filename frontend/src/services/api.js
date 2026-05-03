import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export const simulateScheduling = async (algorithm, processes, config = {}) => {
  const response = await api.post('/simulate', {
    algorithm,
    processes,
    time_quantum: config.timeQuantum ?? 2.0,
    context_switch_time: config.contextSwitchTime ?? 0.0,
    aging_rate: config.agingRate ?? 1.0,
  });
  return response.data;
};

export const getAlgorithms = async () => {
  const response = await api.get('/algorithms');
  return response.data;
};
