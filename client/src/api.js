import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

export function getPayload(response) {
  return response?.data?.data ?? response?.data ?? null;
}

export function getList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

export async function fetchList(path, params) {
  const response = await api.get(path, { params });
  return getList(getPayload(response));
}

export async function fetchOne(path, params) {
  const response = await api.get(path, { params });
  return getPayload(response);
}

export async function send(path, method, data) {
  const response = await api.request({ url: path, method, data });
  return getPayload(response);
}

export { api };
