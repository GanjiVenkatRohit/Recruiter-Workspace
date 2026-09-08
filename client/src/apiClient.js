import { getToken, clearToken } from './auth';

export function apiClient(url, options = {}) {
  const token = getToken();
  
  // Set up headers
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  return fetch(url, fetchOptions)
    .then((response) => {
      if (response.status === 401) {
        const isAuthEndpoint = url.includes('/api/auth/');
        if (!isAuthEndpoint) {
          clearToken();
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
      return response;
    })
    .catch((error) => {
      throw error;
    });
}
