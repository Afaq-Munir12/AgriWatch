import { CHATBOT_API_URL, CHATBOT_PREFIX } from "../config/chatbot";
import { supabase } from "../supabase/config";

/*
 * Client for the Farmer Advisory API.
 *   POST /api/advisory/conversations  -> { id }
 *   POST /api/advisory/chat           -> { message_id, status, answer, follow_up_questions, sources }
 *   POST /api/advisory/feedback       -> 204
 * Every call needs "Authorization: Bearer <login token>". The website's farmers
 * sign in with Supabase, so the Supabase access token is sent.
 */

export class ChatApiError extends Error {
  constructor(message, { status = 0, code = "" } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const apiLang = (lang) => (lang === "ur" ? "ur" : "en");
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

async function accessToken() {
  const { data } = await supabase.auth.getSession(); // auto-refreshes an expired token
  const token = data?.session?.access_token;
  if (!token) throw new ChatApiError("AUTH", { status: 401, code: "authentication_required" });
  return token;
}

async function request(path, body) {
  const token = await accessToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 110000); // API allows up to 90s for the model
  let res;
  try {
    res = await fetch(`${CHATBOT_API_URL}${CHATBOT_PREFIX}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new ChatApiError("NETWORK", { code: err.name === "AbortError" ? "timeout" : "network" });
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error page */ }
  if (!res.ok) {
    const e = data?.error || {};
    throw new ChatApiError(e.message || `HTTP ${res.status}`, { status: res.status, code: e.code || "" });
  }
  return data;
}

export async function startConversation({ language, district, crop }) {
  const crop_context = {};
  if (crop) crop_context.crop = String(crop).slice(0, 80);
  if (district) crop_context.district = String(district).slice(0, 100);
  const data = await request("/conversations", { language: apiLang(language), crop_context });
  return data.id;
}

export async function sendChatMessage({ conversationId, message, language }) {
  return request("/chat", {
    conversation_id: conversationId,
    client_request_id: uuid(),
    message,
    language: apiLang(language),
  });
}

export async function sendFeedback(messageId, helpful) {
  return request("/feedback", { message_id: messageId, helpful });
}
