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
    global db, client
    mongo_url = os.environ.get('MONGO_URL', '')
    if mongo_url and mongo_url.startswith('mongodb'):
        try:
            client = AsyncIOMotorClient(mongo_url)
            await asyncio.wait_for(client.admin.command('ping'), timeout=5.0)
            db_name = os.environ.get('DB_NAME', 'tg_sxton')
            db = client[db_name]
            print(f'Connected to MongoDB Atlas (db: {db_name})')
        except Exception as e:
            print('MongoDB not available, falling back to local file store:', e)
            db = LocalDB()
    else:
        print('No MONGO_URL set, using local file store')
        db = LocalDB()


app = FastAPI()
api_router = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup_checks():
    await _init_db_on_startup()
    # Ensure all collections have indices for better performance
    if not isinstance(db, LocalDB):
        try:
            await db.users.create_index("id")
            await db.sticker_packs.create_index("id")
            await db.stickers.create_index("id")
            await db.activity.create_index("created_at", direction=-1)
            await db.banner_ads.create_index("position")
            await db.quests.create_index("id")
            await db.quests.create_index("is_active")
            await db.user_quest_progress.create_index("user_id")
            await db.user_quest_progress.create_index([("user_id", 1), ("quest_id", 1)])
            print("✓ Database indices created")
        except Exception as e:
            print(f"Warning: Could not create indices: {e}")


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
    bomb_expiration_hours: int = 24
    raid_entry_cost_ton: float = 0.1
    raid_max_players: int = 10
    puzzle_fragment_cost_ton: float = 0.0
    puzzle_fragment_drop_chance: float = 0.3
    puzzle_fragments_needed: int = 4
    puzzle_reward_sticker_pack_id: Optional[str] = None
    puzzle_reward_points: float = 200.0
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
    
    # Determine quantity to buy (default: entire pack)
    total_in_pack = pack.get("sticker_count", 0)
    qty = quantity if quantity is not None else total_in_pack
    if qty <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be >= 1")

    # Calculate total price
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
    """Return stickers owned by a user with rarity and pack info."""
    stickers = await db.stickers.find({"owner_id": user_id}, {"_id": 0}).to_list(None)
    result = []
    for s in stickers:
        pack = await db.sticker_packs.find_one({"id": s.get("pack_id")}, {"_id": 0})
        # Use stored rarity from sticker document
        rarity = s.get("rarity", "Common")
        result.append({
            "id": s.get("id"),
            "pack_id": s.get("pack_id"),
            "pack_name": pack.get("name") if pack else None,
            "sticker_number": s.get("sticker_number") or s.get("position"),
            "rarity": rarity,
            "image_url": s.get("image_url")
        })
    # sort by pack_name then sticker_number
    result.sort(key=lambda x: (x.get("pack_name") or "", x.get("sticker_number") or 0))
    return result

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
    
    settings = await db.game_settings.find_one({"id": "game_settings"})
    if not settings:
        # Return defaults
        settings = {
            "id": "game_settings",
            "theft_cost_ton": 0.2,
            "theft_cooldown_hours": 6,
            "bomb_expiration_hours": 24,
            "raid_entry_cost_ton": 0.1,
            "raid_max_players": 10,
            "puzzle_fragment_cost_ton": 0.0,
            "puzzle_fragment_drop_chance": 0.3,
            "puzzle_fragments_needed": 4,
            "puzzle_reward_sticker_pack_id": None,
            "puzzle_reward_points": 200.0
        }
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

# ============ STICKER THEFT GAME ============
@api_router.post("/game/theft/cooldown-check")
async def check_theft_cooldown(user_id: str):
    user = await db.users.find_one({"telegram_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    last_theft = user.get("last_theft_time")
    if not last_theft:
        return {"has_cooldown": False, "remaining_hours": 0}
    
    elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(last_theft)).total_seconds() / 3600
    remaining = max(0, 6 - elapsed)
    return {"has_cooldown": remaining > 0, "remaining_hours": remaining}

@api_router.post("/game/theft/attempt")
async def attempt_theft(user_id: str, target_id: str):
    user = await db.users.find_one({"telegram_id": user_id})
    target = await db.users.find_one({"telegram_id": target_id})
    if not user or not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    last_theft = user.get("last_theft_time")
    if last_theft:
        elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(last_theft)).total_seconds() / 3600
        if elapsed < 6:
            return {"success": False, "message": f"Cooldown active for {6-elapsed:.1f} hours"}
    
    balance = user.get("ton_balance", 0)
    if balance < 0.2:
        return {"success": False, "message": "Insufficient balance (0.2 TON required)"}
    
    rand = random.random()
    if rand < 0.7:
        result = "fail"
        stolen = None
    elif rand < 0.95:
        result = "common"
        stolen = "Common Sticker"
    else:
        result = "rare"
        stolen = "Rare Sticker"
    
    await db.users.update_one({"telegram_id": user_id}, {
        "$set": {"last_theft_time": datetime.now(timezone.utc).isoformat()},
        "$inc": {"ton_balance": -0.2}
    })
    
    return {"success": result != "fail", "result": result, "stolen_sticker": stolen}

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
    raids = await db.raids.find({"status": "active"}).to_list(100)
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
    
    winner_id = random.choice(raid.get("participants", [None]))[0] if raid.get("participants") else None
    await db.raids.update_one({"id": raid_id}, {
        "$set": {"status": "finished", "winner_id": winner_id}
    })
    
    if winner_id:
        await db.stickers.insert_one({"user_id": winner_id, "rarity": "Epic"})
    
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

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        try:
            client.close()
        except:
            pass

# Vercel serverless handler
handler = app