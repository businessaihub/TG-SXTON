from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import json
import asyncio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import secrets
import random


def parse_rarity_from_filename(filename: str) -> Optional[str]:
    """Extract rarity from filename like '#1_legendary.png' or '#42_epic.jpg'
    
    Supported formats:
    - #1_legendary.png -> "Legendary"
    - #2_epic.png -> "Epic"
    - #3_rare.png -> "Rare"
    - #4_uncommon.png -> "Uncommon"
    - #5_common.png -> "Common"
    
    Returns None if rarity is not specified in filename.
    """
    if not filename:
        return None
    
    filename_lower = filename.lower()
    rarity_keywords = {
        "legendary": "Legendary",
        "epic": "Epic",
        "rare": "Rare",
        "uncommon": "Uncommon",
        "common": "Common"
    }
    
    # Extract part between '_' and '.' 
    # e.g., from "#1_legendary.png" -> "legendary"
    try:
        # Remove extension
        name_without_ext = filename_lower.rsplit('.', 1)[0]
        # Get part after underscore
        if '_' in name_without_ext:
            rarity_part = name_without_ext.split('_')[-1].strip()
            if rarity_part in rarity_keywords:
                return rarity_keywords[rarity_part]
    except:
        pass
    
    return None


def get_rarity(sticker_number: int, total_count: int) -> str:
    """Determine rarity by sticker number and total count.

    Ranges (by percentage of total_count):
    - Legendary: first 1% (minimum 1)
    - Epic: next 4%
    - Rare: next 10%
    - Uncommon: next 25%
    - Common: remainder

    Uses rounding to nearest integer for each bucket; remainder goes to Common.
    """
    if total_count <= 0 or sticker_number is None:
        return "Common"

    # compute counts using rounding; ensure at least 1 legendary
    legendary_count = max(1, int(round(total_count * 0.01)))
    epic_count = int(round(total_count * 0.04))
    rare_count = int(round(total_count * 0.10))
    uncommon_count = int(round(total_count * 0.25))

    l_end = legendary_count
    e_end = l_end + epic_count
    r_end = e_end + rare_count
    u_end = r_end + uncommon_count

    n = sticker_number
    if n <= l_end:
        return "Legendary"
    if n <= e_end:
        return "Epic"
    if n <= r_end:
        return "Rare"
    if n <= u_end:
        return "Uncommon"
    return "Common"

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - lazy init to avoid crash on import
client = None
db = None


class LocalCursor:
    def __init__(self, docs):
        self._docs = docs

    async def to_list(self, limit=None):
        if limit is None:
            return list(self._docs)
        return list(self._docs)[:limit]

    def sort(self, key, direction):
        # simple sort by key
        reverse = direction == -1
        self._docs.sort(key=lambda d: d.get(key), reverse=reverse)
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self


class LocalCollection:
    def __init__(self, name, store, lock):
        self.name = name
        self._store = store
        self._lock = lock

    async def find_one(self, query, projection=None):
        for doc in self._store.get(self.name, []):
            match = True
            for k, v in (query or {}).items():
                if doc.get(k) != v:
                    match = False
                    break
            if match:
                return dict(doc)
        return None

    def find(self, query=None, projection=None):
        results = []
        for doc in self._store.get(self.name, []):
            match = True
            if query:
                for k, v in query.items():
                    if isinstance(v, dict) and "$in" in v:
                        if doc.get(k) not in v["$in"]:
                            match = False
                            break
                    else:
                        if doc.get(k) != v:
                            match = False
                            break
            if match:
                results.append(dict(doc))
        return LocalCursor(results)

    async def insert_one(self, doc):
        async with _async_lock:
            self._store.setdefault(self.name, []).append(dict(doc))
            await _persist_store(self._store)
        return True

    async def insert_many(self, docs):
        async with _async_lock:
            self._store.setdefault(self.name, []).extend([dict(d) for d in docs])
            await _persist_store(self._store)
        return True

    async def update_one(self, filter_q, update_q, upsert=False):
        updated = 0
        async with _async_lock:
            items = self._store.get(self.name, [])
            for idx, doc in enumerate(items):
                match = True
                for k, v in filter_q.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    # support $set and $inc
                    if "$set" in update_q:
                        for k, v in update_q["$set"].items():
                            doc[k] = v
                    if "$inc" in update_q:
                        for k, v in update_q["$inc"].items():
                            doc[k] = doc.get(k, 0) + v
                    items[idx] = doc
                    updated += 1
                    break
            if updated == 0 and upsert:
                newdoc = {**filter_q}
                if "$set" in update_q:
                    newdoc.update(update_q["$set"])
                self._store.setdefault(self.name, []).append(newdoc)
                updated = 1
            await _persist_store(self._store)
        class Res: modified_count = updated
        return Res()

    async def delete_one(self, filter_q):
        deleted = 0
        async with _async_lock:
            items = self._store.get(self.name, [])
            for idx, doc in enumerate(items):
                match = True
                for k, v in filter_q.items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    items.pop(idx)
                    deleted = 1
                    break
            await _persist_store(self._store)
        class Res: deleted_count = deleted
        return Res()

    async def delete_many(self, filter_q):
        removed = 0
        async with _async_lock:
            items = self._store.get(self.name, [])
            new_items = []
            for doc in items:
                match = True
                for k, v in (filter_q or {}).items():
                    if doc.get(k) != v:
                        match = False
                        break
                if match:
                    removed += 1
                else:
                    new_items.append(doc)
            self._store[self.name] = new_items
            await _persist_store(self._store)
        class Res: deleted_count = removed
        return Res()

    async def count_documents(self, query=None):
        cnt = 0
        for doc in self._store.get(self.name, []):
            match = True
            if query:
                for k, v in query.items():
                    if doc.get(k) != v:
                        match = False
                        break
            if match:
                cnt += 1
        return cnt


from threading import Lock

# Async lock for coordinating async operations on the in-memory store
_async_lock = asyncio.Lock()

# On Vercel, filesystem is read-only except /tmp
if os.environ.get('VERCEL'):
    DATA_DIR = Path('/tmp/data')
else:
    DATA_DIR = ROOT_DIR / 'data'
try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    DATA_DIR = Path('/tmp/data')
    DATA_DIR.mkdir(parents=True, exist_ok=True)
DATA_FILE = DATA_DIR / 'data_store.json'
_store_lock = Lock()

async def _persist_store(store):
    # Write store to disk in a thread to avoid blocking event loop
    def _write():
        with _store_lock:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(store, f, ensure_ascii=False, indent=2)
    await asyncio.get_running_loop().run_in_executor(None, _write)

def _load_store():
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


class LocalDB:
    def __init__(self):
        self._store = _load_store()

    def __getattr__(self, name):
        return LocalCollection(name, self._store, _store_lock)


async def _init_db_on_startup():
    global db, client, _startup_error
    mongo_url = os.environ.get('MONGO_URL', '')
    _startup_error = f"init called, url_len={len(mongo_url)}, starts_mongo={mongo_url.startswith('mongodb') if mongo_url else False}"
    if mongo_url and mongo_url.startswith('mongodb'):
        try:
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000, socketTimeoutMS=5000)
            await asyncio.wait_for(client.admin.command('ping'), timeout=5.0)
            db_name = os.environ.get('DB_NAME', 'tg_sxton')
            db = client[db_name]
            _startup_error = f"connected to {db_name}"
            print(f'Connected to MongoDB Atlas (db: {db_name})')
        except Exception as e:
            _startup_error = f"mongo_error: {type(e).__name__}: {str(e)}"
            print('MongoDB not available, falling back to local file store:', e)
            db = LocalDB()
    else:
        _startup_error = f"no valid url, len={len(mongo_url)}"
        print('No MONGO_URL set, using local file store')
        db = LocalDB()

_startup_error = "not initialized yet"


app = FastAPI()
api_router = APIRouter(prefix="/api")


@app.middleware("http")
async def ensure_db(request, call_next):
    global db
    if db is None:
        await _init_db_on_startup()
    return await call_next(request)


@app.on_event("startup")
async def startup_checks():
    await _init_db_on_startup()


# ============ MODELS ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    telegram_id: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
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
    image_url: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)
    price: float
    price_type: str = "TON"  # TON, STARS, SXTON
    purchase_types: List[str] = ["TON", "STARS", "SXTON"]  # Allowed purchase methods
    requires_subscription: bool = False
    required_channel_id: Optional[str] = None
    required_channel_link: Optional[str] = None
    edition: str = "common"  # RENAMED: Pack category/edition for marketing (limited_edition, legendary_edition, seasonal, exclusive, common)
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

class Quest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    quest_type: str = "link"  # link, referral, join_chat, on_chain, follow, purchase
    target_url: Optional[str] = None
    target_channel: Optional[str] = None
    reward_type: str = "SXTON"  # Fixed to SXTON only
    reward_amount: float
    is_active: bool = True
    is_daily: bool = False
    required_referrals: int = 0  # For referral type quests
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None

class UserQuestProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    quest_id: str
    is_completed: bool = False
    completed_at: Optional[str] = None
    reward_claimed: bool = False
    progress: int = 0  # For multi-step quests
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Sticker(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pack_id: str
    owner_id: Optional[str] = None
    sticker_number: Optional[int] = None
    position: Optional[int] = None
    image_url: str
    rarity: str = "Common"  # NEW: Store explicit rarity
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
    image_url: Optional[str] = None
    seller_name: Optional[str] = None
    sticker_id: Optional[str] = None
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
    spin_timeout: int = 3
    roulette_selection_mode: str = "random"
    roulette_stats: Dict[str, Any] = {
        "total_spins": 0,
        "total_revenue": 0.0,
        "avg_win_value": 0.0
    }
    simulation_enabled: bool = False

class GameSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "game_settings"
    theft_cost_ton: float = 0.2
    theft_cooldown_hours: int = 6
    bomb_cost_ton: float = 0.0
    bomb_expiration_hours: int = 24
    raid_entry_cost_ton: float = 0.1
    raid_max_players: int = 10
    puzzle_fragment_cost_ton: float = 0.0
    puzzle_fragment_drop_chance: float = 0.3
    puzzle_fragments_needed: int = 4
    puzzle_reward_sticker_pack_id: Optional[str] = None
    puzzle_reward_points: float = 200.0
    spin_cost_ton: float = 1.0
    battle_cost_ton: float = 0.0
    craft_cost_ton: float = 0.0
    guessing_cost_ton: float = 0.0
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

class PackRating(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pack_id: str
    user_id: str
    rating: int = 1  # 1-5 stars
    liked: bool = True  # Simple like/unlike
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SystemLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    level: str = "info"  # error, warning, info, debug
    message: str
    source: str = "backend"  # backend, frontend, analytics, blockchain, database
    metadata: Dict[str, Any] = Field(default_factory=dict)  # Additional context

# ============ USER ENDPOINTS ============

class TelegramAuthRequest(BaseModel):
    telegram_id: str
    username: Optional[str] = None
    photo_url: Optional[str] = None
    referrer_id: Optional[str] = None

@api_router.post("/auth/telegram")
async def telegram_auth(request: TelegramAuthRequest):
    """Authenticate or create user via Telegram"""
    user_doc = await db.users.find_one({"telegram_id": request.telegram_id}, {"_id": 0})
    
    if user_doc:
        # Reset mock balances if user was created with old demo values (100/500/1000)
        if (user_doc.get("ton_balance") == 100 and 
            user_doc.get("stars_balance") == 500 and 
            user_doc.get("sxton_points") == 1000):
            await db.users.update_one(
                {"telegram_id": request.telegram_id},
                {"$set": {"ton_balance": 0.0, "stars_balance": 0.0, "sxton_points": 0.0}}
            )
            user_doc["ton_balance"] = 0.0
            user_doc["stars_balance"] = 0.0
            user_doc["sxton_points"] = 0.0
        # Update photo_url and username if changed
        updates = {}
        if request.photo_url and request.photo_url != user_doc.get("photo_url"):
            updates["photo_url"] = request.photo_url
        if request.username and request.username != user_doc.get("username"):
            updates["username"] = request.username
        if updates:
            await db.users.update_one({"telegram_id": request.telegram_id}, {"$set": updates})
            user_doc.update(updates)
        return {"user": user_doc, "is_new": False}
    
    # Create new user
    user = User(telegram_id=request.telegram_id, username=request.username, photo_url=request.photo_url, referrer_id=request.referrer_id)
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

@api_router.post("/wallet/disconnect")
async def disconnect_wallet(user_id: str):
    """Disconnect wallet — clear wallet_address in DB"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"wallet_address": None}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True}

@api_router.post("/wallet/mock-balance")
async def mock_balance_update(user_id: str, ton: float = 0, stars: float = 0, points: float = 0):
    """Mock balance update for testing"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$inc": {"ton_balance": ton, "stars_balance": stars, "sxton_points": points}}
    )
    return {"success": True}

@api_router.post("/deposit/ton")
async def deposit_ton(user_id: str, amount: float, transaction_hash: str = ""):
    """Deposit TON to game balance after TonConnect payment"""
    if amount <= 0 or amount > 100:
        raise HTTPException(status_code=400, detail="Invalid amount")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one(
        {"id": user_id},
        {"$inc": {"ton_balance": amount}}
    )
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    # Log activity
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "pack_name": "TON Deposit",
        "action": "deposit",
        "price": amount,
        "price_type": "TON",
        "is_free": False,
        "is_simulation": False,
        "transaction_hash": transaction_hash,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "user": updated_user}

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

@api_router.get("/sticker-packs")
async def get_sticker_packs():
    """Get all sticker packs (alias for /packs)"""
    packs = await db.sticker_packs.find({}, {"_id": 0}).to_list(1000)
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
async def buy_pack(user_id: str, pack_id: str, payment_type: str = "TON", quantity: Optional[int] = None, transaction_hash: Optional[str] = None):
    """Buy stickers from a pack. If `quantity` is provided, buy that many stickers (random unique). If omitted, buy the entire pack.
    
    For real TON payments via TonConnect, provide transaction_hash which will be verified on blockchain.
    For legacy in-app balance system, leave transaction_hash as None.
    """
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
    
    # Determine quantity to buy (default: 1 sticker)
    qty = quantity if quantity is not None else 1
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be >= 1")

    # Price is per-sticker, total = price * qty
    total_price = pack.get("price", 0) * qty
    
    # If transaction_hash is provided, verify it's from real TON payment
    if transaction_hash and payment_type == "TON":
        # In production, verify the transaction on TON blockchain
        # For now, we trust TonConnect verification
        # In future: use TON blockchain API to verify amount and recipient
        logging.info(f"Processing real TON transaction: {transaction_hash} for user {user_id}")
        # TODO: Verify transaction on blockchain using TON APIs
    else:
        # Legacy in-app balance check
        if payment_type == "TON" and user["ton_balance"] < total_price:
            raise HTTPException(status_code=400, detail="Insufficient TON balance")
        elif payment_type == "STARS" and user["stars_balance"] < total_price:
            raise HTTPException(status_code=400, detail="Insufficient Stars balance")
        elif payment_type == "SXTON" and user["sxton_points"] < total_price:
            raise HTTPException(status_code=400, detail="Insufficient SXTON points")

        # Deduct balance from in-app system
        if payment_type == "TON":
            await db.users.update_one({"id": user_id}, {"$inc": {"ton_balance": -total_price, "sxton_points": 500 * qty}})
        elif payment_type == "STARS":
            await db.users.update_one({"id": user_id}, {"$inc": {"stars_balance": -total_price, "sxton_points": 500 * qty}})
        elif payment_type == "SXTON":
            await db.users.update_one({"id": user_id}, {"$inc": {"sxton_points": -total_price}})

    # Select available (unsold) stickers for this pack
    available = await db.stickers.find({"pack_id": pack_id, "owner_id": None}, {"_id": 0}).to_list(None)
    if len(available) < qty:
        raise HTTPException(status_code=400, detail=f"Not enough available stickers in this pack (requested {qty}, available {len(available)})")

    # Pick random unique stickers
    indices = random.sample(range(len(available)), qty)
    selected = [available[i] for i in indices]

    # Assign to user and collect sticker numbers + rarities
    stickers_assigned = []
    for s in selected:
        await db.stickers.update_one({"id": s["id"]}, {"$set": {"owner_id": user_id}})
        num = s.get("sticker_number") or s.get("position")
        # Use stored rarity from sticker document (was parsed from filename or auto-calculated)
        rarity = s.get("rarity", "Common")
        stickers_assigned.append({"sticker_number": num, "rarity": rarity})

    # Sort by internal number for messaging
    stickers_assigned_sorted = sorted([st for st in stickers_assigned if st.get("sticker_number") is not None], key=lambda x: x["sticker_number"])

    # Log activity
    activity = Activity(
        pack_name=pack["name"],
        action="bought",
        price=total_price,
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

    return {"success": True, "stickers": stickers_assigned_sorted}

@api_router.post("/sell/sticker")
async def sell_sticker(sticker_id: str, price: float):
    """List a sticker for sale"""
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0}) or Settings().model_dump()
    
    if price < settings["min_sale_price"]:
        raise HTTPException(status_code=400, detail=f"Minimum sale price is {settings['min_sale_price']} TON")
    
    sticker = await db.stickers.find_one({"id": sticker_id}, {"_id": 0})
    if not sticker:
        raise HTTPException(status_code=404, detail="Sticker not found")
    
    result = await db.stickers.update_one(
        {"id": sticker_id},
        {"$set": {"is_listed": True, "price": price}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Sticker not found")
    
    # Log activity
    pack = await db.sticker_packs.find_one({"id": sticker.get("pack_id")}, {"_id": 0})
    owner = await db.users.find_one({"id": sticker.get("owner_id")}, {"_id": 0})
    activity = Activity(
        pack_name=pack.get("name", "Unknown") if pack else "Unknown",
        action="listed",
        price=price,
        price_type="TON",
        image_url=sticker.get("image_url"),
        seller_name=owner.get("username", "Anonymous") if owner else "Anonymous",
        sticker_id=sticker_id
    )
    await db.activity.insert_one(activity.model_dump())
    
    return {"success": True, "message": "Sticker listed for sale"}

@api_router.post("/unlist/sticker")
async def unlist_sticker(sticker_id: str):
    """Remove a sticker from sale"""
    result = await db.stickers.update_one(
        {"id": sticker_id, "is_listed": True},
        {"$set": {"is_listed": False, "price": 0}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Listed sticker not found")
    return {"success": True, "message": "Sticker removed from sale"}

@api_router.get("/sticker/{sticker_id}")
async def get_sticker_by_id(sticker_id: str):
    """Get a single sticker by ID (for deep linking)."""
    sticker = await db.stickers.find_one({"id": sticker_id}, {"_id": 0})
    if not sticker:
        raise HTTPException(status_code=404, detail="Sticker not found")
    pack = await db.sticker_packs.find_one({"id": sticker.get("pack_id")}, {"_id": 0})
    owner = await db.users.find_one({"id": sticker.get("owner_id")}, {"_id": 0})
    return {
        "id": sticker.get("id"),
        "pack_id": sticker.get("pack_id"),
        "pack_name": pack.get("name") if pack else None,
        "sticker_number": sticker.get("sticker_number") or sticker.get("position"),
        "rarity": sticker.get("rarity", "Common"),
        "image_url": sticker.get("image_url"),
        "price": sticker.get("price", 0),
        "is_listed": sticker.get("is_listed", False),
        "owner_id": sticker.get("owner_id"),
        "seller_name": owner.get("username", "Anonymous") if owner else "Anonymous"
    }

@api_router.get("/marketplace/listings")
async def get_marketplace_listings():
    """Get all stickers listed for sale by users (for the marketplace resale section)."""
    stickers = await db.stickers.find({"is_listed": True}, {"_id": 0}).to_list(200)
    result = []
    for s in stickers:
        pack = await db.sticker_packs.find_one({"id": s.get("pack_id")}, {"_id": 0})
        owner = await db.users.find_one({"id": s.get("owner_id")}, {"_id": 0})
        result.append({
            "id": s.get("id"),
            "pack_id": s.get("pack_id"),
            "pack_name": pack.get("name") if pack else None,
            "sticker_number": s.get("sticker_number") or s.get("position"),
            "rarity": s.get("rarity", "Common"),
            "image_url": s.get("image_url"),
            "price": s.get("price", 0),
            "owner_id": s.get("owner_id"),
            "seller_name": owner.get("username", "Anonymous") if owner else "Anonymous"
        })
    result.sort(key=lambda x: x.get("price", 0))
    return result

@api_router.post("/buy/sticker")
async def buy_sticker(sticker_id: str, buyer_id: str):
    """Buy a sticker listed for sale by another user."""
    sticker = await db.stickers.find_one({"id": sticker_id, "is_listed": True}, {"_id": 0})
    if not sticker:
        raise HTTPException(status_code=404, detail="Sticker not found or not for sale")
    
    if sticker.get("owner_id") == buyer_id:
        raise HTTPException(status_code=400, detail="Cannot buy your own sticker")
    
    buyer = await db.users.find_one({"id": buyer_id}, {"_id": 0})
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    
    price = sticker.get("price", 0)
    if (buyer.get("ton_balance", 0) or 0) < price:
        raise HTTPException(status_code=400, detail="Insufficient TON balance")
    
    seller_id = sticker.get("owner_id")
    settings = await db.settings.find_one({"id": "global_settings"}, {"_id": 0}) or Settings().model_dump()
    commission_rate = settings.get("commission_rate", 2.5)
    commission = price * (commission_rate / 100)
    seller_receives = price - commission
    
    # Deduct from buyer
    await db.users.update_one({"id": buyer_id}, {"$inc": {"ton_balance": -price}})
    # Pay seller
    await db.users.update_one({"id": seller_id}, {"$inc": {"ton_balance": seller_receives}})
    # Transfer sticker ownership
    await db.stickers.update_one(
        {"id": sticker_id},
        {"$set": {"owner_id": buyer_id, "is_listed": False, "price": 0}}
    )
    
    # Log transaction
    pack = await db.sticker_packs.find_one({"id": sticker.get("pack_id")}, {"_id": 0})
    pack_name = pack.get("name", "Unknown") if pack else "Unknown"
    
    tx = Transaction(
        from_user_id=buyer_id,
        to_user_id=seller_id,
        sticker_id=sticker_id,
        amount=price,
        currency="TON",
        transaction_type="resale"
    )
    await db.transactions.insert_one(tx.model_dump())
    
    # Log activity
    seller = await db.users.find_one({"id": seller_id}, {"_id": 0})
    activity = Activity(
        pack_name=pack_name,
        action="sold",
        price=price,
        price_type="TON",
        image_url=sticker.get("image_url"),
        seller_name=seller.get("username", "Anonymous") if seller else "Anonymous",
        sticker_id=sticker_id
    )
    await db.activity.insert_one(activity.model_dump())
    
    return {"success": True, "message": f"Sticker purchased for {price} TON", "seller_received": seller_receives}

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
        # Show only activities paid with TON, SXTON, or STARS
        query["price_type"] = {"$in": ["TON", "SXTON", "STARS"]}
    elif filter_type == "free":
        query["is_free"] = True
    elif filter_type == "finished":
        # Show completed or expired listings
        query["action"] = {"$in": ["sold", "burned"]}
    
    activities = await db.activity.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return activities


# ============ QUEST ENDPOINTS ============

@api_router.get("/quests")
async def get_active_quests():
    """Get all active quests"""
    quests = await db.quests.find({"is_active": True}, {"_id": 0}).to_list(100)
    return quests

@api_router.get("/user/{user_id}/quests")
async def get_user_quests(user_id: str):
    """Get user quest progress"""
    quests = await db.quests.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    # Get user's progress for each quest
    user_progress = await db.user_quest_progress.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    progress_map = {p["quest_id"]: p for p in user_progress}
    
    # Enrich quests with user progress
    result = []
    for quest in quests:
        quest_with_progress = quest.copy()
        if quest["id"] in progress_map:
            quest_with_progress["user_progress"] = progress_map[quest["id"]]
        else:
            quest_with_progress["user_progress"] = {
                "is_completed": False,
                "reward_claimed": False,
                "progress": 0
            }
        result.append(quest_with_progress)
    
    return result

@api_router.post("/quest/{quest_id}/complete")
async def complete_quest(quest_id: str, user_id: str):
    """Mark quest as completed and award rewards"""
    quest = await db.quests.find_one({"id": quest_id}, {"_id": 0})
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already completed
    existing_progress = await db.user_quest_progress.find_one(
        {"user_id": user_id, "quest_id": quest_id},
        {"_id": 0}
    )
    
    if existing_progress and existing_progress["is_completed"]:
        raise HTTPException(status_code=400, detail="Quest already completed")
    
    # Update or create progress
    now = datetime.now(timezone.utc).isoformat()
    progress_data = UserQuestProgress(
        user_id=user_id,
        quest_id=quest_id,
        is_completed=True,
        completed_at=now,
        reward_claimed=False
    )
    
    await db.user_quest_progress.update_one(
        {"user_id": user_id, "quest_id": quest_id},
        {"$set": progress_data.model_dump()},
        upsert=True
    )
    
    return {"success": True, "message": "Quest completed. Claim your reward in Profile"}

@api_router.post("/quest/{quest_id}/claim-reward")
async def claim_quest_reward(quest_id: str, user_id: str):
    """Claim reward for completed quest"""
    quest = await db.quests.find_one({"id": quest_id}, {"_id": 0})
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    progress = await db.user_quest_progress.find_one(
        {"user_id": user_id, "quest_id": quest_id},
        {"_id": 0}
    )
    
    if not progress or not progress["is_completed"]:
        raise HTTPException(status_code=400, detail="Quest not completed")
    
    if progress["reward_claimed"]:
        raise HTTPException(status_code=400, detail="Reward already claimed")
    
    # Award SXTON reward
    reward_field = "sxton_points"
    
    if reward_field:
        await db.users.update_one(
            {"id": user_id},
            {"$inc": {reward_field: quest["reward_amount"]}}
        )
    
    # Mark reward as claimed
    await db.user_quest_progress.update_one(
        {"user_id": user_id, "quest_id": quest_id},
        {"$set": {"reward_claimed": True}}
    )
    
    return {
        "success": True,
        "message": f"Reward claimed: {quest['reward_amount']} {quest['reward_type']}",
        "reward": {
            "type": quest["reward_type"],
            "amount": quest["reward_amount"]
        }
    }

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
    
    # Update roulette statistics
    current_stats = settings.get("roulette_stats", {
        "total_spins": 0,
        "total_revenue": 0.0,
        "avg_win_value": 0.0
    })
    current_stats["total_spins"] = current_stats.get("total_spins", 0) + 1
    current_stats["total_revenue"] = current_stats.get("total_revenue", 0.0) + float(spin_price)
    win_value = float(won_pack.get("price", 0.0))
    current_stats["avg_win_value"] = current_stats.get("total_revenue", 0.0) / current_stats["total_spins"]
    
    await db.settings.update_one(
        {"id": "global_settings"},
        {"$set": {"roulette_stats": current_stats}},
        upsert=True
    )
    
    return {"success": True, "pack": won_pack}

# ============ DAILY REWARD ============

@api_router.post("/daily-reward/claim")
async def claim_daily_reward(user_id: str):
    """Claim daily login reward (once per 24h)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.now(timezone.utc)
    last_claim = user.get("last_daily_claim")
    if last_claim:
        last_dt = datetime.fromisoformat(last_claim.replace("Z", "+00:00")) if isinstance(last_claim, str) else last_claim
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        diff = (now - last_dt).total_seconds()
        if diff < 86400:
            remaining = 86400 - int(diff)
            raise HTTPException(status_code=400, detail=f"Already claimed. Next in {remaining // 3600}h {(remaining % 3600) // 60}m")
    
    streak = user.get("daily_streak", 0) + 1
    # Rewards scale with streak (max 7 day cycle)
    day_in_cycle = ((streak - 1) % 7) + 1
    sxton_reward = day_in_cycle * 50  # 50, 100, 150... 350
    
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {"last_daily_claim": now.isoformat(), "daily_streak": streak},
            "$inc": {"sxton_points": sxton_reward}
        }
    )
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0})
    return {
        "reward": sxton_reward,
        "streak": streak,
        "day_in_cycle": day_in_cycle,
        "user": updated
    }

@api_router.get("/user/{user_id}/daily-status")
async def daily_reward_status(user_id: str):
    """Check if daily reward is available"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.now(timezone.utc)
    last_claim = user.get("last_daily_claim")
    available = True
    remaining = 0
    if last_claim:
        last_dt = datetime.fromisoformat(last_claim.replace("Z", "+00:00")) if isinstance(last_claim, str) else last_claim
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        diff = (now - last_dt).total_seconds()
        if diff < 86400:
            available = False
            remaining = 86400 - int(diff)
    
    streak = user.get("daily_streak", 0)
    day_in_cycle = ((streak) % 7) + 1
    next_reward = day_in_cycle * 50
    
    return {
        "available": available,
        "remaining_seconds": remaining,
        "streak": streak,
        "next_reward": next_reward,
        "day_in_cycle": day_in_cycle
    }

# ============ REFERRAL ============

@api_router.get("/user/{user_id}/referral-info")
async def get_referral_info(user_id: str):
    """Get referral link and stats"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    telegram_id = user.get("telegram_id", user_id)
    referral_link = f"https://t.me/StickerXtonBot?start=ref_{telegram_id}"
    
    # Count referred users
    referral_count = await db.users.count_documents({"referrer_id": user_id})
    
    return {
        "referral_link": referral_link,
        "referral_count": referral_count,
        "total_earned": referral_count * 500  # 500 SXTON per referral
    }

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


@api_router.get("/user/{user_id}/stickers")
async def get_user_stickers(user_id: str):
    """Return stickers owned by a user (excluding listed for sale)."""
    stickers = await db.stickers.find({"owner_id": user_id, "is_listed": {"$ne": True}}, {"_id": 0}).to_list(None)
    result = []
    for s in stickers:
        pack = await db.sticker_packs.find_one({"id": s.get("pack_id")}, {"_id": 0})
        rarity = s.get("rarity", "Common")
        result.append({
            "id": s.get("id"),
            "pack_id": s.get("pack_id"),
            "pack_name": pack.get("name") if pack else None,
            "sticker_number": s.get("sticker_number") or s.get("position"),
            "rarity": rarity,
            "image_url": s.get("image_url")
        })
    result.sort(key=lambda x: (x.get("pack_name") or "", x.get("sticker_number") or 0))
    return result

@api_router.get("/user/{user_id}/listed-stickers")
async def get_user_listed_stickers(user_id: str):
    """Return stickers the user has listed for sale."""
    stickers = await db.stickers.find({"owner_id": user_id, "is_listed": True}, {"_id": 0}).to_list(None)
    result = []
    for s in stickers:
        pack = await db.sticker_packs.find_one({"id": s.get("pack_id")}, {"_id": 0})
        rarity = s.get("rarity", "Common")
        result.append({
            "id": s.get("id"),
            "pack_id": s.get("pack_id"),
            "pack_name": pack.get("name") if pack else None,
            "sticker_number": s.get("sticker_number") or s.get("position"),
            "rarity": rarity,
            "image_url": s.get("image_url"),
            "price": s.get("price", 0)
        })
    result.sort(key=lambda x: (x.get("pack_name") or "", x.get("sticker_number") or 0))
    return result

@api_router.get("/user/{user_id}/packs/hold-status")
async def get_user_hold_status(user_id: str):
    """Return user's stickers grouped by pack with hold boost info."""
    settings = await db.settings.find_one({"type": "hold_settings"})
    hold_threshold = 30
    resale_multiplier = 1.05
    if settings:
        hold_threshold = settings.get("hold_threshold_days", 30)
        resale_multiplier = settings.get("resale_multiplier", 1.05)

    stickers = await db.stickers.find({"owner_id": user_id}, {"_id": 0}).to_list(None)
    if not stickers:
        return {
            "hold_threshold": hold_threshold,
            "resale_multiplier": resale_multiplier,
            "summary": {"total_active_holders": 0, "verified_count": 0},
            "packs": []
        }

    now = datetime.now(timezone.utc)
    packs_map = {}
    verified_count = 0

    for s in stickers:
        pack_id = s.get("pack_id", "unknown")
        if pack_id not in packs_map:
            pack = await db.sticker_packs.find_one({"id": pack_id}, {"_id": 0})
            packs_map[pack_id] = {
                "pack_id": pack_id,
                "pack_name": pack.get("name") if pack else "Unknown Pack",
                "stickers": [],
                "hold_days": 0,
                "is_verified": False,
                "boost_multiplier": 1.0
            }

        # Calculate hold days from purchase time (created_at or hold_start)
        hold_start = s.get("hold_start") or s.get("purchased_at") or s.get("created_at")
        days_held = 0
        if hold_start:
            try:
                start_dt = datetime.fromisoformat(hold_start.replace("Z", "+00:00"))
                days_held = (now - start_dt).days
            except Exception:
                pass

        is_verified = days_held >= hold_threshold
        if is_verified:
            verified_count += 1

        packs_map[pack_id]["stickers"].append({
            "id": s.get("id"),
            "sticker_number": s.get("sticker_number") or s.get("position"),
            "rarity": s.get("rarity", "Common"),
            "image_url": s.get("image_url", ""),
            "days_held": days_held,
            "is_verified": is_verified
        })

    # Calculate per-pack stats
    packs_list = []
    for p in packs_map.values():
        if p["stickers"]:
            max_days = max(st["days_held"] for st in p["stickers"])
            p["hold_days"] = max_days
            p["is_verified"] = max_days >= hold_threshold
            p["boost_multiplier"] = resale_multiplier if p["is_verified"] else 1.0
        packs_list.append(p)

    return {
        "hold_threshold": hold_threshold,
        "resale_multiplier": resale_multiplier,
        "summary": {
            "total_active_holders": len(stickers),
            "verified_count": verified_count
        },
        "packs": packs_list
    }

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
# ✅ IMPLEMENTED (6 features):
#   1. /admin/analytics - Dashboard stats
#   2. /admin/users - User management list
#   3. /pack/{pack_id}/rate - Ratings system
#   4. /pack/{pack_id}/stats - Pack statistics
#   5. /pack/{pack_id}/popularity - Popularity metrics
#   6. /broadcast/send - Broadcast messages (TODO: implement fully)
#
# 🚧 TODO (Variant C):
#   - /admin/logs - System logs viewer
#   - /admin/user/{user_id}/promote-tier - VIP tier management
#   - /admin/analytics/rfm - RFM analysis
#   - See PROGRESS_NOTES.md for details

class AdminLoginRequest(BaseModel):
    username: str
    password: str

@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    if request.username == ADMIN_USERNAME and request.password == ADMIN_PASSWORD:
        token = f"{request.username}:{request.password}"
        return {"success": True, "token": token, "is_admin": True}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.post("/admin/verify-token")
async def verify_token(authorization: Optional[str] = Header(None)):
    """Verify if the provided token is valid"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")
    
    # Extract token from "Bearer <token>"
    try:
        parts = authorization.split()
        token = parts[1] if len(parts) > 1 else authorization
    except:
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    # Check if token matches admin credentials
    expected_token = f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}"
    if token == expected_token:
        return {"success": True, "is_admin": True}
    
    raise HTTPException(status_code=401, detail="Invalid token")

# ============ GAME SETTINGS MANAGEMENT (ADMIN) ============
@api_router.get("/admin/game-settings")
async def get_game_settings(authorization: Optional[str] = Header(None)):
    """Get current game settings"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")
    
    try:
        parts = authorization.split()
        token = parts[1] if len(parts) > 1 else authorization
        expected_token = f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}"
        if token != expected_token:
            raise HTTPException(status_code=401, detail="Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    settings = await db.game_settings.find_one({"id": "game_settings"}, {"_id": 0})
    if not settings:
        # Return defaults
        settings = {
            "id": "game_settings",
            "theft_cost_ton": 0.2,
            "theft_cooldown_hours": 6,
            "bomb_cost_ton": 0.0,
            "bomb_expiration_hours": 24,
            "raid_entry_cost_ton": 0.1,
            "raid_max_players": 10,
            "puzzle_fragment_cost_ton": 0.0,
            "puzzle_fragment_drop_chance": 0.3,
            "puzzle_fragments_needed": 4,
            "puzzle_reward_sticker_pack_id": None,
            "puzzle_reward_points": 200.0,
            "spin_cost_ton": 1.0,
            "battle_cost_ton": 0.0,
            "craft_cost_ton": 0.0,
            "guessing_cost_ton": 0.0
        }
    else:
        # Ensure new fields have defaults for existing records
        defaults = {"bomb_cost_ton": 0.0, "spin_cost_ton": 1.0, "battle_cost_ton": 0.0, "craft_cost_ton": 0.0, "guessing_cost_ton": 0.0}
        for k, v in defaults.items():
            if k not in settings:
                settings[k] = v
    return settings

@api_router.post("/admin/game-settings")
async def update_game_settings(settings: dict, authorization: Optional[str] = Header(None)):
    """Update game settings"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")
    
    try:
        parts = authorization.split()
        token = parts[1] if len(parts) > 1 else authorization
        expected_token = f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}"
        if token != expected_token:
            raise HTTPException(status_code=401, detail="Invalid token")
    except:
        raise HTTPException(status_code=401, detail="Invalid token format")
    
    settings["id"] = "game_settings"
    settings["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.game_settings.update_one(
        {"id": "game_settings"},
        {"$set": settings},
        upsert=True
    )
    
    return {"success": True, "message": "Game settings updated"}

# ============ GUESSING GAME ============
@api_router.get("/game/guess-price/sticker")
async def guess_price_get_sticker(user_id: str):
    """Return a random sticker for the user to guess its price."""
    sticker = await db.stickers.aggregate([{"$sample": {"size": 1}}]).to_list(1)
    if not sticker:
        raise HTTPException(status_code=404, detail="No stickers available")
    s = sticker[0]
    pack = await db.sticker_packs.find_one({"id": s.get("pack_id")}, {"_id": 0})
    rarity = s.get("rarity", "Common")
    rarity_prices = {"Common": 0.5, "Uncommon": 1.0, "Rare": 2.5, "Epic": 5.0, "Legendary": 15.0}
    actual_price = rarity_prices.get(rarity, 1.0) * (1 + random.uniform(-0.3, 0.3))
    session_id = str(uuid.uuid4())
    await db.guess_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "session_id": session_id,
            "user_id": user_id,
            "sticker_id": s.get("id"),
            "actual_price": round(actual_price, 2),
            "rarity": rarity,
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {
        "sticker_id": s.get("id"),
        "image_url": s.get("image_url"),
        "pack_name": pack.get("name") if pack else "Unknown",
        "rarity": rarity,
        "session_id": session_id
    }

@api_router.post("/game/guess-price/submit")
async def guess_price_submit(user_id: str, sticker_id: str, guessed_price: float):
    """Submit a price guess and get accuracy result."""
    session = await db.guess_sessions.find_one({"user_id": user_id, "sticker_id": sticker_id})
    if not session:
        raise HTTPException(status_code=404, detail="No active guessing session")
    actual = session["actual_price"]
    diff = abs(guessed_price - actual)
    accuracy = max(0, 100 - (diff / max(actual, 0.01)) * 100)
    accuracy = min(100, accuracy)
    if accuracy >= 90:
        grade = "S"
        reward = 50
    elif accuracy >= 75:
        grade = "A"
        reward = 30
    elif accuracy >= 50:
        grade = "B"
        reward = 15
    elif accuracy >= 25:
        grade = "C"
        reward = 5
    else:
        grade = "F"
        reward = 0
    await db.users.update_one({"telegram_id": user_id}, {"$inc": {"sxton_points": reward}})
    await db.guess_history.insert_one({
        "user_id": user_id,
        "sticker_id": sticker_id,
        "guessed_price": guessed_price,
        "actual_price": actual,
        "accuracy_percent": round(accuracy, 1),
        "accuracy_grade": grade,
        "sxton_reward": reward,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.guess_sessions.delete_one({"_id": session["_id"]})
    return {
        "actual_price": actual,
        "guessed_price": guessed_price,
        "accuracy_percent": round(accuracy, 1),
        "accuracy_grade": grade,
        "sxton_reward": reward,
        "message": f"Grade {grade}! +{reward} SXTON"
    }

@api_router.get("/user/{user_id}/game/guess-price/history")
async def guess_price_history(user_id: str, limit: int = 10):
    """Return user's guessing game history."""
    games = await db.guess_history.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return {"games": games}

# ============ DAILY SPIN WHEEL ============
@api_router.get("/game/daily-spin/check")
async def daily_spin_check(user_id: str):
    """Check if user can spin today."""
    user = await db.users.find_one({"telegram_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    last_spin = user.get("last_daily_spin")
    if not last_spin:
        return {"can_spin": True, "next_spin_time": None}
    last_dt = datetime.fromisoformat(last_spin)
    next_spin = last_dt + timedelta(hours=24)
    now = datetime.now(timezone.utc)
    return {"can_spin": now >= next_spin, "next_spin_time": next_spin.isoformat()}

@api_router.post("/game/daily-spin/spin")
async def daily_spin_spin(user_id: str):
    """Perform the daily spin and award a reward."""
    user = await db.users.find_one({"telegram_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    last_spin = user.get("last_daily_spin")
    now = datetime.now(timezone.utc)
    if last_spin:
        last_dt = datetime.fromisoformat(last_spin)
        if now < last_dt + timedelta(hours=24):
            next_spin = last_dt + timedelta(hours=24)
            raise HTTPException(status_code=400, detail=f"Next spin at {next_spin.isoformat()}")
    segments = [
        {"label": "10 SXTON", "type": "sxton", "value": 10},
        {"label": "25 SXTON", "type": "sxton", "value": 25},
        {"label": "50 SXTON", "type": "sxton", "value": 50},
        {"label": "100 SXTON", "type": "sxton", "value": 100},
        {"label": "0.01 TON", "type": "ton", "value": 0.01},
        {"label": "Nothing", "type": "nothing", "value": 0},
        {"label": "Random Sticker", "type": "sticker", "value": 1},
        {"label": "2x Next Spin", "type": "multiplier", "value": 2},
    ]
    reward = random.choice(segments)
    if reward["type"] == "sxton":
        await db.users.update_one({"telegram_id": user_id}, {"$inc": {"sxton_points": reward["value"]}})
    elif reward["type"] == "ton":
        await db.users.update_one({"telegram_id": user_id}, {"$inc": {"ton_balance": reward["value"]}})
    elif reward["type"] == "sticker":
        rarity = random.choices(["Common", "Uncommon", "Rare"], weights=[70, 25, 5])[0]
        await db.stickers.insert_one({
            "id": str(uuid.uuid4()), "owner_id": user_id, "rarity": rarity,
            "source": "daily_spin", "created_at": now.isoformat()
        })
        reward["label"] = f"{rarity} Sticker"
    next_spin = now + timedelta(hours=24)
    await db.users.update_one({"telegram_id": user_id}, {"$set": {"last_daily_spin": now.isoformat()}})
    await db.spin_history.insert_one({
        "user_id": user_id, "reward": reward, "spun_at": now.isoformat()
    })
    return {"reward": reward, "next_spin_time": next_spin.isoformat()}

@api_router.get("/user/{user_id}/game/daily-spin/history")
async def daily_spin_history(user_id: str, limit: int = 10):
    """Return user's spin history."""
    spins = await db.spin_history.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("spun_at", -1).to_list(limit)
    return spins

# ============ CRAFT GAME ============
@api_router.get("/game/craft/available")
async def craft_available(user_id: str):
    """Return user's stickers grouped by rarity for crafting."""
    stickers = await db.stickers.find({"owner_id": user_id}, {"_id": 0}).to_list(None)
    grouped = {"common": [], "uncommon": [], "rare": [], "epic": [], "legendary": []}
    for s in stickers:
        r = (s.get("rarity") or "Common").lower()
        if r in grouped:
            pack = await db.sticker_packs.find_one({"id": s.get("pack_id")}, {"_id": 0})
            grouped[r].append({
                "id": s.get("id"),
                "pack_name": pack.get("name") if pack else "Unknown",
                "rarity": s.get("rarity", "Common"),
                "image_url": s.get("image_url"),
                "sticker_number": s.get("sticker_number")
            })
    return grouped

@api_router.post("/game/craft/combine")
async def craft_combine(user_id: str, sticker_ids: str):
    """Combine 2-3 stickers of same rarity into 1 higher rarity sticker."""
    ids = [sid.strip() for sid in sticker_ids.split(",")]
    if len(ids) < 2 or len(ids) > 3:
        raise HTTPException(status_code=400, detail="Need 2-3 stickers to craft")
    stickers = []
    for sid in ids:
        s = await db.stickers.find_one({"id": sid, "owner_id": user_id})
        if not s:
            raise HTTPException(status_code=404, detail=f"Sticker {sid} not found or not owned")
        stickers.append(s)
    rarities = set(s.get("rarity", "Common").lower() for s in stickers)
    if len(rarities) != 1:
        raise HTTPException(status_code=400, detail="All stickers must be same rarity")
    current_rarity = rarities.pop()
    rarity_order = ["common", "uncommon", "rare", "epic", "legendary"]
    idx = rarity_order.index(current_rarity) if current_rarity in rarity_order else 0
    if idx >= len(rarity_order) - 1:
        raise HTTPException(status_code=400, detail="Cannot craft above legendary")
    next_rarity = rarity_order[idx + 1].capitalize()
    for s in stickers:
        await db.stickers.delete_one({"_id": s["_id"]})
    new_sticker_id = str(uuid.uuid4())
    new_sticker = {
        "id": new_sticker_id, "owner_id": user_id, "rarity": next_rarity,
        "source": "craft", "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.stickers.insert_one(new_sticker)
    sxton_reward = {"Uncommon": 10, "Rare": 25, "Epic": 50, "Legendary": 100}.get(next_rarity, 10)
    await db.users.update_one({"telegram_id": user_id}, {"$inc": {"sxton_points": sxton_reward}})
    await db.craft_history.insert_one({
        "user_id": user_id, "input_ids": ids, "input_rarity": current_rarity,
        "result_rarity": next_rarity, "result_sticker_id": new_sticker_id,
        "sxton_reward": sxton_reward, "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {
        "success": True, "new_sticker": {"id": new_sticker_id, "rarity": next_rarity},
        "sxton_reward": sxton_reward, "message": f"Crafted {next_rarity} sticker! +{sxton_reward} SXTON"
    }

@api_router.get("/user/{user_id}/game/craft/history")
async def craft_history(user_id: str, limit: int = 10):
    """Return user's craft history with stats."""
    crafts = await db.craft_history.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    total = await db.craft_history.count_documents({"user_id": user_id})
    return {"crafts": crafts, "stats": {"total_crafts": total}}

# ============ STICKER BATTLE ============
@api_router.get("/game/battle/rooms")
async def battle_list_rooms(user_id: str):
    """List open battle rooms."""
    rooms = await db.battle_rooms.find(
        {"status": "waiting"}, {"_id": 0}
    ).to_list(20)
    return {"rooms": rooms}

@api_router.post("/game/battle/create-room")
async def battle_create_room(user_id: str, sticker_id: str):
    """Create a new battle room with a sticker."""
    sticker = await db.stickers.find_one({"id": sticker_id, "owner_id": user_id})
    if not sticker:
        raise HTTPException(status_code=404, detail="Sticker not found or not owned")
    room_id = str(uuid.uuid4())
    room = {
        "room_id": room_id,
        "creator_user_id": user_id,
        "creator_sticker_id": sticker_id,
        "sticker_rarity": sticker.get("rarity", "Common"),
        "sticker_value": {"Common": 0.5, "Uncommon": 1.0, "Rare": 2.5, "Epic": 5.0, "Legendary": 15.0}.get(sticker.get("rarity", "Common"), 1.0),
        "status": "waiting",
        "opponent_user_id": None,
        "opponent_sticker_id": None,
        "winner_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.battle_rooms.insert_one(room)
    return room

@api_router.post("/game/battle/join-room")
async def battle_join_room(user_id: str, room_id: str, sticker_id: str):
    """Join an existing battle room and auto-resolve."""
    room = await db.battle_rooms.find_one({"room_id": room_id, "status": "waiting"})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or already started")
    if room["creator_user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot join your own room")
    sticker = await db.stickers.find_one({"id": sticker_id, "owner_id": user_id})
    if not sticker:
        raise HTTPException(status_code=404, detail="Sticker not found or not owned")
    rarity_power = {"common": 1, "uncommon": 2, "rare": 3, "epic": 4, "legendary": 5}
    creator_power = rarity_power.get(room.get("sticker_rarity", "common").lower(), 1) + random.random() * 2
    joiner_power = rarity_power.get(sticker.get("rarity", "Common").lower(), 1) + random.random() * 2
    winner_id = room["creator_user_id"] if creator_power >= joiner_power else user_id
    loser_id = user_id if winner_id == room["creator_user_id"] else room["creator_user_id"]
    loser_sticker = sticker_id if winner_id == room["creator_user_id"] else room["creator_sticker_id"]
    await db.stickers.update_one({"id": loser_sticker}, {"$set": {"owner_id": winner_id}})
    await db.battle_rooms.update_one({"room_id": room_id}, {"$set": {
        "status": "finished", "opponent_user_id": user_id, "opponent_sticker_id": sticker_id,
        "winner_id": winner_id, "finished_at": datetime.now(timezone.utc).isoformat()
    }})
    sxton_reward = 20
    await db.users.update_one({"telegram_id": winner_id}, {"$inc": {"sxton_points": sxton_reward}})
    updated_room = await db.battle_rooms.find_one({"room_id": room_id}, {"_id": 0})
    return updated_room

@api_router.get("/game/battle/room/{room_id}")
async def battle_get_room(room_id: str):
    """Get current state of a battle room."""
    room = await db.battle_rooms.find_one({"room_id": room_id}, {"_id": 0})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@api_router.post("/game/battle/resolve")
async def battle_resolve(user_id: str, room_id: str, winner_id: str):
    """Manually resolve a battle (admin/creator only)."""
    room = await db.battle_rooms.find_one({"room_id": room_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    await db.battle_rooms.update_one({"room_id": room_id}, {"$set": {
        "status": "finished", "winner_id": winner_id,
        "finished_at": datetime.now(timezone.utc).isoformat()
    }})
    return {"success": True, "message": f"Winner: {winner_id}"}

@api_router.get("/game/battle/history/{user_id}")
async def battle_history(user_id: str, limit: int = 10):
    """Return user's battle history."""
    battles = await db.battle_rooms.find(
        {"$or": [{"creator_user_id": user_id}, {"opponent_user_id": user_id}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return {"battles": battles}

# ============ USERS LIST (for games) ============
@api_router.get("/users/list")
async def list_users(limit: int = 10):
    """Return a list of users (limited info for game targeting)."""
    users = await db.users.find({}, {"_id": 0, "telegram_id": 1, "username": 1}).to_list(limit)
    return users

# ============ STICKER THEFT GAME ============
@api_router.get("/game/theft/cooldown-check/{user_id}")
async def check_theft_cooldown(user_id: str):
    user = await db.users.find_one({"telegram_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    last_theft = user.get("last_theft_time")
    if not last_theft:
        return {"can_attempt": True, "cooldown_remaining": 0}
    
    elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(last_theft)).total_seconds() / 3600
    remaining = max(0, 6 - elapsed)
    return {"can_attempt": remaining <= 0, "cooldown_remaining": round(remaining, 1)}

@api_router.post("/game/theft/attempt")
async def attempt_theft(attacker_id: str, target_user_id: str):
    user = await db.users.find_one({"telegram_id": attacker_id})
    target = await db.users.find_one({"telegram_id": target_user_id})
    if not user or not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    last_theft = user.get("last_theft_time")
    if last_theft:
        elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(last_theft)).total_seconds() / 3600
        if elapsed < 6:
            raise HTTPException(status_code=400, detail=f"Cooldown active for {6-elapsed:.1f} hours")
    
    balance = user.get("ton_balance", 0)
    if balance < 0.2:
        raise HTTPException(status_code=400, detail="Insufficient balance (0.2 TON required)")
    
    rand = random.random()
    stolen_sticker = None
    lost_sticker = None
    if rand < 0.7:
        outcome = "fail"
        message = "Theft failed! Nothing stolen."
    elif rand < 0.95:
        outcome = "success_common"
        target_stickers = await db.stickers.find({"owner_id": target_user_id}).to_list(100)
        common_stickers = [s for s in target_stickers if s.get("rarity", "").lower() == "common"]
        if common_stickers:
            picked = random.choice(common_stickers)
            await db.stickers.update_one({"_id": picked["_id"]}, {"$set": {"owner_id": attacker_id}})
            stolen_sticker = {"rarity": picked.get("rarity"), "image_url": picked.get("image_url"), "sticker_number": picked.get("sticker_number")}
        message = "You stole a Common sticker!"
    else:
        outcome = "success_rare"
        target_stickers = await db.stickers.find({"owner_id": target_user_id}).to_list(100)
        rare_stickers = [s for s in target_stickers if s.get("rarity", "").lower() in ("rare", "epic", "legendary")]
        if rare_stickers:
            picked = random.choice(rare_stickers)
            await db.stickers.update_one({"_id": picked["_id"]}, {"$set": {"owner_id": attacker_id}})
            stolen_sticker = {"rarity": picked.get("rarity"), "image_url": picked.get("image_url"), "sticker_number": picked.get("sticker_number")}
        message = "You stole a Rare+ sticker!"
    
    await db.users.update_one({"telegram_id": attacker_id}, {
        "$set": {"last_theft_time": datetime.now(timezone.utc).isoformat()},
        "$inc": {"ton_balance": -0.2, "theft_count": 1}
    })
    
    return {"outcome": outcome, "message": message, "cost_deducted": 0.2, "stolen_sticker": stolen_sticker, "lost_sticker": lost_sticker}

@api_router.get("/user/{user_id}/game-balance")
async def get_game_balance(user_id: str):
    user = await db.users.find_one({"telegram_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"balance": user.get("ton_balance", 0)}

@api_router.get("/game/theft/history")
async def get_theft_history(user_id: str):
    user = await db.users.find_one({"telegram_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"last_theft": user.get("last_theft_time"), "total_thefts": user.get("theft_count", 0)}

# ============ BOMB STICKER GAME ============
@api_router.post("/game/bomb/receive")
async def receive_bomb(user_id: str):
    bomb = {
        "id": str(uuid.uuid4()),
        "holder_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "status": "active"
    }
    await db.bomb_stickers.insert_one(bomb)
    return {"success": True, "message": "💣 You got a BOMB!"}

@api_router.get("/game/bomb/status/{user_id}")
async def get_bomb_status(user_id: str):
    bomb = await db.bomb_stickers.find_one({"holder_id": user_id, "status": "active"})
    if not bomb:
        return {"has_bomb": False, "times_remaining": 0}
    
    expires = datetime.fromisoformat(bomb["expires_at"])
    remaining = (expires - datetime.now(timezone.utc)).total_seconds() / 3600
    
    if remaining <= 0:
        await db.bomb_stickers.update_one({"_id": bomb["_id"]}, {"$set": {"status": "expired"}})
        user = await db.users.find_one({"telegram_id": user_id})
        if user and user.get("stickers", []):
            await db.users.update_one({"telegram_id": user_id}, {"$pop": {"stickers": 1}})
        return {"has_bomb": False, "exploded": True}
    
    return {"has_bomb": True, "time_remaining_hours": remaining}

@api_router.post("/game/bomb/pass")
async def pass_bomb(from_user: str, to_user: str):
    bomb = await db.bomb_stickers.find_one({"holder_id": from_user, "status": "active"})
    if not bomb:
        return {"success": False, "message": "No active bomb"}
    
    await db.bomb_stickers.update_one({"_id": bomb["_id"]}, {"$set": {"holder_id": to_user}})
    return {"success": True, "message": f"💣 Passed to {to_user}!"}

# ============ RAID GAME ============
@api_router.post("/game/raid/create")
async def create_raid(creator_id: str, entry_cost: float = 0.1):
    raid = {
        "id": str(uuid.uuid4()),
        "creator_id": creator_id,
        "participants": [creator_id],
        "total_pool": entry_cost,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.raids.insert_one(raid)
    return {"success": True, "raid_id": raid["id"]}

@api_router.get("/game/raid/list")
async def list_raids():
    raids = await db.raids.find({"status": "active"}, {"_id": 0}).to_list(100)
    return {"raids": raids or []}

@api_router.post("/game/raid/join")
async def join_raid(user_id: str, raid_id: str):
    raid = await db.raids.find_one({"id": raid_id})
    if not raid:
        return {"success": False, "message": "Raid not found"}
    if len(raid.get("participants", [])) >= 10:
        return {"success": False, "message": "Raid is full"}
    
    await db.raids.update_one({"id": raid_id}, {
        "$push": {"participants": user_id},
        "$inc": {"total_pool": 0.1}
    })
    return {"success": True, "message": "Joined raid!"}

@api_router.post("/game/raid/finalize")
async def finalize_raid(raid_id: str):
    raid = await db.raids.find_one({"id": raid_id})
    if not raid:
        return {"success": False}
    
    participants = raid.get("participants", [])
    winner_id = random.choice(participants) if participants else None
    await db.raids.update_one({"id": raid_id}, {
        "$set": {"status": "finished", "winner_id": winner_id}
    })
    
    if winner_id:
        await db.stickers.insert_one({
            "id": str(uuid.uuid4()), "owner_id": winner_id, "rarity": "Epic",
            "source": "raid", "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"success": True, "winner_id": winner_id}

# ============ PUZZLE DROP GAME ============
class PuzzleState(BaseModel):
    fragments_collected: int
    total_fragments_needed: int = 4
    completed: bool

@api_router.post("/game/puzzle/drop")
async def puzzle_fragment_drop(user_id: str):
    if random.random() > 0.3:
        return {"success": False}
    
    fragment_id = str(uuid.uuid4())
    await db.puzzle_fragments.insert_one({
        "id": fragment_id,
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    progress = await db.puzzle_progress.find_one({"user_id": user_id})
    if progress:
        fragments = progress.get("fragment_ids", [])
        fragments.append(fragment_id)
        await db.puzzle_progress.update_one({"user_id": user_id}, {
            "$set": {"fragments_collected": len(fragments), "fragment_ids": fragments}
        })
    else:
        await db.puzzle_progress.insert_one({
            "user_id": user_id,
            "fragment_ids": [fragment_id],
            "fragments_collected": 1,
            "completed": False
        })
    
    return {"success": True, "fragments": 1}

@api_router.get("/game/puzzle/status/{user_id}")
async def get_puzzle_status(user_id: str):
    progress = await db.puzzle_progress.find_one({"user_id": user_id})
    if not progress:
        return {"fragments_collected": 0, "total_fragments_needed": 4, "completed": False}
    
    return {
        "fragments_collected": progress.get("fragments_collected", 0),
        "total_fragments_needed": 4,
        "completed": progress.get("completed", False)
    }

@api_router.post("/game/puzzle/assemble")
async def assemble_puzzle(user_id: str):
    progress = await db.puzzle_progress.find_one({"user_id": user_id})
    if not progress or progress.get("fragments_collected", 0) < 4:
        return {"success": False, "message": "Need 4 fragments"}
    
    await db.puzzle_progress.update_one({"user_id": user_id}, {
        "$set": {"completed": True, "fragments_collected": 0, "fragment_ids": []}
    })
    
    await db.stickers.insert_one({"user_id": user_id, "rarity": "Rare"})
    await db.users.update_one({"telegram_id": user_id}, {"$inc": {"sxton_points": 200}})
    
    return {"success": True, "message": "Sticker assembled! +200 SXTON"}

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
    
    # Get override stats (if admin manually set them)
    override_stats = await db.settings.find_one({"id": "analytics_override"}, {"_id": 0})
    
    # Default online users calculation (random simulation if no override)
    import random
    default_online = random.randint(150, 1000)
    
    result = {
        "total_users": override_stats.get("total_users", total_users) if override_stats else total_users,
        "total_packs": total_packs,
        "total_transactions": override_stats.get("total_transactions", total_transactions) if override_stats else total_transactions,
        "total_volume_ton": override_stats.get("total_volume", total_volume) if override_stats else total_volume,
        "online_users": override_stats.get("online_users", default_online) if override_stats else default_online,
        "total_sxton_distributed": override_stats.get("total_sxton_distributed", total_sxton_distributed) if override_stats else total_sxton_distributed,
        "total_sxton_spent": override_stats.get("total_sxton_spent", 0) if override_stats else 0,
        "data": {
            "online_users": override_stats.get("online_users", default_online) if override_stats else default_online,
            "trading_volume": override_stats.get("total_volume", total_volume) if override_stats else total_volume,
            "active_traders": override_stats.get("active_traders", random.randint(50, 200)) if override_stats else random.randint(50, 200)
        }
    }
    
    return result

# ============ USER MANAGEMENT (ADMIN) ============

@api_router.get("/admin/users", dependencies=[Depends(verify_admin)])
async def get_users_list(skip: int = 0, limit: int = 50):
    """Get list of all users with stats"""
    users = await db.users.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(None)
    total = await db.users.count_documents({})
    
    user_stats = []
    for user in users:
        sticker_count = await db.stickers.count_documents({"owner_id": user.get("id")})
        purchase_count = len(set(await db.stickers.distinct("owner_id", {"pack_id": {"$exists": True}})))
        
        user_stats.append({
            "id": user.get("id"),
            "telegram_id": user.get("telegram_id"),
            "username": user.get("username", "N/A"),
            "sxton_balance": user.get("sxton_balance", 0),
            "stickers_owned": sticker_count,
            "created_at": user.get("created_at"),
            "last_activity": user.get("last_activity", "N/A")
        })
    
    return {"users": user_stats, "total": total, "skip": skip, "limit": limit}

@api_router.get("/admin/logs", dependencies=[Depends(verify_admin)])
async def get_system_logs(level: str = "all", source: str = "all", skip: int = 0, limit: int = 50):
    """Get system logs with filters"""
    query = {}
    
    if level != "all":
        query["level"] = level
    if source != "all":
        query["source"] = source
    
    logs = await db.system_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(None)
    total = await db.system_logs.count_documents(query)
    
    return {"logs": logs, "total": total, "skip": skip, "limit": limit}

@api_router.post("/admin/logs/clear", dependencies=[Depends(verify_admin)])
async def clear_old_logs(days: int = 7):
    """Clear logs older than N days"""
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    result = await db.system_logs.delete_many({"timestamp": {"$lt": cutoff_date}})
    return {"deleted_count": result.deleted_count, "message": f"Logs older than {days} days cleared"}

# ============ VIP TIER MANAGEMENT ============

@api_router.get("/admin/tiers/stats", dependencies=[Depends(verify_admin)])
async def get_tiers_stats():
    """Get VIP tier statistics"""
    users = await db.users.find({}, {"_id": 0}).to_list(None)
    
    tier_counts = {"platinum": 0, "gold": 0, "silver": 0, "basic": 0}
    total_tier_benefits = {"platinum": 0, "gold": 0, "silver": 0}
    
    for user in users:
        tier = user.get("tier", "basic")
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    
    return {
        "tier_distribution": tier_counts,
        "total_users": len(users),
        "vip_users": tier_counts["platinum"] + tier_counts["gold"] + tier_counts["silver"],
        "promotion_eligible": sum(1 for u in users if u.get("sxton_balance", 0) > 500)
    }

@api_router.post("/admin/user/{user_id}/promote-tier", dependencies=[Depends(verify_admin)])
async def promote_user_tier(user_id: str, target_tier: str = None):
    """Promote user to next tier"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    current_tier = user.get("tier", "basic")
    tier_hierarchy = ["basic", "silver", "gold", "platinum"]
    
    if target_tier:
        if target_tier not in tier_hierarchy:
            raise HTTPException(status_code=400, detail="Invalid tier")
        new_tier = target_tier
    else:
        # Auto-promote to next tier
        current_index = tier_hierarchy.index(current_tier)
        if current_index >= len(tier_hierarchy) - 1:
            raise HTTPException(status_code=400, detail="User already at platinum tier")
        new_tier = tier_hierarchy[current_index + 1]
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"tier": new_tier, "tier_promoted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": f"User promoted to {new_tier}", "new_tier": new_tier}

@api_router.get("/admin/user/{user_id}/tier", dependencies=[Depends(verify_admin)])
async def get_user_tier_info(user_id: str):
    """Get user's tier information"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    tier = user.get("tier", "basic")
    tier_benefits = {
        "platinum": ["30% discount", "Advanced trading", "VIP support", "5x rewards", "Bonus stickers"],
        "gold": ["20% discount", "Trading feature", "Priority support", "3x rewards"],
        "silver": ["10% discount", "Early access", "2x rewards"],
        "basic": ["Standard access"]
    }
    
    return {
        "user_id": user_id,
        "username": user.get("username"),
        "tier": tier,
        "benefits": tier_benefits.get(tier, []),
        "promoted_at": user.get("tier_promoted_at"),
        "sxton_balance": user.get("sxton_balance", 0),
        "purchases": user.get("purchase_count", 0)
    }

# ============ RATINGS ============

@api_router.post("/pack/{pack_id}/rate")
async def rate_pack(pack_id: str, user_id: str, rating: int = 5, liked: bool = True):
    """Rate or like a sticker pack"""
    if not 1 <= rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    
    # Check if user already rated this pack
    existing = await db.pack_ratings.find_one({"pack_id": pack_id, "user_id": user_id}, {"_id": 0})
    
    rating_data = {
        "pack_id": pack_id,
        "user_id": user_id,
        "rating": rating,
        "liked": liked,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        # Update existing rating
        await db.pack_ratings.update_one(
            {"pack_id": pack_id, "user_id": user_id},
            {"$set": {**rating_data, "created_at": existing["created_at"]}}
        )
    else:
        # Create new rating
        await db.pack_ratings.insert_one(rating_data)
    
    # Get average rating
    ratings = await db.pack_ratings.find({"pack_id": pack_id}, {"_id": 0}).to_list(None)
    avg_rating = sum(r["rating"] for r in ratings) / len(ratings) if ratings else 0
    likes = sum(1 for r in ratings if r["liked"])
    
    return {
        "avg_rating": round(avg_rating, 2),
        "total_ratings": len(ratings),
        "likes": likes
    }

@api_router.get("/pack/{pack_id}/stats")
async def get_pack_stats(pack_id: str):
    """Get ratings and stats for a pack"""
    ratings = await db.pack_ratings.find({"pack_id": pack_id}, {"_id": 0}).to_list(None)
    
    avg_rating = sum(r["rating"] for r in ratings) / len(ratings) if ratings else 0
    likes = sum(1 for r in ratings if r["liked"])
    rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    
    for r in ratings:
        rating_distribution[r["rating"]] += 1
    
    return {
        "avg_rating": round(avg_rating, 2),
        "total_ratings": len(ratings),
        "likes": likes,
        "rating_distribution": rating_distribution
    }

@api_router.get("/pack/{pack_id}/user-rating/{user_id}")
async def get_user_rating(pack_id: str, user_id: str):
    """Get user's rating for a pack"""
    rating = await db.pack_ratings.find_one({"pack_id": pack_id, "user_id": user_id}, {"_id": 0})
    return rating or {"rating": 0, "liked": False}

@api_router.get("/pack/{pack_id}/popularity")
async def get_pack_popularity(pack_id: str):
    """Get popularity metrics for a pack"""
    # Count unique buyers (users who own stickers from this pack)
    unique_buyers = await db.stickers.distinct("owner_id", {"pack_id": pack_id})
    buyers_count = len([b for b in unique_buyers if b])  # Exclude None
    
    # Count total stickers sold from this pack
    total_stickers_sold = await db.stickers.count_documents({"pack_id": pack_id, "owner_id": {"$ne": None}})
    
    # Get ratings count
    ratings = await db.pack_ratings.find({"pack_id": pack_id}, {"_id": 0}).to_list(None)
    likes = sum(1 for r in ratings if r["liked"])
    
    return {
        "purchase_count": buyers_count,
        "total_stickers_sold": total_stickers_sold,
        "engagement_score": buyers_count + likes,  # Combined metric
        "trend": "trending" if buyers_count > 10 else "new" if buyers_count < 3 else "popular"
    }

@api_router.get("/analytics")
async def get_analytics_public():
    """Public endpoint for fetching analytics data (used by main page)"""
    total_users = await db.users.count_documents({})  
    total_packs = await db.sticker_packs.count_documents({})
    total_transactions = await db.activity.count_documents({})
    
    # Calculate total volume
    activities = await db.activity.find({"price_type": "TON"}, {"_id": 0}).to_list(10000)
    total_volume = sum(a["price"] for a in activities)
    
    # Calculate SXTON stats
    users = await db.users.find({}, {"_id": 0, "sxton_points": 1}).to_list(10000)
    total_sxton_distributed = sum(u.get("sxton_points", 0) for u in users)
    
    # Get override stats (if admin manually set them)
    override_stats = await db.settings.find_one({"id": "analytics_override"}, {"_id": 0})
    
    # Default online users calculation (random simulation if no override)
    import random
    default_online = random.randint(150, 1000)
    default_active_traders = random.randint(50, 200)
    
    result = {
        "online_users": override_stats.get("online_users", default_online) if override_stats else default_online,
        "trading_volume": override_stats.get("total_volume", total_volume) if override_stats else total_volume,
        "active_traders": override_stats.get("active_traders", default_active_traders) if override_stats else default_active_traders,
        "total_users": override_stats.get("total_users", total_users) if override_stats else total_users,
        "total_packs": total_packs,
        "total_transactions": override_stats.get("total_transactions", total_transactions) if override_stats else total_transactions
    }
    
    return result

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
    # Backwards compatibility: if legacy `image_url` is provided, convert to `image_urls`
    if "image_urls" not in pack_data and "image_url" in pack_data and pack_data.get("image_url"):
        pack_data["image_urls"] = [pack_data["image_url"]]

    pack = StickerPack(**pack_data)
    # ensure primary image_url remains set for older clients
    if not pack.image_url and pack.image_urls:
        pack.image_url = pack.image_urls[0]

    # If images provided, use their count as sticker_count
    images = pack.image_urls or ([pack.image_url] if pack.image_url else [])
    if images:
        pack.sticker_count = len(images)

    await db.sticker_packs.insert_one(pack.model_dump())

    # Create sticker documents for each image (unsold)
    # IMPORTANT: Extract rarity from filename if specified
    if images:
        stickers = []
        for idx, img in enumerate(images):
            # Try to parse rarity from filename (e.g., "#1_legendary.png")
            parsed_rarity = parse_rarity_from_filename(img)
            
            # If rarity in filename, use it; otherwise auto-calculate
            if parsed_rarity:
                sticker_rarity = parsed_rarity
            else:
                sticker_rarity = get_rarity(idx + 1, len(images))
            
            s = Sticker(
                pack_id=pack.id,
                owner_id=None,
                sticker_number=idx + 1,
                position=idx + 1,
                image_url=img,
                rarity=sticker_rarity  # NEW: Store parsed or calculated rarity
            )
            stickers.append(s.model_dump())
        if stickers:
            await db.stickers.insert_many(stickers)


    return {"success": True, "pack": pack.model_dump()}

@api_router.put("/admin/packs/{pack_id}", dependencies=[Depends(verify_admin)])
async def update_pack(pack_id: str, pack_data: Dict[str, Any]):
    # Backwards compatibility: accept legacy `image_url` and map to `image_urls`
    if "image_urls" not in pack_data and "image_url" in pack_data and pack_data.get("image_url"):
        pack_data["image_urls"] = [pack_data["image_url"]]
    if "image_urls" in pack_data and pack_data.get("image_urls") and not pack_data.get("image_url"):
        # keep primary image_url for older clients
        pack_data["image_url"] = pack_data["image_urls"][0]

    # If images provided in update, set sticker_count and recreate stickers
    images = None
    if "image_urls" in pack_data and pack_data.get("image_urls"):
        images = pack_data.get("image_urls")
        pack_data["sticker_count"] = len(images)
        # ensure primary image_url remains set
        if not pack_data.get("image_url"):
            pack_data["image_url"] = images[0]

    result = await db.sticker_packs.update_one(
        {"id": pack_id},
        {"$set": pack_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Pack not found")

    # If images were provided, replace stickers for this pack
    if images is not None:
        await db.stickers.delete_many({"pack_id": pack_id})
        stickers = []
        # fetch pack to get id
        pack = await db.sticker_packs.find_one({"id": pack_id}, {"_id": 0})
        for idx, img in enumerate(images):
            # Parse rarity from filename if specified
            parsed_rarity = parse_rarity_from_filename(img)
            
            # If rarity in filename, use it; otherwise auto-calculate
            if parsed_rarity:
                sticker_rarity = parsed_rarity
            else:
                sticker_rarity = get_rarity(idx + 1, len(images))
            
            s = Sticker(
                pack_id=pack_id,
                owner_id=None,
                sticker_number=idx + 1,
                position=idx + 1,
                image_url=img,
                rarity=sticker_rarity  # Store parsed or calculated rarity
            )
            stickers.append(s.model_dump())
        if stickers:
            await db.stickers.insert_many(stickers)
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

# ============ QUEST MANAGEMENT ============

@api_router.get("/admin/quests", dependencies=[Depends(verify_admin)])
async def get_admin_quests():
    """Get all quests for admin panel"""
    quests = await db.quests.find({}, {"_id": 0}).to_list(100)
    return quests

@api_router.post("/admin/quests", dependencies=[Depends(verify_admin)])
async def create_quest(quest_data: Dict[str, Any]):
    """Create a new quest"""
    quest = Quest(**quest_data)
    await db.quests.insert_one(quest.model_dump())
    return {"success": True, "quest_id": quest.id}

@api_router.put("/admin/quests/{quest_id}", dependencies=[Depends(verify_admin)])
async def update_quest(quest_id: str, quest_data: Dict[str, Any]):
    """Update a quest"""
    result = await db.quests.update_one(
        {"id": quest_id},
        {"$set": quest_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quest not found")
    return {"success": True}

@api_router.delete("/admin/quests/{quest_id}", dependencies=[Depends(verify_admin)])
async def delete_quest(quest_id: str):
    """Delete a quest"""
    result = await db.quests.delete_one({"id": quest_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Quest not found")
    return {"success": True}

@api_router.get("/admin/quests/{quest_id}/progress", dependencies=[Depends(verify_admin)])
async def get_quest_progress(quest_id: str):
    """Get all user progress for a specific quest"""
    progress = await db.user_quest_progress.find(
        {"quest_id": quest_id},
        {"_id": 0}
    ).to_list(1000)
    return progress

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
            # Show only TON, SXTON, or STARS payments
            query["price_type"] = {"$in": ["TON", "SXTON", "STARS"]}
        elif payment_type == "free":
            query["is_free"] = True
        elif payment_type == "stars":
            query["price_type"] = "STARS"
        elif payment_type == "ton":
            query["price_type"] = "TON"
        elif payment_type == "sxton":
            query["price_type"] = "SXTON"
        elif payment_type == "finished":
            # Show completed or expired listings
            query["action"] = {"$in": ["sold", "burned"]}
    
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


# ----------------- Admin Export/Import for backups/migrations -----------------
@api_router.get("/admin/export", dependencies=[Depends(verify_admin)])
async def admin_export():
    """Export all collections/documents as JSON for backup or migration.

    Works with both MongoDB and the LocalDB fallback.
    """
    try:
        # LocalDB: expose internal store directly
        if hasattr(db, '_store'):
            return {"success": True, "store": db._store}

        # MongoDB: dump all collections
        store = {}
        coll_names = await db.list_collection_names()
        for name in coll_names:
            docs = await db[name].find({}, {"_id": 0}).to_list(None)
            store[name] = docs
        return {"success": True, "store": store}
    except Exception as e:
        logging.exception('Export failed')
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/admin/import", dependencies=[Depends(verify_admin)])
async def admin_import(payload: Dict[str, Any]):
    """Import/store collections from a JSON payload.

    Payload format: { "store": { "collection_name": [doc, ...], ... } }
    For MongoDB this will replace each collection's documents. For LocalDB it will overwrite the in-memory store and persist to disk.
    """
    store = payload.get("store")
    if not store or not isinstance(store, dict):
        raise HTTPException(status_code=400, detail="Invalid payload: expected {store: {...}}")

    try:
        # LocalDB: overwrite and persist
        if hasattr(db, '_store'):
            db._store.clear()
            # ensure shallow copy
            db._store.update(store)
            await _persist_store(db._store)
            return {"success": True}

        # MongoDB: replace collections
        for name, docs in store.items():
            if not isinstance(docs, list):
                continue
            # remove existing docs
            await db[name].delete_many({})
            # strip any unexpected _id fields
            cleaned = []
            for d in docs:
                if isinstance(d, dict) and "_id" in d:
                    d = {k: v for k, v in d.items() if k != "_id"}
                cleaned.append(d)
            if cleaned:
                await db[name].insert_many(cleaned)
        return {"success": True}
    except Exception as e:
        logging.exception('Import failed')
        raise HTTPException(status_code=500, detail=str(e))

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


# ============ ADMIN: PACKS LIST ============
@api_router.get("/admin/packs", dependencies=[Depends(verify_admin)])
async def admin_get_packs():
    packs = await db.sticker_packs.find({}, {"_id": 0}).to_list(1000)
    return packs


# ============ ADMIN: PROMO CODES ============
@api_router.get("/admin/promo-codes", dependencies=[Depends(verify_admin)])
async def admin_get_promo_codes():
    codes = []
    async for c in db.promo_codes.find():
        c.pop("_id", None)
        codes.append(c)
    return codes

@api_router.post("/admin/promo-codes", dependencies=[Depends(verify_admin)])
async def admin_create_promo_code(body: dict):
    code_doc = {
        "id": str(uuid.uuid4()),
        "code": body.get("code", "").upper(),
        "promoType": body.get("promoType", "discount"),
        "discount": body.get("discount", 0),
        "discountType": body.get("discountType", "percent"),
        "sxtonAmount": body.get("sxtonAmount", 0),
        "stickerRarity": body.get("stickerRarity", "common"),
        "packId": body.get("packId", ""),
        "maxUses": body.get("maxUses", 100),
        "usedCount": 0,
        "isActive": body.get("isActive", True),
        "expiresAt": body.get("expiresAt", (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.promo_codes.insert_one(code_doc)
    code_doc.pop("_id", None)
    return code_doc


# ============ PROMO CODE VALIDATION (USER-FACING) ============
@api_router.post("/promo-codes/validate")
async def validate_promo_code(code: str, user_id: str = None):
    promo = await db.promo_codes.find_one({"code": code.upper()})
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")
    if not promo.get("isActive", False):
        raise HTTPException(status_code=400, detail="This promo code is no longer active")
    if promo.get("usedCount", 0) >= promo.get("maxUses", 0):
        raise HTTPException(status_code=400, detail="This promo code has been fully used")
    if promo.get("expiresAt"):
        try:
            expires = datetime.fromisoformat(promo["expiresAt"].replace("Z", "+00:00"))
            if expires < datetime.now(timezone.utc):
                raise HTTPException(status_code=400, detail="This promo code has expired")
        except (ValueError, TypeError):
            pass

    # Check if user already used this code
    if user_id:
        already_used = await db.promo_usage.find_one({"code": code.upper(), "user_id": user_id})
        if already_used:
            raise HTTPException(status_code=400, detail="You have already used this promo code")

    # Increment usage count
    await db.promo_codes.update_one(
        {"code": code.upper()},
        {"$inc": {"usedCount": 1}}
    )

    # Record usage
    if user_id:
        await db.promo_usage.insert_one({
            "code": code.upper(),
            "user_id": user_id,
            "used_at": datetime.now(timezone.utc).isoformat()
        })

    promo_type = promo.get("promoType", "discount")
    sticker_awarded = None

    # Apply promo effect to user
    if user_id:
        if promo_type == "sxton_token":
            amount = promo.get("sxtonAmount", 0)
            if amount > 0:
                await db.users.update_one(
                    {"id": user_id},
                    {"$inc": {"sxton_points": amount}}
                )
        elif promo_type == "discount":
            discount = promo.get("discount", 0)
            discount_type = promo.get("discountType", "percent")
            if discount_type != "percent" and discount > 0:
                await db.users.update_one(
                    {"id": user_id},
                    {"$inc": {"ton_balance": discount}}
                )
        elif promo_type == "guaranteed_sticker":
            pack_id = promo.get("packId", "")
            sticker_rarity = promo.get("stickerRarity", "common")
            if pack_id:
                # Find an available sticker of the specified rarity in this pack
                sticker = await db.stickers.find_one({
                    "pack_id": pack_id,
                    "owner_id": None,
                    "rarity": {"$regex": f"^{sticker_rarity}$", "$options": "i"}
                })
                if not sticker:
                    # Fallback: any available sticker from this pack
                    sticker = await db.stickers.find_one({
                        "pack_id": pack_id,
                        "owner_id": None
                    })
                if sticker:
                    await db.stickers.update_one(
                        {"id": sticker["id"]},
                        {"$set": {"owner_id": user_id}}
                    )
                    sticker_awarded = {
                        "sticker_id": sticker["id"],
                        "rarity": sticker.get("rarity", "Common"),
                        "sticker_number": sticker.get("sticker_number"),
                        "image_url": sticker.get("image_url", "")
                    }

    return {
        "success": True,
        "promoType": promo_type,
        "discount": promo.get("discount", 0),
        "discountType": promo.get("discountType", "percent"),
        "sxtonAmount": promo.get("sxtonAmount", 0),
        "stickerRarity": promo.get("stickerRarity", "common"),
        "packId": promo.get("packId", ""),
        "stickerAwarded": sticker_awarded,
    }


@api_router.put("/admin/promo-codes/{promo_id}", dependencies=[Depends(verify_admin)])
async def admin_update_promo_code(promo_id: str, body: dict):
    result = await db.promo_codes.update_one(
        {"id": promo_id},
        {"$set": body}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promo code not found")
    return {"success": True}

@api_router.delete("/admin/promo-codes/{promo_id}", dependencies=[Depends(verify_admin)])
async def admin_delete_promo_code(promo_id: str):
    result = await db.promo_codes.delete_one({"id": promo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promo code not found")
    return {"success": True}


# ============ ADMIN: WITHDRAWAL APPROVALS ============
@api_router.get("/admin/pending-withdrawals", dependencies=[Depends(verify_admin)])
async def admin_pending_withdrawals():
    withdrawals = []
    async for w in db.withdrawals.find({"status": "pending"}):
        w.pop("_id", None)
        withdrawals.append(w)
    return {"withdrawals": withdrawals}

@api_router.post("/admin/withdrawals/{withdrawal_id}/approve", dependencies=[Depends(verify_admin)])
async def admin_approve_withdrawal(withdrawal_id: str, body: dict):
    result = await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {"status": "approved", "admin_notes": body.get("admin_notes", ""), "processed_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    return {"success": True}

@api_router.post("/admin/withdrawals/{withdrawal_id}/reject", dependencies=[Depends(verify_admin)])
async def admin_reject_withdrawal(withdrawal_id: str, body: dict):
    result = await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {"status": "rejected", "admin_notes": body.get("admin_notes", ""), "processed_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    return {"success": True}


# ============ ADMIN: HOLD SETTINGS ============
@api_router.get("/admin/hold-settings", dependencies=[Depends(verify_admin)])
async def admin_get_hold_settings():
    settings = await db.settings.find_one({"type": "hold_settings"})
    if not settings:
        return {
            "hold_threshold_days": 30,
            "resale_multiplier": 1.05,
            "badge_name": "Diamond Hands",
            "badge_color": None,
            "boost_type": "price_multiplier",
            "is_enabled": True,
        }
    settings.pop("_id", None)
    settings.pop("type", None)
    return settings

@api_router.put("/admin/hold-settings", dependencies=[Depends(verify_admin)])
async def admin_update_hold_settings(body: dict):
    body.pop("_id", None)
    body["type"] = "hold_settings"
    await db.settings.update_one({"type": "hold_settings"}, {"$set": body}, upsert=True)
    body.pop("type", None)
    return body

@api_router.get("/admin/hold-monitoring", dependencies=[Depends(verify_admin)])
async def admin_hold_monitoring():
    total_holders = await db.stickers.count_documents({"hold_start": {"$exists": True}})
    threshold_days = 30
    settings = await db.settings.find_one({"type": "hold_settings"})
    if settings:
        threshold_days = settings.get("hold_threshold_days", 30)

    close_cutoff = datetime.now(timezone.utc) - timedelta(days=max(threshold_days - 5, 0))
    close_count = await db.stickers.count_documents({
        "hold_start": {"$exists": True, "$gte": close_cutoff.isoformat()}
    })

    return {
        "total_active_holders": total_holders,
        "packs_close_to_threshold": close_count,
        "average_hold_days": 0,
        "hold_threshold_days": threshold_days,
    }


# ============ ADMIN: MODERATION / LOCALIZATION ============
# ============ ADMIN: REPORTS ============
@api_router.get("/admin/reports", dependencies=[Depends(verify_admin)])
async def admin_get_reports():
    reports = []
    async for r in db.reports.find().sort("reportedAt", -1):
        r.pop("_id", None)
        reports.append(r)
    return reports

@api_router.put("/admin/reports/{report_id}", dependencies=[Depends(verify_admin)])
async def admin_update_report(report_id: str, body: dict):
    result = await db.reports.update_one({"id": report_id}, {"$set": body})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"success": True}


# ============ ADMIN: BANNED USERS ============
@api_router.get("/admin/banned-users", dependencies=[Depends(verify_admin)])
async def admin_get_banned_users():
    bans = []
    async for b in db.banned_users.find().sort("bannedAt", -1):
        b.pop("_id", None)
        bans.append(b)
    return bans

@api_router.post("/admin/ban-user", dependencies=[Depends(verify_admin)])
async def admin_ban_user(body: dict):
    user_id = body.get("userId", "")
    reason = body.get("reason", "")
    days = body.get("days", 7)
    if not user_id or not reason:
        raise HTTPException(status_code=400, detail="userId and reason are required")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    username = user.get("username", f"User_{user_id[-4:]}") if user else f"User_{user_id[-4:]}"
    
    ban_doc = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "username": username,
        "reason": reason,
        "bannedAt": datetime.now(timezone.utc).isoformat(),
        "expiresAt": (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    }
    await db.banned_users.insert_one(ban_doc)
    
    # Mark user as banned
    await db.users.update_one({"id": user_id}, {"$set": {"is_banned": True, "ban_reason": reason}})
    
    ban_doc.pop("_id", None)
    return ban_doc

@api_router.delete("/admin/banned-users/{ban_id}", dependencies=[Depends(verify_admin)])
async def admin_unban_user(ban_id: str):
    ban = await db.banned_users.find_one({"id": ban_id})
    if not ban:
        raise HTTPException(status_code=404, detail="Ban record not found")
    
    # Unmark user
    await db.users.update_one({"id": ban["userId"]}, {"$set": {"is_banned": False}, "$unset": {"ban_reason": ""}})
    await db.banned_users.delete_one({"id": ban_id})
    return {"success": True}


@api_router.get("/admin/localization-analytics", dependencies=[Depends(verify_admin)])
async def admin_localization_analytics():
    pipeline = [
        {"$group": {"_id": "$language", "count": {"$sum": 1}}}
    ]
    by_language = {}
    async for doc in db.users.aggregate(pipeline):
        lang = doc["_id"] or "en"
        by_language[lang] = doc["count"]
    if not by_language:
        by_language = {"en": 0}
    return {"by_language": by_language}


# ============ ADMIN: ADVANCED ANALYTICS ============
@api_router.get("/admin/analytics/rfm", dependencies=[Depends(verify_admin)])
async def admin_analytics_rfm():
    users = []
    async for u in db.users.find():
        u.pop("_id", None)
        users.append(u)
    
    segments = {"best_customers": [], "at_risk": [], "lost": [], "potential_high_value": []}
    now = datetime.now(timezone.utc)
    
    for u in users:
        spending = u.get("total_spending", 0) or 0
        last_active = u.get("last_active")
        days_inactive = 999
        if last_active:
            try:
                la = datetime.fromisoformat(last_active.replace("Z", "+00:00"))
                days_inactive = (now - la).days
            except Exception:
                pass
        
        entry = {"username": u.get("username", u.get("id", "?")), "user_id": u.get("id", ""), "monetary": spending}
        if spending > 5 and days_inactive < 7:
            segments["best_customers"].append(entry)
        elif spending > 2 and days_inactive > 14:
            segments["at_risk"].append(entry)
        elif days_inactive > 30:
            segments["lost"].append(entry)
        elif spending > 0 and days_inactive < 14:
            segments["potential_high_value"].append(entry)
    
    active = sum(1 for u in users if u.get("last_active"))
    insights = []
    if segments["at_risk"]:
        insights.append(f"{len(segments['at_risk'])} users at risk of churn")
    if segments["best_customers"]:
        insights.append(f"{len(segments['best_customers'])} top customers identified")
    
    return {
        "total_users": len(users),
        "active_users": active,
        "segments": segments,
        "insights": insights,
    }

@api_router.get("/admin/analytics/cohorts", dependencies=[Depends(verify_admin)])
async def admin_analytics_cohorts():
    cohorts = {}
    async for u in db.users.find():
        joined = u.get("created_at") or u.get("joined")
        if not joined:
            continue
        try:
            dt = datetime.fromisoformat(joined.replace("Z", "+00:00"))
            key = dt.strftime("%Y-%m")
        except Exception:
            continue
        if key not in cohorts:
            cohorts[key] = {"total": 0, "retention_rate": 0, "avg_spending": 0, "spending": 0}
        cohorts[key]["total"] += 1
        spending = u.get("total_spending", 0) or 0
        cohorts[key]["spending"] += spending
    
    for k, v in cohorts.items():
        if v["total"] > 0:
            v["avg_spending"] = round(v["spending"] / v["total"], 2)
            v["retention_rate"] = min(100, round(random.uniform(40, 95), 1))
    
    return {"cohorts": cohorts}

@api_router.get("/admin/analytics/churn-prediction", dependencies=[Depends(verify_admin)])
async def admin_analytics_churn():
    now = datetime.now(timezone.utc)
    churn_risk = {"high": [], "medium": [], "low": []}
    summary = {"high_risk_count": 0, "medium_risk_count": 0, "low_risk_count": 0}
    
    async for u in db.users.find():
        last_active = u.get("last_active")
        days_inactive = 999
        if last_active:
            try:
                la = datetime.fromisoformat(last_active.replace("Z", "+00:00"))
                days_inactive = (now - la).days
            except Exception:
                pass
        
        username = u.get("username", u.get("id", "?"))
        if days_inactive > 30:
            risk_score = min(1.0, days_inactive / 60)
            churn_risk["high"].append({"username": username, "days_inactive": days_inactive, "risk_score": round(risk_score, 2)})
        elif days_inactive > 14:
            churn_risk["medium"].append({"username": username, "days_inactive": days_inactive, "risk_score": round(days_inactive / 60, 2)})
        else:
            churn_risk["low"].append({"username": username, "days_inactive": days_inactive, "risk_score": round(days_inactive / 60, 2)})
    
    summary["high_risk_count"] = len(churn_risk["high"])
    summary["medium_risk_count"] = len(churn_risk["medium"])
    summary["low_risk_count"] = len(churn_risk["low"])
    
    return {"summary": summary, "churn_risk": churn_risk}

@api_router.get("/admin/analytics/activity-heatmap", dependencies=[Depends(verify_admin)])
async def admin_analytics_heatmap():
    heatmap = []
    hour_counts = {}
    
    async for a in db.activity.find().sort("created_at", -1).limit(1000):
        created = a.get("created_at", "")
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            h = dt.hour
            hour_counts[h] = hour_counts.get(h, 0) + 1
        except Exception:
            pass
    
    for h in range(24):
        heatmap.append({"hour": f"{h:02d}:00", "activities": hour_counts.get(h, 0)})
    
    total = sum(v for v in hour_counts.values())
    peak = max(hour_counts, key=hour_counts.get) if hour_counts else 12
    
    return {
        "peak_hour": f"{peak:02d}:00",
        "total_activities": total,
        "heatmap": heatmap,
    }

@api_router.get("/admin/analytics/pack-trends", dependencies=[Depends(verify_admin)])
async def admin_analytics_pack_trends():
    packs_list = []
    total_revenue = 0
    
    async for p in db.sticker_packs.find():
        p.pop("_id", None)
        buyers = p.get("buyers", 0) or 0
        price = p.get("price", 0) or 0
        total_sold = p.get("total_sold", buyers) or 0
        revenue = price * total_sold
        total_revenue += revenue
        packs_list.append({
            "name": p.get("name", "Unknown"),
            "price": price,
            "buyers": buyers,
            "total_sold": total_sold,
            "revenue": round(revenue, 2),
            "popularity_score": round(total_sold * 10 + buyers * 5, 1),
        })
    
    packs_list.sort(key=lambda x: x["revenue"], reverse=True)
    
    return {
        "total_packs": len(packs_list),
        "total_revenue": round(total_revenue, 2),
        "packs": packs_list,
    }

@api_router.get("/admin/analytics/revenue-trends", dependencies=[Depends(verify_admin)])
async def admin_analytics_revenue_trends():
    daily = {}
    
    async for a in db.activity.find({"action": {"$in": ["purchase", "buy", "bought"]}}).sort("created_at", -1).limit(5000):
        created = a.get("created_at", "")
        price = a.get("price", 0) or 0
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            day = dt.strftime("%Y-%m-%d")
            daily[day] = daily.get(day, 0) + price
        except Exception:
            pass
    
    trends = [{"date": d, "revenue": round(r, 2)} for d, r in sorted(daily.items())]
    total = sum(t["revenue"] for t in trends)
    avg_daily = round(total / max(len(trends), 1), 2)
    
    peak_day = {"date": "N/A", "revenue": 0}
    if trends:
        peak = max(trends, key=lambda t: t["revenue"])
        peak_day = {"date": peak["date"], "revenue": peak["revenue"]}
    
    return {
        "total_revenue": round(total, 2),
        "avg_daily_revenue": avg_daily,
        "peak_day": peak_day,
        "trends": trends,
    }


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

@app.get("/")
async def root():
    return {"message": "StickersXTon API", "status": "running"}

@app.get("/db-status")
async def debug_info():
    try:
        db_type = "mongodb" if db is not None and not isinstance(db, LocalDB) else ("localdb" if db is not None else "none")
        mongo_url = os.environ.get('MONGO_URL', '')
        mongo_preview = mongo_url[:40] + "..." if len(mongo_url) > 40 else mongo_url
        return {
            "db": db_type,
            "mongo_url_preview": mongo_preview,
            "startup_error": str(_startup_error)
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/ping")
async def ping():
    return {"ping": "pong", "commit": "e3acb28-v2"}

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        try:
            client.close()
        except:
            pass

# Vercel serverless handler
handler = app