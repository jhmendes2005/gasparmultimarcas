import axios from 'axios';

const isServer = typeof window === 'undefined';

const fallbackBaseUrl = isServer
  ? process.env.INTERNAL_API_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api`
      : 'http://localhost:3001')
  : '/api';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || fallbackBaseUrl,
});
