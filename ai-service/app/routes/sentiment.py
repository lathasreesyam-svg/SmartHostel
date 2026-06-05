from fastapi import APIRouter
from pydantic import BaseModel
import random

router = APIRouter()


class SentimentRequest(BaseModel):
    text: str
    context: str = "feedback"


class SentimentResponse(BaseModel):
    sentiment: str  # positive, negative, neutral
    confidence: float
    keywords: list[str]
    summary: str


def mock_sentiment(text: str) -> SentimentResponse:
    """Mock sentiment analysis - replace with OpenAI/Gemini API call"""
    text_lower = text.lower()

    positive_words = ["good", "great", "excellent", "delicious", "tasty", "clean", "happy", "love", "amazing"]
    negative_words = ["bad", "poor", "dirty", "cold", "stale", "worst", "horrible", "awful", "disgusting"]

    pos_count = sum(1 for w in positive_words if w in text_lower)
    neg_count = sum(1 for w in negative_words if w in text_lower)

    if pos_count > neg_count:
        sentiment = "positive"
        confidence = min(0.95, 0.6 + pos_count * 0.1)
    elif neg_count > pos_count:
        sentiment = "negative"
        confidence = min(0.95, 0.6 + neg_count * 0.1)
    else:
        sentiment = "neutral"
        confidence = 0.65

    # Extract simple keywords
    words = text.split()
    keywords = [w for w in words if len(w) > 4][:5]

    return SentimentResponse(
        sentiment=sentiment,
        confidence=round(confidence, 2),
        keywords=keywords,
        summary=f"The feedback is {sentiment} with {round(confidence * 100)}% confidence.",
    )


@router.post("/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    """
    Analyze the sentiment of feedback text.
    Currently uses mock analysis — connect to OpenAI/Gemini for production.
    """
    return mock_sentiment(request.text)
