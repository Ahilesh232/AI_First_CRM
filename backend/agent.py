import os
from typing import TypedDict, Annotated, Dict, Any
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
import json
from datetime import datetime

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Define the extraction schema for the LLM
class InteractionExtraction(BaseModel):
    hcpName: str = Field(description="The name of the Healthcare Professional, e.g. Dr. Smith", default="")
    sentiment: str = Field(description="Sentiment of the interaction. Must be one of: Positive, Neutral, Negative", default="")
    materials: list[str] = Field(description="Materials or samples shared, e.g. ['Brochure', 'Materials']", default=[])
    samples: list[str] = Field(description="Physical product samples distributed", default=[])
    topics: str = Field(description="The medical topics or products discussed", default="")
    outcomes: str = Field(description="Key outcomes or agreements", default="")
    interactionType: str = Field(description="Type of interaction. E.g., Meeting, Call, Meal Program", default="Meeting")

class AgentState(TypedDict):
    input_text: str
    extracted_data: Dict[str, Any]
    summary: str

# 1. Extraction Node
def extract_entities(state: AgentState):
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)
    structured_llm = llm.with_structured_output(InteractionExtraction)
    
    now = datetime.now()
    
    prompt = f"""
    You are a CRM assistant for a pharma rep. Extract the details of the HCP interaction from the user's text.
    If a field is not mentioned, leave it empty.
    
    User Text: {state['input_text']}
    """
    
    try:
        result = structured_llm.invoke(prompt)
        
        # Convert to dict and clean empty values
        extracted = {k: v for k, v in result.dict().items() if v}
        
        # Add current date and time if we extracted something meaningful (like a name or topic)
        if "hcpName" in extracted or "topics" in extracted:
            extracted["date"] = now.strftime("%Y-%m-%d")
            extracted["time"] = now.strftime("%H:%M")
            
        return {"extracted_data": extracted}
    except Exception as e:
        print(f"LLM Error: {e}")
        return {"extracted_data": {}}

# 2. Confirmation Node
def generate_summary(state: AgentState):
    extracted = state.get("extracted_data", {})
    
    if not extracted:
        summary = "Noted — I didn't find enough detail to auto-fill new fields. Feel free to add more, or edit the form directly."
    else:
        fields_filled = [k for k in extracted.keys() if k not in ["date", "time", "interactionType"]]
        
        if fields_filled:
            summary = "**Interaction logged successfully!** The details have been automatically populated based on your summary. Would you like me to suggest a specific follow-up action, such as scheduling a meeting?"
        else:
            summary = "Noted — I didn't find enough detail to auto-fill new fields. Feel free to add more, or edit the form directly."
            
    return {"summary": summary}

# Build Graph
builder = StateGraph(AgentState)
builder.add_node("extract", extract_entities)
builder.add_node("summarize", generate_summary)

builder.set_entry_point("extract")
builder.add_edge("extract", "summarize")
builder.add_edge("summarize", END)

agent_executor = builder.compile()

def process_chat_message(text: str) -> dict:
    """Entry point for the FastAPI route"""
    if not os.environ.get("GROQ_API_KEY") or os.environ.get("GROQ_API_KEY") == "your_groq_api_key_here":
        # Fallback if API key is not configured yet
        return mock_process(text)
        
    initial_state = {"input_text": text, "extracted_data": {}, "summary": ""}
    result = agent_executor.invoke(initial_state)
    
    extracted = result.get("extracted_data", {})
    return {
        "extracted": extracted,
        "summary": result.get("summary", ""),
        "type": "success" if extracted else "initial"
    }

def mock_process(text: str):
    """Fallback function similar to frontend mock if no API key"""
    import re
    from datetime import datetime
    
    out = {}
    name_match = re.search(r'Dr\.?\s+[A-Z][a-z]+', text)
    if name_match: out['hcpName'] = name_match.group(0)
    
    if re.search(r'positive', text, re.I): out['sentiment'] = "Positive"
    elif re.search(r'negative', text, re.I): out['sentiment'] = "Negative"
    elif re.search(r'neutral', text, re.I): out['sentiment'] = "Neutral"
    
    materials = []
    if re.search(r'brochure', text, re.I): materials.append("Brochures")
    if materials: out['materials'] = materials
    
    samples = []
    if re.search(r'sample', text, re.I): samples.append("Samples")
    if samples: out['samples'] = samples
    
    if re.search(r'outcome|agree|schedule', text, re.I): out['outcomes'] = "Agreed to follow up."
    
    if name_match:
        now = datetime.now()
        out['date'] = now.strftime("%Y-%m-%d")
        out['time'] = now.strftime("%H:%M")
        
    summary = "**Interaction logged successfully!** (Mock Fallback)" if out else "Noted — I didn't find enough detail."
    return {"extracted": out, "summary": summary, "type": "success" if out else "initial"}
