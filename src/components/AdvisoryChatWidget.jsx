import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X, Trash2, Sparkles, ThumbsUp, ThumbsDown, BookOpen } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { startConversation, sendChatMessage, sendFeedback } from "../services/chatbotService";

// Minimal, safe formatting: **bold**, "- " / "• " bullets, line breaks.
function RichText({ text }) {
  const lines = String(text).split(/\r?\n/);
  return (
    <>
      {lines.map((line, i) => {
        const bullet = /^\s*([-*•]|\d+[.)])\s+/.test(line);
        const clean = line.replace(/^\s*([-*•]|\d+[.)])\s+/, "");
        const parts = clean.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>
        );
        if (!line.trim()) return <div key={i} className="chatw-gap" />;
        return bullet ? (
          <div key={i} className="chatw-bullet"><span className="chatw-bullet-dot" />{parts}</div>
        ) : (
          <div key={i}>{parts}</div>
        );
      })}
    </>
  );
}

export default function AdvisoryChatWidget({ district = "", crop = "" }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const conversationRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const rtl = lang === "ur";

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 220);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const suggestions = [t("chatSuggestCrop"), t("chatSuggestIrrigate"), t("chatSuggestDrought")];

  function errorText(err) {
    if (err.message === "AUTH" || err.status === 401) return t("chatErrAuth");
    if (err.message === "NETWORK") return err.code === "timeout" ? t("chatErrTimeout") : t("chatErrNetwork");
    return err.message ? `${t("chatErrGeneric")} ${err.message}` : t("chatErrGeneric");
  }

  async function send(raw) {
    const text = String(raw ?? input).trim();
    if (!text || busy) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      if (!conversationRef.current) {
        conversationRef.current = await startConversation({ language: lang, district, crop });
      }
      const r = await sendChatMessage({ conversationId: conversationRef.current, message: text, language: lang });
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: r.answer,
        id: r.message_id,
        followUps: r.follow_up_questions || [],
        sources: r.sources || [],
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: errorText(err), error: true }]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    conversationRef.current = null; // next question starts a fresh conversation
    setMessages([]);
  }

  async function rate(index, helpful) {
    const m = messages[index];
    if (!m?.id || m.rated != null) return;
    setMessages((prev) => prev.map((x, i) => (i === index ? { ...x, rated: helpful } : x)));
    try { await sendFeedback(m.id, helpful); } catch { /* feedback is best-effort */ }
  }

  return (
    <div className="chatw-root" dir={rtl ? "rtl" : "ltr"}>
      <section
        className={`chatw-panel ${open ? "is-open" : ""}`}
        role="dialog"
        aria-label={t("chatTitle")}
        aria-hidden={!open}
      >
        <header className="chatw-head">
          <div className="chatw-avatar"><Bot size={18} /></div>
          <div className="chatw-head-text">
            <strong>{t("chatTitle")}</strong>
            <span><i className="chatw-online" /> {district ? `${t("chatOnline")} · ${district}` : t("chatOnline")}</span>
          </div>
          {messages.length > 0 && (
            <button type="button" className="chatw-icon-btn" onClick={clearChat} aria-label={t("chatClear")} title={t("chatClear")}>
              <Trash2 size={15} />
            </button>
          )}
          <button type="button" className="chatw-icon-btn" onClick={() => setOpen(false)} aria-label={t("chatClose")}>
            <X size={17} />
          </button>
        </header>

        <div className="chatw-body" ref={listRef}>
          {messages.length === 0 && (
            <div className="chatw-welcome">
              <div className="chatw-welcome-icon"><Sparkles size={20} /></div>
              <p className="chatw-welcome-title">{t("chatWelcomeTitle")}</p>
              <p className="chatw-welcome-copy">{t("chatWelcomeBody")}</p>
              <div className="chatw-chips">
                {suggestions.map((s) => (
                  <button key={s} type="button" className="chatw-chip" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`chatw-row ${m.role === "user" ? "is-user" : "is-bot"}`}>
              <div className="chatw-stack">
                <div className={`chatw-bubble ${m.role === "user" ? "user" : "bot"} ${m.error ? "error" : ""}`}>
                  <RichText text={m.text} />
                </div>
                {m.sources?.length > 0 && (
                  <div className="chatw-sources">
                    <BookOpen size={12} />
                    {m.sources.map((src) => (
                      <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" title={src.section || ""}>{src.title}</a>
                    ))}
                  </div>
                )}
                {m.followUps?.length > 0 && i === messages.length - 1 && !busy && (
                  <div className="chatw-chips chatw-followups">
                    {m.followUps.map((q) => (
                      <button key={q} type="button" className="chatw-chip" onClick={() => send(q)}>{q}</button>
                    ))}
                  </div>
                )}
                {m.id && (
                  <div className="chatw-rate">
                    <button type="button" className={m.rated === true ? "on" : ""} disabled={m.rated != null} onClick={() => rate(i, true)} aria-label={t("chatHelpful")} title={t("chatHelpful")}><ThumbsUp size={13} /></button>
                    <button type="button" className={m.rated === false ? "on" : ""} disabled={m.rated != null} onClick={() => rate(i, false)} aria-label={t("chatNotHelpful")} title={t("chatNotHelpful")}><ThumbsDown size={13} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="chatw-row is-bot">
              <div className="chatw-bubble bot chatw-typing" aria-label={t("chatThinking")}><i /><i /><i /></div>
            </div>
          )}
        </div>

        <form className="chatw-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("chatPlaceholder")}
            maxLength={1000}
            disabled={busy}
            autoComplete="off"
          />
          <button type="submit" className="chatw-send" disabled={busy || !input.trim()} aria-label={t("chatSend")}>
            <Send size={16} />
          </button>
        </form>
      </section>

      <button
        type="button"
        className={`chatw-fab ${open ? "is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("chatClose") : t("chatOpen")}
        aria-expanded={open}
      >
        {!open && <span className="chatw-pulse" />}
        <MessageCircle size={24} className="chatw-fab-ic chatw-ic-chat" />
        <X size={24} className="chatw-fab-ic chatw-ic-x" />
        {!open && <span className="chatw-tip">{t("chatOpen")}</span>}
      </button>
    </div>
  );
}
