# AI-First CRM — HCP Module: Log Interaction Screen
### Technical Design Document

---

## 1. Objective Recap

Field reps need to log Healthcare Professional (HCP) interactions two ways — a structured form for speed/compliance, and a conversational interface for capturing detail naturally right after a visit. The two must stay in sync: whatever the assistant extracts from chat lands in the same form fields a rep could edit by hand, with visible provenance (AI-filled vs. human-entered) for audit purposes.

**Tech stack:** React + Redux (frontend) · FastAPI (backend) · LangGraph (agent orchestration) · Groq `gemma2-9b-it` as primary LLM, `llama-3.3-70b-versatile` as fallback/escalation model · PostgreSQL · Google Inter typeface.

---

## 2. Role of the LangGraph Agent

The LangGraph agent is the reasoning layer that sits between the chat UI and the CRM's data layer. It does not replace the form — it's a second way to arrive at the same structured record. Concretely, it:

1. **Interprets free-text rep input** ("Met Dr. Smith, discussed Product X efficacy, positive sentiment, left a brochure") and maps it onto the HCP interaction schema (HCP, date/time, topics, sentiment, materials, attendees).
2. **Holds conversational state** across a logging session — a rep can add detail across several messages, and the agent merges rather than overwrites.
3. **Decides which tool to call** based on intent: logging a new interaction vs. editing one already logged vs. looking up an HCP's history vs. scheduling a follow-up.
4. **Flags ambiguity instead of guessing silently** — e.g., if two HCPs share a surname, or sentiment isn't stated, the agent asks a clarifying question rather than fabricating a value. This matters more here than in a generic assistant: pharma HCP interaction logs are subject to compliance review (PDMA-style program requirements, spend transparency), so silent hallucination is a real liability, not just a UX flaw.
5. **Returns structured diffs**, not prose, to the frontend — the chat reply is for the rep, but the actual state update to Redux is a typed JSON patch, so the UI can highlight exactly which fields changed and mark them as AI-provenance.

The agent is best thought of as a **graph of small, auditable steps** (parse → extract → validate → confirm → write) rather than one large prompt, precisely so each step can be logged and, if needed, reviewed by a compliance team.

### 2.1 Graph shape (conceptual)

```
        ┌─────────────┐
        │   entry     │  (classify intent)
        └──────┬──────┘
     ┌─────────┼──────────┬───────────────┬───────────────┐
     ▼         ▼          ▼               ▼               ▼
 log_flow   edit_flow  lookup_flow   followup_flow   compliance_flow
     │         │          │               │               │
     └────┬────┴────┬─────┴───────┬───────┴───────┬───────┘
          ▼          ▼             ▼               ▼
     extract_entities (LLM)   validate_against_schema   confirm_with_user
          │
          ▼
     write_to_db (tool call) ──► emit structured diff ──► respond
```

Each flow is a LangGraph node (or small subgraph); a router node classifies intent from the incoming message and conversation state, then dispatches to the right subgraph. Nodes that call the LLM (`extract_entities`, `confirm_with_user`) are separated from nodes that touch the database, so the model never writes directly — it only ever proposes a structured object that a deterministic tool validates and persists.

---

## 3. Tools

Minimum five tools, as required. `log_interaction` and `edit_interaction` are detailed first per the brief.

### 3.1 `log_interaction` *(required)*

**Purpose:** Create a new HCP interaction record from either a chat message or a form submission.

**Input:** raw rep text (chat mode) *or* a partially-filled form object (form mode) + `rep_id`, `timestamp`.

**Behavior:**
1. If input is free text, call the LLM (Groq `gemma2-9b-it`) with a constrained extraction prompt that returns JSON matching the `Interaction` schema — HCP name, interaction type, date/time, attendees, topics, sentiment, materials shared.
2. Resolve `hcp_name` against the HCP master table (fuzzy match) rather than trusting the string verbatim — ambiguous matches trigger a clarifying question instead of a write.
3. Run the extracted object through a **Pydantic schema validator**; anything that fails validation (missing required field, invalid enum for `interaction_type`, sentiment not in {positive, neutral, negative}) is surfaced back to the rep as a targeted follow-up question, not a generic error.
4. Tag every field the LLM populated with `source: "ai"` and a per-field confidence score; fields the rep typed directly are tagged `source: "human"`. This provenance map is what powers the "AI-filled" badges in the UI and is stored alongside the record for audit.
5. Persist to Postgres via a single transaction; emit an event (`interaction.logged`) other tools/services can subscribe to (e.g., a compliance-flagging job).
6. Return a structured diff to the frontend so Redux can update only the changed fields, plus a natural-language confirmation for the chat pane.

**Why the LLM is used here specifically for summarization/entity extraction:** reps talk about visits the way they'd talk to a colleague, not the way a form is structured. The LLM's job is strictly translation (unstructured → structured), not decision-making — sentiment and materials are still constrained to enum values the schema already knows about, so the model can't invent a new category.

### 3.2 `edit_interaction` *(required)*

**Purpose:** Modify a previously logged interaction, either because the rep made a mistake or wants to add detail after the fact.

**Behavior:**
1. Resolve which record is being edited. If the rep says "actually it was negative sentiment" right after logging, the agent uses conversation state to infer the most recent interaction. If they reference an older one ("update last Tuesday's meeting with Dr. Smith"), the tool queries by HCP + date range and, if more than one match is found, asks the rep to disambiguate rather than editing the wrong record.
2. Compute a **field-level diff** between the existing record and the proposed change — only the changed fields are touched, everything else is left alone.
3. Every edit is written as a new row in an `interaction_audit_log` table (previous value, new value, editor — human rep vs. agent, timestamp, reason if given) rather than an in-place overwrite. This is non-negotiable for pharma: interaction records are subject to retrospective compliance review, so silent overwrites are not acceptable.
4. If the edit touches a field that's compliance-sensitive (e.g., materials shared, meal program spend), the tool routes through the same schema validator as `log_interaction` before committing.
5. Returns the updated record + diff, same shape as `log_interaction`, so the frontend handles both identically.

### 3.3 `search_hcp_profile`

Looks up an HCP's master record (specialty, affiliated institution, prescribing tier, consent/opt-out status for materials) so the agent can pre-fill context and reps don't have to repeat information the CRM already has. Also used to disambiguate name collisions in `log_interaction`.

### 3.4 `get_interaction_history`

Retrieves past interactions for a given HCP or rep, e.g. "when did I last see Dr. Smith" or "what have I discussed with her this quarter." Used both for rep convenience and to give the agent context — e.g., flagging that a topic was already covered in the last visit, which is useful for call-plan continuity.

### 3.5 `schedule_followup`

Creates a calendar/task entry off the back of a logged interaction (e.g., "schedule a follow-up meeting with Dr. Smith in 3 weeks"). This is the action the assistant proactively offers in the screenshot ("Would you like me to suggest a follow-up action?"). Writes to a `tasks` table and, if a calendar integration exists, pushes an event.

### 3.6 `check_compliance_flag`

Runs a logged or edited interaction against compliance rules — spend caps per HCP per year for meals/gifts, consent-on-file for sample distribution, restricted-topic lists for off-label discussion. Returns a pass/flag result; flagged interactions are surfaced to the rep ("this HCP has an active opt-out for printed materials — did you still share a brochure?") and logged for the compliance team, rather than silently blocked, since the rep may have legitimate context the system doesn't.

### 3.7 `fetch_product_information`

Retrieves approved, on-label messaging and materials for a given product so the agent can, if asked, help a rep recall what talking points are approved to discuss — pulling only from an approved content library, never generating clinical claims itself.

---

## 4. Frontend (React + Redux)

- **State shape:** a single `interactionDraft` slice holds the in-progress form; each field carries `{ value, source: 'human' | 'ai', confidence? }`. Chat messages live in a separate `assistantSession` slice keyed by draft ID, so refreshing the page doesn't lose either the form state or the conversation.
- **Sync mechanism:** the chat panel doesn't write to the DOM directly — it dispatches the same Redux actions (`fieldUpdated`) that the form's `onChange` handlers use, tagged with `source: 'ai'`. This is why the two panels can never drift out of sync: they're two input methods feeding one reducer.
- **Provenance UI:** any field with `source: 'ai'` renders with a teal background and a small "AI-filled" badge (see mockup). Editing it manually flips `source` back to `'human'` — this is the audit-relevant signal, so it has to be a first-class part of state, not a cosmetic flag.
- **Typography:** Google Inter throughout, per brief; weight/size used to establish hierarchy since a single typeface has to carry the whole UI's structure (bold 600–700 for labels/actions, regular 400 for input text, a muted tint of the ink color for secondary text like the provenance caption).

---

## 5. Backend (FastAPI) — surface sketch

```
POST   /interactions                  → log_interaction tool
PATCH  /interactions/{id}             → edit_interaction tool
GET    /interactions?hcp_id=&rep_id=  → get_interaction_history tool
GET    /hcps/search?q=                → search_hcp_profile tool
POST   /followups                     → schedule_followup tool
POST   /interactions/{id}/compliance-check → check_compliance_flag tool
POST   /assistant/message             → routes into the LangGraph agent;
                                          streams back { reply, diff }
```

`POST /assistant/message` is the only endpoint that touches LangGraph directly; every other endpoint is a plain CRUD path the form can hit without going through the agent at all. This means the structured-form path works even if the LLM provider is down — degrading gracefully is important for a field tool reps rely on mid-visit.

---

## 6. Data model (Postgres, simplified)

```sql
CREATE TABLE hcps (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT,
  institution TEXT,
  materials_opt_out BOOLEAN DEFAULT FALSE
);

CREATE TABLE interactions (
  id UUID PRIMARY KEY,
  hcp_id UUID REFERENCES hcps(id),
  rep_id UUID NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('Meeting','Call','Meal Program','Conference','Virtual')),
  occurred_at TIMESTAMPTZ NOT NULL,
  attendees TEXT[],
  topics TEXT,
  sentiment TEXT CHECK (sentiment IN ('Positive','Neutral','Negative')),
  materials TEXT[],
  field_sources JSONB,      -- { "topics": "ai", "sentiment": "human", ... }
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE interaction_audit_log (
  id UUID PRIMARY KEY,
  interaction_id UUID REFERENCES interactions(id),
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  edited_by TEXT NOT NULL,   -- rep id or 'agent'
  edited_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 7. Model choice notes

- **`gemma2-9b-it`** as the default: fast/cheap enough for the extraction step that runs on every chat message, which is the majority of agent calls.
- **`llama-3.3-70b-versatile`** as an escalation path: reserved for cases the router flags as ambiguous (low-confidence extraction, conflicting HCP name matches, compliance-flag edge cases) where a stronger model's reasoning is worth the extra latency/cost.

---

## 8. What's in the attached mockup

`log_hcp_interaction_screen.jsx` is a working (client-side simulated) React mockup of this screen: structured form on one side, assistant chat on the other, both bound to shared state. Sending a message like *"Met Dr. Smith, discussed Product X efficacy, positive sentiment, shared a brochure"* populates the form fields and marks each with the teal "AI-filled" badge described above — editing a field by hand clears that badge, matching the provenance behavior described in §4.
