from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class InteractionCreate(BaseModel):
    hcpName: Optional[str] = None
    interactionType: Optional[str] = "Meeting"
    date: Optional[str] = None
    time: Optional[str] = None
    attendees: Optional[List[str]] = []
    topics: Optional[str] = None
    sentiment: Optional[str] = None
    materials: Optional[List[str]] = []
    samples: Optional[List[str]] = []
    outcomes: Optional[str] = None
    aiTouched: Optional[Dict[str, bool]] = {}

class ChatMessage(BaseModel):
    text: str
    session_id: str = "default"

class AgentResponse(BaseModel):
    extracted: Dict[str, Any]
    summary: str
    type: str
