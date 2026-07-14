from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models, schemas, agent
from database import engine, get_db

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="HCP Interaction API")

# Allow CORS for local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/assistant/message", response_model=schemas.AgentResponse)
def process_message(message: schemas.ChatMessage):
    """
    Route that receives natural language chat from the frontend,
    runs it through the LangGraph agent, and returns structured extraction + summary.
    """
    result = agent.process_chat_message(message.text)
    return result

@app.post("/interactions")
def create_interaction(interaction: schemas.InteractionCreate, db: Session = Depends(get_db)):
    """
    Standard structured form submission endpoint.
    """
    db_interaction = models.Interaction(**interaction.dict())
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction
