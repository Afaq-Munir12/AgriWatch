// Farmer Advisory chatbot API (separate FastAPI project on Vercel).
// In your website's Vercel settings set VITE_CHATBOT_API_URL to the API's
// PRODUCTION domain (e.g. https://farmer-advisory-api.vercel.app).
export const CHATBOT_API_URL = (
  import.meta.env.VITE_CHATBOT_API_URL ||
  "https://farmer-advisory-7pnwsyqpe-muhammad-4020.vercel.app"
).replace(/\/$/, "");

export const CHATBOT_PREFIX = "/api/advisory";
