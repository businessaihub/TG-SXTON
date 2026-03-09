import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson.objectid import ObjectId
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
load_dotenv(Path(__file__).parent / 'backend' / '.env')

async def create_sample_data():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/tg_sxton')
    db_name = os.environ.get('MONGO_DB', 'tg_sxton')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Create sample sticker packs
    packs = [
        {"_id": ObjectId(), "name": "Основна колекція", "description": "Базові стікери для гри", "active": True},
        {"_id": ObjectId(), "name": "Премія пакет", "description": "Рідкісні стікери", "active": True},
        {"_id": ObjectId(), "name": "Епічна колекція", "description": "Тільки епічні та легендарні", "active": True}
    ]
    
    # Create sample promo codes
    promos = [
        {"_id": ObjectId(), "code": "WELCOME100", "bonus_type": "sxton", "bonus_value": 100, "active": True},
        {"_id": ObjectId(), "code": "DISCOUNT20", "bonus_type": "discount", "bonus_value": 20, "active": True},
        {"_id": ObjectId(), "code": "FREEPACK", "bonus_type": "sticker", "bonus_value": 1, "active": True},
        {"_id": ObjectId(), "code": "LUCKY50", "bonus_type": "sxton", "bonus_value": 50, "active": True}
    ]
    
    await db['sticker_packs'].insert_many(packs)
    await db['promo_codes'].insert_many(promos)
    
    print(f"✅ Created {len(packs)} sticker packs")
    print(f"✅ Created {len(promos)} promo codes")

if __name__ == "__main__":
    asyncio.run(create_sample_data())
