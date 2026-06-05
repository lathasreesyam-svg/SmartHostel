from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    context: Optional[str] = "hostel"


class ChatResponse(BaseModel):
    reply: str
    suggestions: list[str]


MOCK_RESPONSES = {
    "menu": "Today's menu includes Idli Sambar for breakfast, Rice Dal Sabzi for lunch, Samosa for snacks, and Roti Rajma for dinner. You can check the full weekly schedule in the Menu section!",
    "rebate": "To apply for a mess rebate, go to the Rebates section, click 'Apply for Rebate', select your travel dates, and provide a reason. The committee will review within 2-3 days.",
    "complaint": "To file a complaint, navigate to the Complaints section and click 'New Complaint'. Choose the category, describe the issue, and submit. You can track status there!",
    "attendance": "You can generate your meal attendance QR code in the Attendance section. Show the QR at the mess counter to mark your presence.",
    "payment": "Mess fee is due on the 1st of every month. You can view your payment history and pending dues in the Payments section.",
    "default": "I'm your SmartHostel AI assistant! I can help you with questions about the menu, rebates, complaints, attendance, and payments. What would you like to know?",
}


def get_mock_reply(message: str) -> str:
    msg_lower = message.lower()
    for keyword, response in MOCK_RESPONSES.items():
        if keyword in msg_lower:
            return response
    return MOCK_RESPONSES["default"]


SUGGESTIONS = [
    "What's today's menu?",
    "How do I apply for a rebate?",
    "How to mark attendance?",
    "Check my payment status",
]


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI chatbot for hostel-related queries.
    Currently uses rule-based mock — connect to OpenAI/Gemini for production.
    """
    reply = get_mock_reply(request.message)
    return ChatResponse(reply=reply, suggestions=SUGGESTIONS[:3])
