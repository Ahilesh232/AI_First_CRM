import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Pencil, Check, Clock, Users, FileText, Package, ChevronDown, ShieldCheck, MessageSquare, ListChecks, Mic } from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens (see accompanying doc for rationale)
//   ink      #0F2A3D  primary text / headers
//   surface  #F7F9FA  page background
//   card     #FFFFFF  panels
//   line     #E1E7EA  borders
//   teal     #1E7F72  primary accent / AI actions
//   tealSoft #E4F2EF  AI-filled field background
//   amber    #C98A3E  compliance / attention
// ---------------------------------------------------------------------------

const initialFields = {
  hcpName: "",
  interactionType: "Meeting",
  date: "",
  time: "",
  attendees: [],
  topics: "",
  sentiment: "",
  materials: [],
};

const AI_FIELDS = new Set(["hcpName", "topics", "sentiment", "materials", "attendees"]);

function extractFromText(text) {
  // Lightweight client-side stand-in for the LangGraph "log_interaction" tool's
  // extraction step. In production this call goes to FastAPI -> LangGraph -> Groq.
  const out = {};
  const nameMatch = text.match(/Dr\.?\s+[A-Z][a-z]+/);
  if (nameMatch) out.hcpName = nameMatch[0];

  if (/positive/i.test(text)) out.sentiment = "Positive";
  else if (/negative/i.test(text)) out.sentiment = "Negative";
  else if (/neutral/i.test(text)) out.sentiment = "Neutral";

  const materials = [];
  if (/brochure/i.test(text)) materials.push("Brochure");
  if (/sample/i.test(text)) materials.push("Samples");
  if (/leave.?behind/i.test(text)) materials.push("Leave-behind");
  if (materials.length) out.materials = materials;

  const topicMatch = text.match(/discuss(?:ed)?\s+([^.,]+)/i);
  if (topicMatch) out.topics = topicMatch[1].trim();
  else if (/efficacy|dosing|side effects|indication/i.test(text)) {
    const m = text.match(/(efficacy|dosing|side effects|indication)[^.,]*/i);
    if (m) out.topics = m[0];
  }

  if (/^met with|^i met/i.test(text.trim()) === false && /meeting/i.test(text)) {
    out.interactionType = "Meeting";
  }
  if (/call/i.test(text)) out.interactionType = "Call";
  if (/lunch|dinner/i.test(text)) out.interactionType = "Meal Program";

  const now = new Date();
  out.date = now.toISOString().slice(0, 10);
  out.time = now.toTimeString().slice(0, 5);

  return out;
}

function FieldLabel({ icon: Icon, children, aiFilled }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      {Icon && <Icon size={13} strokeWidth={2} style={{ color: "#0F2A3D99" }} />}
      <span className="text-[12.5px] font-semibold tracking-wide" style={{ color: "#0F2A3D" }}>
        {children}
      </span>
      {aiFilled && (
        <span
          className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: "#E4F2EF", color: "#1E7F72" }}
        >
          <Sparkles size={9} /> AI-filled
        </span>
      )}
    </div>
  );
}

export default function LogHCPInteraction() {
  const [fields, setFields] = useState(initialFields);
  const [aiTouched, setAiTouched] = useState({});
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: 'Tell me about the interaction — who you saw, what you discussed, sentiment, and any materials shared. I\'ll fill in the form and flag anything that needs your review.',
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [mobileTab, setMobileTab] = useState("form");
  const [submitted, setSubmitted] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function applyExtraction(extracted) {
    setFields((prev) => ({ ...prev, ...extracted }));
    const touched = {};
    Object.keys(extracted).forEach((k) => {
      if (AI_FIELDS.has(k)) touched[k] = true;
    });
    setAiTouched((prev) => ({ ...prev, ...touched }));
  }

  function sendMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setChatInput("");
    const extracted = extractFromText(text);
    setTimeout(() => {
      applyExtraction(extracted);
      const filledList = Object.keys(extracted).filter((k) => AI_FIELDS.has(k));
      const summary =
        filledList.length > 0
          ? `Got it — I've populated ${filledList.join(", ")} in the form. Anything AI-filled is marked so it's clear what to double-check before you submit.`
          : "Noted — I didn't find enough detail to auto-fill new fields. Feel free to add more, or edit the form directly.";
      setMessages((m) => [...m, { role: "assistant", text: summary }]);
    }, 500);
  }

  function editField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
    // A manual edit overrides AI provenance for that field.
    setAiTouched((prev) => ({ ...prev, [key]: false }));
  }

  const inputBase =
    "w-full px-3 py-2 rounded-lg border text-[13.5px] outline-none transition-colors focus:ring-2";

  function fieldStyle(key) {
    return aiTouched[key]
      ? { background: "#E4F2EF", borderColor: "#1E7F72", boxShadow: "0 0 0 0px" }
      : { background: "#fff", borderColor: "#E1E7EA" };
  }

  return (
    <div style={{ fontFamily: "'Inter', ui-sans-serif, system-ui", background: "#F7F9FA" }} className="min-h-full w-full">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[20px] font-bold" style={{ color: "#0F2A3D" }}>
              Log HCP Interaction
            </h1>
            <p className="text-[12.5px] mt-0.5" style={{ color: "#0F2A3D99" }}>
              Structured form and conversational logging stay in sync — use either, or both.
            </p>
          </div>
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold"
            style={{ background: "#FBF3E7", color: "#C98A3E", border: "1px solid #F0DCB8" }}
          >
            <ShieldCheck size={13} /> Draft — not yet submitted
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex sm:hidden mb-3 rounded-lg overflow-hidden border" style={{ borderColor: "#E1E7EA" }}>
          {["form", "chat"].map((t) => (
            <button
              key={t}
              onClick={() => setMobileTab(t)}
              className="flex-1 py-2 text-[12.5px] font-semibold flex items-center justify-center gap-1.5"
              style={{
                background: mobileTab === t ? "#0F2A3D" : "#fff",
                color: mobileTab === t ? "#fff" : "#0F2A3D",
              }}
            >
              {t === "form" ? <ListChecks size={13} /> : <MessageSquare size={13} />}
              {t === "form" ? "Form" : "Assistant"}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* FORM PANEL */}
          <div
            className={`rounded-xl border p-5 ${mobileTab === "form" ? "block" : "hidden"} sm:block`}
            style={{ background: "#fff", borderColor: "#E1E7EA" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "#0F2A3D" }}>
                Interaction Details
              </h2>
              <span className="text-[11px]" style={{ color: "#0F2A3D66" }}>
                Teal fields were filled by the assistant
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <FieldLabel aiFilled={aiTouched.hcpName}>HCP Name</FieldLabel>
                <input
                  className={inputBase}
                  style={fieldStyle("hcpName")}
                  value={fields.hcpName}
                  placeholder="Dr. Smith"
                  onChange={(e) => editField("hcpName", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Interaction Type</FieldLabel>
                <div className="relative">
                  <select
                    className={inputBase + " appearance-none pr-8"}
                    style={fieldStyle("interactionType")}
                    value={fields.interactionType}
                    onChange={(e) => editField("interactionType", e.target.value)}
                  >
                    <option>Meeting</option>
                    <option>Call</option>
                    <option>Meal Program</option>
                    <option>Conference</option>
                    <option>Virtual</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#0F2A3D66" }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <FieldLabel icon={Clock}>Date</FieldLabel>
                <input
                  type="date"
                  className={inputBase}
                  style={fieldStyle("date")}
                  value={fields.date}
                  onChange={(e) => editField("date", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel icon={Clock}>Time</FieldLabel>
                <input
                  type="time"
                  className={inputBase}
                  style={fieldStyle("time")}
                  value={fields.time}
                  onChange={(e) => editField("time", e.target.value)}
                />
              </div>
            </div>

            <div className="mb-3">
              <FieldLabel icon={Users} aiFilled={aiTouched.attendees}>
                Attendees
              </FieldLabel>
              <input
                className={inputBase}
                style={fieldStyle("attendees")}
                placeholder="Enter names or search..."
                value={Array.isArray(fields.attendees) ? fields.attendees.join(", ") : fields.attendees}
                onChange={(e) => editField("attendees", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </div>

            <div className="mb-3">
              <FieldLabel icon={FileText} aiFilled={aiTouched.topics}>
                Topics Discussed
              </FieldLabel>
              <textarea
                className={inputBase + " resize-none"}
                style={{ ...fieldStyle("topics"), minHeight: 64 }}
                value={fields.topics}
                placeholder="Product efficacy, dosing questions..."
                onChange={(e) => editField("topics", e.target.value)}
              />
              <button
                className="mt-1.5 text-[11.5px] font-medium flex items-center gap-1"
                style={{ color: "#1E7F72" }}
              >
                <Mic size={12} /> Summarize from voice note (requires consent)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-1">
              <div>
                <FieldLabel aiFilled={aiTouched.sentiment}>Sentiment</FieldLabel>
                <div className="relative">
                  <select
                    className={inputBase + " appearance-none pr-8"}
                    style={fieldStyle("sentiment")}
                    value={fields.sentiment}
                    onChange={(e) => editField("sentiment", e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option>Positive</option>
                    <option>Neutral</option>
                    <option>Negative</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#0F2A3D66" }} />
                </div>
              </div>
              <div>
                <FieldLabel icon={Package} aiFilled={aiTouched.materials}>
                  Materials Shared
                </FieldLabel>
                <input
                  className={inputBase}
                  style={fieldStyle("materials")}
                  placeholder="Brochures, samples..."
                  value={Array.isArray(fields.materials) ? fields.materials.join(", ") : fields.materials}
                  onChange={(e) => editField("materials", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                />
              </div>
            </div>

            <button
              onClick={() => setSubmitted(true)}
              className="mt-4 w-full py-2.5 rounded-lg font-semibold text-[13.5px] text-white flex items-center justify-center gap-2"
              style={{ background: "#0F2A3D" }}
            >
              <Check size={15} /> Submit Interaction
            </button>
            {submitted && (
              <p className="mt-2 text-[12px] text-center" style={{ color: "#1E7F72" }}>
                Logged. This would now call the log_interaction tool via the LangGraph agent.
              </p>
            )}
          </div>

          {/* CHAT PANEL */}
          <div
            className={`rounded-xl border flex flex-col ${mobileTab === "chat" ? "flex" : "hidden"} sm:flex`}
            style={{ background: "#fff", borderColor: "#E1E7EA", height: 560 }}
          >
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "#E1E7EA" }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "#1E7F72" }}
              >
                <Sparkles size={14} color="#fff" />
              </div>
              <div>
                <div className="text-[13px] font-bold" style={{ color: "#0F2A3D" }}>
                  Interaction Assistant
                </div>
                <div className="text-[11px]" style={{ color: "#0F2A3D80" }}>
                  Powered by the LangGraph HCP agent
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed"
                    style={
                      m.role === "user"
                        ? { background: "#0F2A3D", color: "#fff" }
                        : { background: "#F7F9FA", color: "#0F2A3D", border: "1px solid #E1E7EA" }
                    }
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: "#E1E7EA" }}>
              <input
                className="flex-1 px-3 py-2 rounded-lg border text-[13px] outline-none"
                style={{ borderColor: "#E1E7EA" }}
                placeholder="Describe the interaction..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "#1E7F72" }}
              >
                <Send size={15} color="#fff" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-center mt-4" style={{ color: "#0F2A3D66" }}>
          Prototype only — extraction is simulated client-side. In production this calls FastAPI → LangGraph → Groq (gemma2-9b-it).
        </p>
      </div>
    </div>
  );
}
