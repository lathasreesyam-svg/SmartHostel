from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from app.routes import sentiment, recommend, chat

app = FastAPI(
    title="SmartHostel AI Service",
    description="AI-powered features for hostel management — sentiment analysis, menu recommendations, and chatbot",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sentiment.router, prefix="/analyze", tags=["Sentiment Analysis"])
app.include_router(recommend.router, prefix="/recommend", tags=["Menu Recommendations"])
app.include_router(chat.router, prefix="/chat", tags=["AI Chatbot"])


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
        "mode": os.getenv("AI_MODE", "mock"),
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
