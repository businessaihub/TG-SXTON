from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import secrets
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    telegram_id: Optional[str] = None
    username: Optional[str] = None
    wallet_address: Optional[str] = None
    ton_balance: float = 0.0
    stars_balance: float = 0.0
    sxton_points: float = 0.0
    referrer_id: Optional[str] = None
    referral_count: int = 0
    language: str = "en"
    subscribed_channels: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StickerPack(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    image_url: str
    price: float
    price_type: str = "TON"  # TON, STARS, SXTON
    purchase_types: List[str] = ["TON", "STARS", "SXTON"]  # Allowed purchase methods
    requires_subscription: bool = False
    required_channel_id: Optional[str] = None
    required_channel_link: Optional[str] = None
    rarity: str = "common"
    sticker_count: int
    is_featured: bool = False
    is_upcoming: bool = False
    countdown_date: Optional[str] = None
    owner_id: Optional[str] = None
    is_external: bool = False
    external_source: Optional[str] = None
    burn_enabled: bool = False
    burn_reward_points: float = 100
    show_number: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BannerAd(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    cover_image_url: Optional[str] = None
    link_url: str  # Channel or website link
    link_type: str = "channel"  # channel or website
    is_active: bool = True
    position: int = 0  # Display order
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Sticker(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pack_id: str
    owner_id: Optional[str] = None
    sticker_number: Optional[int] = None
    image_url: str
    price: Optional[float] = None
    is_listed: bool = False
    is_external: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Activity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pack_name: str
    action: str
    price: float
    price_type: str = "TON"
    is_free: bool = False
    is_simulation: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: Optional[str] = None
    to_user_id: Optional[str] = None
    sticker_id: Optional[str] = None
    pack_id: Optional[str] = None
    amount: float
    currency: str = "TON"
    transaction_type: str
    status: str = "completed"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Giveaway(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    creator_id: str
    pack_id: str
    pack_name: str
    entry_cost: float = 0.0
    requires_subscription: bool = False
    required_referrals: int = 0
    winner_id: Optional[str] = None
    status: str = "active"
    end_date: str
    participants: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "global_settings"
    commission_rate: float = 2.5
    no_commission_mode: bool = False
    min_sale_price: float = 1.0
    max_listings_per_collection: int = 10
    points_per_purchase: float = 500
    referral_level1_percent: float = 50.0
    referral_level2_percent: float = 10.0
    spin_price_ton: float = 1.0
    simulation_enabled: bool = False
    simulation_daily_volume: int = 50
    simulation_min_volume_ton: float = 500.0
    hot_mode: str = "manual"
    hot_collections: List[str] = []
    external_sources_enabled: Dict[str, bool] = {"mrkt": True, "igloo": True, "palace": True}

# ============ ADMIN AUTH ============

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
ADMIN_WALLET = os.getenv("ADMIN_TON_WALLET", "")

async def verify_admin(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authorized")
    
    token = authorization.replace("Bearer ", "")
    if token != f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}":
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return True

def remove_id(doc):
    """Remove MongoDB _id field from document"""
    if doc and "_id" in doc:
        doc.pop("_id")
    return doc

# ============ USER ENDPOINTS ============

class TelegramAuthRequest(BaseModel):
    telegram_id: str
    username: Optional[str] = None
    referrer_id: Optional[str] = None

@api_router.post("/auth/telegram")
async def telegram_auth(request: TelegramAuthRequest):
    """Authenticate or create user via Telegram"""
    user_doc = await db.users.find_one({"telegram_id": request.telegram_id}, {"_id": 0})
    
    if user_doc:
        return {"user": user_doc, "is_new": False}
    
    # Create new user
    user = User(telegram_id=request.telegram_id, username=request.username, referrer_id=request.referrer_id)
    doc = user.model_dump()
    await db.users.insert_one(doc)
    
    # Update referrer
    if request.referrer_id:
        await db.users.update_one(
            {"id": request.referrer_id},
            {"$inc": {"referral_count": 1}}
        )
    
    # Fetch the created user without _id
    new_user = await db.users.find_one({"id": doc["id"]}, {"_id": 0})
    return {"user": new_user, "is_new": True}

@api_router.get("/user/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.post("/wallet/connect")
async def connect_wallet(user_id: str, wallet_address: str):
    """Mock TonConnect wallet connection"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"wallet_address": wallet_address}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "wallet_address": wallet_address}

@api_router.post("/wallet/mock-balance")
async def mock_balance_update(user_id: str, ton: float = 0, stars: float = 0, points: float = 0):
    """Mock balance update for testing"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$inc": {"ton_balance": ton, "stars_balance": stars, "sxton_points": points}}
    )
    return {"success": True}

@api_router.post("/user/subscribe")
async def subscribe_channel(user_id: str, channel_id: str):
    """Mock channel subscription"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$addToSet": {"subscribed_channels": channel_id}}
    )
    return {"success": True}

# ============ MARKETPLACE ENDPOINTS ============

@api_router.get("/packs")
async def get_packs(filter_type: str = "all"):
    """Get sticker packs with filters"""
    query = {}
    if filter_type == "external":
        query["is_external"] = True
    elif filter_type == "upcoming":
        query["is_upcoming"] = True
    
    packs = await db.sticker_packs.find(query, {"_id": 0}).to_list(1000)
    return packs

@api_router.get("/packs/featured")
async def get_featured_packs():
    """Get featured packs for carousel"""
    packs = await db.sticker_packs.find({"is_featured": True}, {"_id": 0}).to_list(10)
    return packs

@api_router.get("/packs/{pack_id}")
async def get_pack(pack_id: str):
    pack = await db.sticker_packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    return pack

@api_router.get("/banners")
async def get_banners():
    """Get active banner ads"""
    banners = await db.banner_ads.find({"is_active": True}, {"_id": 0}).sort("position", 1).to_list(10)
    return banners

@api_router.post("/buy/pack")
async def buy_pack(user_id: str, pack_id: str, payment_type: str = "TON"):
    """Buy a sticker pack with subscription verification"""
    pack = await db.sticker_packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if payment type is allowed
    if payment_type not in pack.get("purchase_types", ["TON"]):
        raise HTTPException(status_code=400, detail=f"Payment type {payment_type} not allowed for this pack")
    
    # Check subscription requirement
    if pack.get("requires_subscription", False) and pack.get("required_channel_id"):
        if pack["required_channel_id"] not in user.get("subscribed_channels", []):
            raise HTTPException(
                status_code=403, 
                detail=f"Must subscribe to channel first: {pack.get('required_channel_link', 'Required channel')}"
            )
    
    # Check balance based on payment type
    if payment_type == "TON" and user["ton_balance"] < pack["price"]:
        raise HTTPException(status_code=400, detail="Insufficient TON balance")
    elif payment_type == "STARS" and user["stars_balance"] < pack["price"]:
        raise HTTPException(status_code=400, detail="Insufficient Stars balance")
    elif payment_type == "SXTON" and user["sxton_points"] < pack["price"]:
        raise HTTPException(status_code=400, detail="Insufficient SXTON points")
    
    # Deduct balance
    if payment_type == "TON":
        await db.users.update_one({"id": user_id}, {"$inc": {"ton_balance": -pack["price"], "sxton_points": 500}})
    elif payment_type == "STARS":
        await db.users.update_one({"id": user_id}, {"$inc": {"stars_balance": -pack["price"], "sxton_points": 500}})
    elif payment_type == "SXTON":
        await db.users.update_one({"id": user_id}, {"$inc": {"sxton_points": -pack["price"]}})
    
    # Create stickers for the pack
    for i in range(pack["sticker_count"]):
        sticker = Sticker(
            pack_id=pack_id,
            owner_id=user_id,
            sticker_number=i + 1,
            image_url=pack["image_url"]
        )
        await db.stickers.insert_one(sticker.model_dump())
    
    # Log activity
    activity = Activity(
        pack_name=pack["name"],
        action="bought",
        price=pack["price"],
        price_type=payment_type
    )
    await db.activity.insert_one(activity.model_dump())
    
    # Award referral points
    if user.get("referrer_id"):
        settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0}) or Settings().model_dump()
        level1_points = 500 * settings["referral_level1_percent"] / 100
        await db.users.update_one(
            {"id": user["referrer_id"]},
            {"$inc": {"sxton_points": level1_points}}
        )
    
    return {"success": True, "message": "Pack purchased successfully", "payment_type": payment_type}

@api_router.post("/sell/sticker")
async def sell_sticker(sticker_id: str, price: float):
    """List a sticker for sale"""
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0}) or Settings().model_dump()
    
    if price < settings["min_sale_price"]:
        raise HTTPException(status_code=400, detail=f"Minimum sale price is {settings['min_sale_price']} TON")
    
    result = await db.stickers.update_one(
        {"id": sticker_id},
        {"$set": {"is_listed": True, "price": price}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Sticker not found")
    
    return {"success": True, "message": "Sticker listed for sale"}

@api_router.post("/burn/sticker")
async def burn_sticker(user_id: str, sticker_id: str):
    """Burn a sticker for SXTON points"""
    sticker = await db.stickers.find_one({"id": sticker_id}, {"_id": 0})
    if not sticker or sticker["owner_id"] != user_id:
        raise HTTPException(status_code=404, detail="Sticker not found or not owned")
    
    pack = await db.sticker_packs.find_one({"id": sticker["pack_id"]}, {"_id": 0})
    if not pack or not pack["burn_enabled"]:
        raise HTTPException(status_code=400, detail="Burning not enabled for this pack")
    
    # Remove sticker
    await db.stickers.delete_one({"id": sticker_id})
    
    # Award points
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"sxton_points": pack["burn_reward_points"]}}
    )
    
    # Log activity
    activity = Activity(
        pack_name=pack["name"],
        action="burned",
        price=0,
        price_type="SXTON"
    )
    await db.activity.insert_one(activity.model_dump())
    
    return {"success": True, "points_earned": pack["burn_reward_points"]}

# ============ ACTIVITY ENDPOINTS ============

@api_router.get("/activity")
async def get_activity(filter_type: str = "all", limit: int = 50):
    """Get activity feed"""
    query = {}
    if filter_type == "paid":
        # Show only activities paid with TON or SXTON
        query["price_type"] = {"$in": ["TON", "SXTON"]}
    elif filter_type == "free":
        query["is_free"] = True
    
    activities = await db.activity.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return activities

# ============ ROULETTE/SPIN ENDPOINTS ============

@api_router.post("/spin")
async def spin_roulette(user_id: str):
    """Spin the roulette"""
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0}) or Settings().model_dump()
    spin_price = settings["spin_price_ton"]
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or user["ton_balance"] < spin_price:
        raise HTTPException(status_code=400, detail="Insufficient TON balance")
    
    # Deduct spin cost
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"ton_balance": -spin_price}}
    )
    
    # Get random pack
    all_packs = await db.sticker_packs.find({"is_external": False}, {"_id": 0}).to_list(1000)
    if not all_packs:
        raise HTTPException(status_code=404, detail="No packs available")
    
    won_pack = random.choice(all_packs)
    
    # Create stickers
    for i in range(won_pack["sticker_count"]):
        sticker = Sticker(
            pack_id=won_pack["id"],
            owner_id=user_id,
            sticker_number=i + 1,
            image_url=won_pack["image_url"]
        )
        await db.stickers.insert_one(sticker.model_dump())
    
    # Log activity
    activity = Activity(
        pack_name=won_pack["name"],
        action="opened",
        price=spin_price,
        price_type="TON"
    )
    await db.activity.insert_one(activity.model_dump())
    
    return {"success": True, "pack": won_pack}

# ============ HOT COLLECTIONS ============

@api_router.get("/hot")
async def get_hot_collections():
    """Get top 5 hot collections"""
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0}) or Settings().model_dump()
    
    if settings["hot_mode"] == "manual":
        hot_ids = settings["hot_collections"][:5]
        packs = []
        for pack_id in hot_ids:
            pack = await db.sticker_packs.find_one({"id": pack_id}, {"_id": 0})
            if pack:
                packs.append(pack)
        return packs
    else:
        packs = await db.sticker_packs.find({}, {"_id": 0}).limit(5).to_list(5)
        return packs

# ============ GIVEAWAYS ============

@api_router.post("/giveaway/create")
async def create_giveaway(
    creator_id: str,
    pack_id: str,
    entry_cost: float = 0.0,
    requires_subscription: bool = False,
    required_referrals: int = 0,
    end_date: str = ""
):
    pack = await db.sticker_packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    giveaway = Giveaway(
        creator_id=creator_id,
        pack_id=pack_id,
        pack_name=pack["name"],
        entry_cost=entry_cost,
        requires_subscription=requires_subscription,
        required_referrals=required_referrals,
        end_date=end_date
    )
    await db.giveaways.insert_one(giveaway.model_dump())
    return {"success": True, "giveaway": giveaway.model_dump()}

@api_router.get("/giveaways")
async def get_giveaways(status: str = "active"):
    giveaways = await db.giveaways.find({"status": status}, {"_id": 0}).to_list(100)
    return giveaways

# ============ ADMIN ENDPOINTS ============

class AdminLoginRequest(BaseModel):
    username: str
    password: str

@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    if request.username == ADMIN_USERNAME and request.password == ADMIN_PASSWORD:
        token = f"{request.username}:{request.password}"
        return {"success": True, "token": token, "is_admin": True}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/admin/analytics", dependencies=[Depends(verify_admin)])
async def get_analytics():
    total_users = await db.users.count_documents({})  
    total_packs = await db.sticker_packs.count_documents({})
    total_transactions = await db.activity.count_documents({})
    
    # Calculate total volume
    activities = await db.activity.find({"price_type": "TON"}, {"_id": 0}).to_list(10000)
    total_volume = sum(a["price"] for a in activities)
    
    # Calculate SXTON stats
    users = await db.users.find({}, {"_id": 0, "sxton_points": 1}).to_list(10000)
    total_sxton_distributed = sum(u.get("sxton_points", 0) for u in users)
    
    # Get override stats
    override_stats = await db.settings.find_one({"id": "analytics_override"}, {"_id": 0})
    
    return {
        "total_users": override_stats.get("total_users", total_users) if override_stats else total_users,
        "total_packs": total_packs,
        "total_transactions": total_transactions,
        "total_volume_ton": override_stats.get("total_volume", total_volume) if override_stats else total_volume,
        "online_users": override_stats.get("online_users") if override_stats else None,
        "total_sxton_distributed": override_stats.get("total_sxton_distributed", total_sxton_distributed) if override_stats else total_sxton_distributed,
        "total_sxton_spent": override_stats.get("total_sxton_spent", 0) if override_stats else 0
    }

@api_router.put("/admin/analytics/override", dependencies=[Depends(verify_admin)])
async def override_analytics(data: Dict[str, Any]):
    """Override analytics stats for display"""
    await db.settings.update_one(
        {"id": "analytics_override"},
        {"$set": data},
        upsert=True
    )
    return {"success": True}

@api_router.post("/admin/packs", dependencies=[Depends(verify_admin)])
async def create_pack(pack_data: Dict[str, Any]):
    pack = StickerPack(**pack_data)
    await db.sticker_packs.insert_one(pack.model_dump())
    return {"success": True, "pack": pack.model_dump()}

@api_router.put("/admin/packs/{pack_id}", dependencies=[Depends(verify_admin)])
async def update_pack(pack_id: str, pack_data: Dict[str, Any]):
    result = await db.sticker_packs.update_one(
        {"id": pack_id},
        {"$set": pack_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pack not found")
    return {"success": True}

@api_router.delete("/admin/packs/{pack_id}", dependencies=[Depends(verify_admin)])
async def delete_pack(pack_id: str):
    result = await db.sticker_packs.delete_one({"id": pack_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pack not found")
    return {"success": True}

# Banner Ads Management
@api_router.get("/admin/banners", dependencies=[Depends(verify_admin)])
async def get_admin_banners():
    banners = await db.banner_ads.find({}, {"_id": 0}).sort("position", 1).to_list(100)
    return banners

@api_router.post("/admin/banners", dependencies=[Depends(verify_admin)])
async def create_banner(banner_data: Dict[str, Any]):
    banner = BannerAd(**banner_data)
    await db.banner_ads.insert_one(banner.model_dump())
    return {"success": True, "banner": banner.model_dump()}

@api_router.put("/admin/banners/{banner_id}", dependencies=[Depends(verify_admin)])
async def update_banner(banner_id: str, banner_data: Dict[str, Any]):
    result = await db.banner_ads.update_one(
        {"id": banner_id},
        {"$set": banner_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"success": True}

@api_router.delete("/admin/banners/{banner_id}", dependencies=[Depends(verify_admin)])
async def delete_banner(banner_id: str):
    result = await db.banner_ads.delete_one({"id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"success": True}

# Activity Management Endpoints
@api_router.get("/admin/activity", dependencies=[Depends(verify_admin)])
async def get_admin_activities(
    collection: Optional[str] = None,
    action: Optional[str] = None,
    time_range: Optional[str] = None,
    payment_type: Optional[str] = None,
    limit: int = 100
):
    """Get activities with filters for admin"""
    query = {}
    
    # Filter by collection
    if collection and collection != "all":
        query["pack_name"] = collection
    
    # Filter by action type
    if action and action != "all":
        query["action"] = action
    
    # Filter by payment type
    if payment_type and payment_type != "all":
        if payment_type == "paid":
            # Show only TON or SXTON payments
            query["price_type"] = {"$in": ["TON", "SXTON"]}
        elif payment_type == "free":
            query["is_free"] = True
        elif payment_type == "stars":
            query["price_type"] = "STARS"
    
    # Filter by time range
    if time_range and time_range != "all":
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        
        if time_range == "1h":
            cutoff = now - timedelta(hours=1)
        elif time_range == "24h":
            cutoff = now - timedelta(hours=24)
        elif time_range == "7d":
            cutoff = now - timedelta(days=7)
        else:
            cutoff = None
        
        if cutoff:
            query["created_at"] = {"$gte": cutoff.isoformat()}
    
    activities = await db.activity.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return activities

@api_router.post("/admin/activity", dependencies=[Depends(verify_admin)])
async def create_activity(activity_data: Dict[str, Any]):
    activity = Activity(**activity_data)
    await db.activity.insert_one(activity.model_dump())
    return {"success": True, "activity": activity.model_dump()}

@api_router.put("/admin/activity/{activity_id}", dependencies=[Depends(verify_admin)])
async def update_activity(activity_id: str, activity_data: Dict[str, Any]):
    result = await db.activity.update_one(
        {"id": activity_id},
        {"$set": activity_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"success": True}

@api_router.delete("/admin/activity/{activity_id}", dependencies=[Depends(verify_admin)])
async def delete_activity(activity_id: str):
    result = await db.activity.delete_one({"id": activity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"success": True}

@api_router.get("/admin/settings", dependencies=[Depends(verify_admin)])
async def get_settings():
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0})
    if not settings:
        settings = Settings().model_dump()
        await db.settings.insert_one(settings)
    return settings

@api_router.put("/admin/settings", dependencies=[Depends(verify_admin)])
async def update_settings(settings_data: Dict[str, Any]):
    await db.settings.update_one(
        {"id": "global_settings"},
        {"$set": settings_data},
        upsert=True
    )
    return {"success": True}

@api_router.post("/admin/simulate-activity", dependencies=[Depends(verify_admin)])
async def simulate_activity(count: int = 10):
    """Simulate random activity"""
    packs = await db.sticker_packs.find({}, {"_id": 0}).to_list(100)
    if not packs:
        raise HTTPException(status_code=404, detail="No packs available")
    
    actions = ["bought", "opened", "listed", "sold"]
    for _ in range(count):
        pack = random.choice(packs)
        activity = Activity(
            pack_name=pack["name"],
            action=random.choice(actions),
            price=random.uniform(0.1, 10.0),
            price_type="TON",
            is_simulation=True
        )
        await db.activity.insert_one(activity.model_dump())
    
    return {"success": True, "simulated_count": count}

# ============ ROOT & HEALTH ============

@api_router.get("/")
async def root():
    return {"message": "StickersXTon API", "version": "1.0.0"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()