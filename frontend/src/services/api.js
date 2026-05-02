import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export const simulateScheduling = async (algorithm, processes) => {
  const response = await api.post('/simulate', {
    algorithm,
    processes,
  });
  return response.data;
};
