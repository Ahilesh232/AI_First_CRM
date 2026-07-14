import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, CheckCircle2 } from "lucide-react";
import { useSelector, useDispatch } from 'react-redux';
import { addMessage, sendMessageToAgent } from '../store/interactionSlice';
// extractionMock.js is no longer imported!

export default function ChatPanel({ mobileTab }) {
  const dispatch = useDispatch();
  const { messages, loading } = useSelector((state) => state.interaction);
  const [chatInput, setChatInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  function sendMessage() {
    const text = chatInput.trim();
    if (!text || loading) return;
    
    // Add user message to UI
    dispatch(addMessage({ role: "user", text, type: "user" }));
    setChatInput("");
    
    // Send to LangGraph Agent backend
    dispatch(sendMessageToAgent(text));
  }

  // Render text with basic markdown bold support
  function renderText(text) {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  }

  return (
    <div
      className={`rounded-xl border flex flex-col ${mobileTab === "chat" ? "flex" : "hidden"} sm:flex`}
      style={{ background: "#fff", borderColor: "#E1E7EA", height: 560 }}
    >
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "#E1E7EA" }}>
        <Bot size={22} className="text-[#0066FF]" />
        <div>
          <div className="text-[15px] font-bold text-[#0066FF]">
            AI Assistant
          </div>
          <div className="text-[11px]" style={{ color: "#0F2A3D99" }}>
            Log Interaction details here via chat
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m, i) => {
          if (m.type === "initial") {
            return (
              <div key={i} className="flex justify-start">
                <div className="w-full px-4 py-3 rounded-xl text-[13px] leading-relaxed bg-[#E8F4FD] text-[#0F2A3D]">
                  {m.text}
                </div>
              </div>
            );
          } else if (m.role === "user") {
            return (
              <div key={i} className="flex justify-start">
                <div className="w-full px-4 py-3 rounded-r-xl rounded-l-sm text-[13px] leading-relaxed bg-[#F2F4F7] text-[#0F2A3D] border-l-[3px] border-[#0066FF]">
                  {m.text}
                </div>
              </div>
            );
          } else if (m.type === "success") {
            return (
              <div key={i} className="flex justify-start">
                <div className="w-full px-4 py-3 rounded-xl text-[13px] leading-relaxed bg-[#E8F8EE] text-[#136C44] flex gap-2 border border-[#C6EAD6]">
                  <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                  <div>{renderText(m.text)}</div>
                </div>
              </div>
            );
          }
          return null;
        })}
        {loading && (
          <div className="flex justify-start">
             <div className="px-4 py-3 rounded-xl text-[13px] leading-relaxed bg-[#F2F4F7] text-[#0F2A3D] animate-pulse">
                Thinking...
             </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t flex items-center gap-3" style={{ borderColor: "#E1E7EA" }}>
        <input
          className="flex-1 px-4 py-3 rounded-xl border text-[13px] outline-none"
          style={{ borderColor: "#E1E7EA" }}
          placeholder="Describe Interaction..."
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className={`w-[46px] h-[46px] rounded-full flex flex-col items-center justify-center flex-shrink-0 bg-[#0066FF] hover:bg-blue-700 transition-colors ${loading ? 'opacity-50' : ''}`}
        >
          <span className="text-white text-[12px] font-bold leading-none mb-0.5" style={{ fontFamily: 'monospace' }}>A</span>
          <span className="text-white text-[10px] font-semibold leading-none">Log</span>
        </button>
      </div>
    </div>
  );
}
