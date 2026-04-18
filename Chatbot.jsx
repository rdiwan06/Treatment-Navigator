import { useState, useRef, useEffect } from "react";
import { searchDrugsByCondition, summarizeDrugWithGemini } from "../utils/fdaApi";

// ─── PASTE YOUR GEMINI API KEY HERE ───────────────────────────────────────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// ──────────────────────────────────────────────────────────────────────────────

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are a compassionate medical information assistant helping patients 
understand their treatment options. Your job is to have a brief, warm conversation to understand:
1. Their medical condition or diagnosis
2. Severity (mild/moderate/severe or early/advanced)
3. Any prior treatments they have tried

Ask naturally, one or two questions at a time. Once you have enough information, respond with 
a short empathetic message, then output EXACTLY this JSON block and nothing after it:

<CONDITION_JSON>
{
  "condition": "<the condition as a simple search term, e.g. 'diabetes' or 'hypertension'>",
  "summary": "<1 warm sentence acknowledging what they told you>"
}
</CONDITION_JSON>

Keep the condition field short and searchable — no punctuation, just the plain condition name.`;

export default function Chatbot({ onDrugsReady }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hi! I'm here to help you explore drug options and clinical trials. 👋\n\nTo get started — what condition or diagnosis are you dealing with, and how long have you been experiencing it?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [done, setDone] = useState(false);
  const [fdaStatus, setFdaStatus] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, fdaStatus]);

  async function send() {
    const text = input.trim();
    if (!text || loading || done) return;
    setInput("");
    setLoading(true);

    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    const newHistory = [...history, { role: "user", parts: [{ text }] }];

    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: newHistory,
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I had trouble responding.";
      setHistory([...newHistory, { role: "model", parts: [{ text: reply }] }]);

      const jsonMatch = reply.match(/<CONDITION_JSON>([\s\S]*?)<\/CONDITION_JSON>/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        const cleanReply = reply.replace(/<CONDITION_JSON>[\s\S]*?<\/CONDITION_JSON>/, "").trim();
        setMessages([...newMessages, { role: "ai", text: cleanReply || parsed.summary }]);
        setLoading(false);
        setDone(true);
        await lookupFDADrugs(parsed.condition);
      } else {
        setMessages([...newMessages, { role: "ai", text: reply }]);
        setLoading(false);
      }
    } catch (err) {
      setMessages([
        ...messages,
        { role: "ai", text: `⚠️ Error: ${err.message}. Check your API key in Chatbot.jsx.` },
      ]);
      setLoading(false);
    }
  }

  async function lookupFDADrugs(condition) {
    setFdaStatus(`Searching FDA database for "${condition}" drugs…`);

    const fdaDrugs = await searchDrugsByCondition(condition);

    if (fdaDrugs.length === 0) {
      setFdaStatus("");
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: `I searched the FDA database for "${condition}" but didn't find labeled drugs matching that exact term. Try a simpler condition name like "diabetes" or "hypertension".`,
        },
      ]);
      return;
    }

    setFdaStatus(`Found ${fdaDrugs.length} FDA-approved drugs. Generating plain-English summaries…`);

    const drugsWithDescriptions = await Promise.all(
      fdaDrugs.map(async (drug) => {
        const desc = await summarizeDrugWithGemini(drug, condition, GEMINI_API_KEY);
        return { ...drug, desc };
      })
    );

    setFdaStatus("");
    onDrugsReady({ condition, drugs: drugsWithDescriptions });
  }

  return (
    <div style={{ border: "1px solid #e0e0e0", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 320, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10, background: "#fafafa" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "78%", padding: "9px 13px", borderRadius: 14,
              fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap",
              background: m.role === "user" ? "#1a1a1a" : "#fff",
              color: m.role === "user" ? "#fff" : "#1a1a1a",
              border: m.role === "ai" ? "1px solid #e8e8e8" : "none",
            }}>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex" }}>
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 14, padding: "10px 14px", display: "flex", gap: 5 }}>
              {[0, 1, 2].map((n) => (
                <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: "#aaa", animation: "bounce 0.9s infinite", animationDelay: `${n * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}

        {fdaStatus && (
          <div style={{ display: "flex" }}>
            <div style={{ background: "#f0f7ff", border: "1px solid #cce0ff", borderRadius: 14, padding: "9px 13px", fontSize: 12, color: "#1a56db" }}>
              🔍 {fdaStatus}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid #e8e8e8", background: "#fff" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={done ? "Looking up FDA data…" : "Type your message…"}
          disabled={done}
          style={{ flex: 1, padding: "8px 14px", borderRadius: 20, border: "1px solid #ddd", fontSize: 13, outline: "none", background: done ? "#f5f5f5" : "#fff" }}
        />
        <button
          onClick={send}
          disabled={loading || done}
          style={{ padding: "8px 18px", borderRadius: 20, border: "none", background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 500, cursor: loading || done ? "default" : "pointer", opacity: loading || done ? 0.45 : 1 }}
        >
          Send
        </button>
      </div>

      <style>{`@keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>
    </div>
  );
}
