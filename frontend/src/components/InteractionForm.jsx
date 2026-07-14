import React, { useState } from "react";
import { Sparkles, Clock, Users, FileText, Package, ChevronDown, Check, Mic, Search, Plus } from "lucide-react";
import { useSelector, useDispatch } from 'react-redux';
import { updateField } from '../store/interactionSlice';

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

export default function InteractionForm({ mobileTab }) {
  const [submitted, setSubmitted] = useState(false);
  const dispatch = useDispatch();
  const { fields, aiTouched } = useSelector((state) => state.interaction);

  const editField = (key, value) => {
    dispatch(updateField({ key, value }));
  };

  const inputBase =
    "w-full px-3 py-2 rounded-lg border text-[13.5px] outline-none transition-colors focus:ring-2";

  function fieldStyle(key) {
    return aiTouched[key]
      ? { background: "#E4F2EF", borderColor: "#1E7F72", boxShadow: "0 0 0 0px" }
      : { background: "#fff", borderColor: "#E1E7EA" };
  }

  return (
    <div
      className={`rounded-xl border p-5 overflow-y-auto ${mobileTab === "form" ? "block" : "hidden"} sm:block`}
      style={{ background: "#fff", borderColor: "#E1E7EA", height: 560 }}
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

      <div className="mb-4">
        <h3 className="text-[12.5px] font-bold mb-2" style={{ color: "#0F2A3D" }}>Materials Shared / Samples Distributed</h3>
        
        <div className="mb-3">
          <FieldLabel aiFilled={aiTouched.materials}>Materials Shared</FieldLabel>
          <div className="flex gap-2 items-start">
            <div className="flex-1 flex flex-wrap gap-1">
              {(!fields.materials || fields.materials.length === 0) ? (
                <span className="text-[12.5px] py-1" style={{ color: "#0F2A3D99" }}>No materials added.</span>
              ) : (
                fields.materials.map((m, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[#0066FF] text-white text-[11.5px] font-medium rounded-sm border border-transparent">
                    {m}
                  </span>
                ))
              )}
            </div>
            <button className="flex items-center gap-1 px-2 py-1 border rounded text-[11px] font-medium" style={{ color: "#0F2A3D99", borderColor: "#E1E7EA" }}>
              <Search size={12} /> Search/Add
            </button>
          </div>
        </div>

        <div className="mb-3">
          <FieldLabel aiFilled={aiTouched.samples}>Samples Distributed</FieldLabel>
          <div className="flex gap-2 items-start">
            <div className="flex-1 flex flex-wrap gap-1">
              {(!fields.samples || fields.samples.length === 0) ? (
                <span className="text-[12.5px] py-1" style={{ color: "#0F2A3D99" }}>No samples added.</span>
              ) : (
                fields.samples.map((s, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[#0066FF] text-white text-[11.5px] font-medium rounded-sm border border-transparent">
                    {s}
                  </span>
                ))
              )}
            </div>
            <button className="flex items-center gap-1 px-2 py-1 border rounded text-[11px] font-medium text-blue-600" style={{ borderColor: "#E1E7EA" }}>
              <Plus size={12} /> Add Sample
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <FieldLabel aiFilled={aiTouched.sentiment}>Observed/Inferred HCP Sentiment</FieldLabel>
        <div className="flex items-center gap-6 text-[12.5px] mt-2">
          {["Positive", "Neutral", "Negative"].map((s) => (
            <label key={s} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="sentiment"
                value={s}
                checked={fields.sentiment === s}
                onChange={() => editField("sentiment", s)}
                className="w-3.5 h-3.5 text-[#0066FF] focus:ring-[#0066FF] border-[#E1E7EA]"
              />
              <span className={fields.sentiment === s ? "font-semibold" : ""} style={{ color: "#0F2A3D" }}>
                {s === "Positive" && "😁 "}
                {s === "Neutral" && "😐 "}
                {s === "Negative" && "😠 "}
                {s}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <FieldLabel aiFilled={aiTouched.outcomes}>Outcomes</FieldLabel>
        <textarea
          className={inputBase + " resize-none bg-[#F7F9FA]"}
          style={{ ...fieldStyle("outcomes"), minHeight: 64 }}
          value={fields.outcomes}
          placeholder="Key outcomes or agreements..."
          onChange={(e) => editField("outcomes", e.target.value)}
        />
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
          Logged! In production, this would persist the Redux store to the database.
        </p>
      )}
    </div>
  );
}
