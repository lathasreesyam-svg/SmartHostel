from fastapi import APIRouter
from pydantic import BaseModel
import random

router = APIRouter()


class MenuRecommendRequest(BaseModel):
    preferences: list[str] = []
    dietary_restrictions: list[str] = []
    season: str = "summer"
    day_of_week: str = "monday"


class MenuRecommendResponse(BaseModel):
    recommendations: list[dict]
    nutritional_tips: list[str]
    reasoning: str


MOCK_ITEMS = {
    "BREAKFAST": [
        {"name": "Idli Sambar", "isVeg": True, "calories": 350, "category": "South Indian"},
        {"name": "Poha", "isVeg": True, "calories": 280, "category": "Light"},
        {"name": "Bread Omelette", "isVeg": False, "calories": 420, "category": "Continental"},
        {"name": "Upma", "isVeg": True, "calories": 300, "category": "South Indian"},
    ],
    "LUNCH": [
        {"name": "Rice + Dal + Sabzi", "isVeg": True, "calories": 650, "category": "North Indian"},
        {"name": "Roti + Paneer Butter Masala", "isVeg": True, "calories": 700, "category": "North Indian"},
        {"name": "Pulao + Raita", "isVeg": True, "calories": 580, "category": "Rice"},
        {"name": "Chole Bhature", "isVeg": True, "calories": 720, "category": "Punjabi"},
    ],
    "SNACKS": [
        {"name": "Samosa + Chutney", "isVeg": True, "calories": 280, "category": "Snacks"},
        {"name": "Bread Pakora", "isVeg": True, "calories": 320, "category": "Fried"},
        {"name": "Fruits + Juice", "isVeg": True, "calories": 180, "category": "Healthy"},
    ],
    "DINNER": [
        {"name": "Rice + Rajma + Salad", "isVeg": True, "calories": 620, "category": "North Indian"},
        {"name": "Roti + Dal + Sabzi", "isVeg": True, "calories": 580, "category": "North Indian"},
        {"name": "Biryani", "isVeg": False, "calories": 750, "category": "Rice"},
    ],
}

NUTRITIONAL_TIPS = [
    "Include at least one seasonal vegetable in each meal",
    "Ensure adequate protein intake with dal, paneer, or eggs",
    "Limit fried food to 2-3 times per week",
    "Include a fruit item in breakfast or snacks",
    "Use minimal oil and prefer healthy cooking methods",
]


@router.post("/menu", response_model=MenuRecommendResponse)
async def recommend_menu(request: MenuRecommendRequest):
    """
    AI-powered menu recommendations based on preferences and dietary restrictions.
    Currently uses mock data — connect to LLM for production.
    """
    recommendations = []
    for meal_type, items in MOCK_ITEMS.items():
        filtered = [i for i in items if not (i["isVeg"] is False and "veg" in request.dietary_restrictions)]
        if filtered:
            chosen = random.choice(filtered)
            recommendations.append({"mealType": meal_type, **chosen})

    return MenuRecommendResponse(
        recommendations=recommendations,
        nutritional_tips=random.sample(NUTRITIONAL_TIPS, 3),
        reasoning=f"Recommendations tailored for {request.season} season on {request.day_of_week}.",
    )
