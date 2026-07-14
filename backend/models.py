from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Boolean
from sqlalchemy.sql import func
from database import Base
import uuid

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    hcp_name = Column(String, index=True)
    interaction_type = Column(String)
    date = Column(String)
    time = Column(String)
    attendees = Column(JSON)
    topics = Column(Text)
    sentiment = Column(String)
    materials = Column(JSON)
    
    # Store field provenance (e.g., {"hcpName": "ai", "topics": "human"})
    ai_touched = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
