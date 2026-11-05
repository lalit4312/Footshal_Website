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

export async function uploadImage(file, onProgress) {
  const credentials = getPayload(await api.post('/admin/uploads/sign', {}));
  if (!credentials?.cloudName || !credentials?.apiKey || !credentials?.signature || !credentials?.timestamp) {
    throw new Error('The server returned incomplete image upload credentials.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', credentials.apiKey);
  formData.append('timestamp', String(credentials.timestamp));
  formData.append('folder', credentials.folder);
  formData.append('signature', credentials.signature);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/image/upload`);
    request.timeout = 120000;
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener('error', () => reject(new Error('Could not reach Cloudinary. Check your connection and try again.')));
    request.addEventListener('timeout', () => reject(new Error('Image upload timed out. Check your connection and try again.')));
    request.addEventListener('load', () => {
      let payload;
      try {
        payload = JSON.parse(request.responseText);
      } catch (_error) {
        reject(new Error('Cloudinary returned an unreadable response.'));
        return;
      }
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(payload.error?.message || `Cloudinary upload failed with status ${request.status}.`));
        return;
      }
      if (typeof payload.secure_url !== 'string' || !payload.secure_url.startsWith('https://')) {
        reject(new Error('Cloudinary did not return a secure image URL.'));
        return;
      }
      resolve(payload.secure_url);
    });
    request.send(formData);
  });
}

export { api };
