const isProd = process.env.NODE_ENV === "production";

const DEFAULT_API_URL = isProd
  ? "https://twiq-web.onrender.com"
  : "http://localhost:8000";
const DEFAULT_WS_URL = isProd
  ? "wss://twiq-web.onrender.com"
  : "ws://localhost:8000";

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL,
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? DEFAULT_WS_URL,
} as const;
