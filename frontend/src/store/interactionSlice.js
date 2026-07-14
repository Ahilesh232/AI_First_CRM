import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// The AI_FIELDS constant to track which fields the AI has modified
const AI_FIELDS = new Set(["hcpName", "topics", "sentiment", "materials", "attendees", "samples", "outcomes"]);

const initialState = {
  fields: {
    hcpName: "",
    interactionType: "Meeting",
    date: "",
    time: "",
    attendees: [],
    topics: "",
    sentiment: "",
    materials: [],
    samples: [],
    outcomes: "",
  },
  aiTouched: {},
  messages: [
    {
      type: "initial",
      role: "assistant",
      text: 'Log interaction details here (e.g., "Met Dr. Smith, discussed Prodo-X efficacy, positive sentiment, shared brochure") or ask for help.',
    },
  ],
  loading: false,
  error: null
};

// Async thunk to send message to FastAPI backend
export const sendMessageToAgent = createAsyncThunk(
  'interaction/sendMessage',
  async (text, { getState, rejectWithValue }) => {
    try {
      // In production, this URL will point to the real FastAPI backend
      const response = await axios.post('http://127.0.0.1:8000/assistant/message', {
        text: text,
        session_id: "default-session" // Simplified for this prototype
      });
      return response.data;
    } catch (err) {
      // If backend is unavailable, fallback to mock data for demonstration
      console.warn("Backend unavailable, using mock extraction");
      return rejectWithValue(err.message);
    }
  }
);

export const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    updateField: (state, action) => {
      const { key, value } = action.payload;
      state.fields[key] = value;
      // Manual edit overrides AI provenance
      state.aiTouched[key] = false;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    applyExtraction: (state, action) => {
      const extracted = action.payload;
      state.fields = { ...state.fields, ...extracted };
      Object.keys(extracted).forEach((k) => {
        if (AI_FIELDS.has(k)) state.aiTouched[k] = true;
      });
    },
    resetForm: () => initialState
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessageToAgent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessageToAgent.fulfilled, (state, action) => {
        state.loading = false;
        
        // Response format expected from FastAPI: { extracted: {...}, summary: "...", type: "success" }
        const { extracted, summary, type } = action.payload;
        
        if (extracted && Object.keys(extracted).length > 0) {
          state.fields = { ...state.fields, ...extracted };
          Object.keys(extracted).forEach((k) => {
            if (AI_FIELDS.has(k)) state.aiTouched[k] = true;
          });
        }
        
        state.messages.push({
          role: "assistant",
          text: summary || "Processed interaction.",
          type: type || "success"
        });
      })
      .addCase(sendMessageToAgent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.messages.push({
          role: "assistant",
          text: "Failed to connect to the AI Agent backend. Make sure FastAPI is running on port 8000.",
          type: "initial"
        });
      });
  },
});

export const { updateField, addMessage, applyExtraction, resetForm } = interactionSlice.actions;

export default interactionSlice.reducer;
