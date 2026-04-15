import axios from 'axios';

const isServer = typeof window === 'undefined';

const serverBaseUrl =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api`
    : 'http://localhost:3001');

const browserBaseUrl = isServer
  ? '/api'
  : new URL('/api', window.location.origin).toString();

export const api = axios.create({
  baseURL: isServer ? serverBaseUrl : browserBaseUrl,
});
