import React, { useState } from "react";
import { ShieldCheck, MessageSquare, ListChecks } from "lucide-react";
import InteractionForm from "./components/InteractionForm";
import ChatPanel from "./components/ChatPanel";

export default function App() {
  const [mobileTab, setMobileTab] = useState("form");

  return (
    <div style={{ fontFamily: "'Inter', ui-sans-serif, system-ui", background: "#F7F9FA" }} className="min-h-screen w-full">
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
          <InteractionForm mobileTab={mobileTab} />
          <ChatPanel mobileTab={mobileTab} />
        </div>

        <p className="text-[11px] text-center mt-4" style={{ color: "#0F2A3D66" }}>
          Connected to FastAPI backend → LangGraph → Groq (llama-3.3-70b-versatile).
        </p>
      </div>
    </div>
  );
}
