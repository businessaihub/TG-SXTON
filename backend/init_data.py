#!/usr/bin/env python3
"""
Initialize sample data for StickersXTon
Run this script to populate the database with sample sticker packs
"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid

# Load environment
load_dotenv(Path(__file__).parent / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

async def init_sample_data():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🚀 Initializing StickersXTon with sample data...")
    
    # Sample sticker packs
    sample_packs = [
        {
            "id": str(uuid.uuid4()),
            "name": "Crypto Punks Collection",
            "description": "Legendary collection of rare crypto-themed stickers",
            "image_url": "https://via.placeholder.com/300x200/667eea/ffffff?text=Crypto+Punks",
            "price": 5.0,
            "price_type": "TON",
            "rarity": "legendary",
            "sticker_count": 10,
            "is_featured": True,
            "is_upcoming": False,
            "burn_enabled": True,
            "burn_reward_points": 500,
            "show_number": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Neon Dreams",
            "description": "Futuristic neon art collection",
            "image_url": "https://via.placeholder.com/300x200/f093fb/ffffff?text=Neon+Dreams",
            "price": 3.5,
            "price_type": "TON",
            "rarity": "epic",
            "sticker_count": 8,
            "is_featured": True,
            "is_upcoming": False,
            "burn_enabled": True,
            "burn_reward_points": 300,
            "show_number": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Space Explorers",
            "description": "Journey through the cosmos",
            "image_url": "https://via.placeholder.com/300x200/4facfe/ffffff?text=Space+Explorers",
            "price": 2.0,
            "price_type": "TON",
            "rarity": "rare",
            "sticker_count": 6,
            "is_featured": False,
            "is_upcoming": False,
            "burn_enabled": False,
            "burn_reward_points": 100,
            "show_number": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pixel Art Masters",
            "description": "Classic 8-bit style artwork",
            "image_url": "https://via.placeholder.com/300x200/00f2fe/ffffff?text=Pixel+Art",
            "price": 1.5,
            "price_type": "TON",
            "rarity": "common",
            "sticker_count": 5,
            "is_featured": False,
            "is_upcoming": False,
            "burn_enabled": False,
            "burn_reward_points": 50,
            "show_number": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Cyberpunk 2077",
            "description": "High-tech low-life aesthetic",
            "image_url": "https://via.placeholder.com/300x200/764ba2/ffffff?text=Cyberpunk",
            "price": 4.0,
            "price_type": "TON",
            "rarity": "epic",
            "sticker_count": 7,
            "is_featured": True,
            "is_upcoming": False,
            "burn_enabled": True,
            "burn_reward_points": 400,
            "show_number": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mystery Box",
            "description": "Coming soon - Stay tuned!",
            "image_url": "https://via.placeholder.com/300x200/667eea/ffffff?text=Mystery+Box",
            "price": 10.0,
            "price_type": "TON",
            "rarity": "legendary",
            "sticker_count": 15,
            "is_featured": False,
            "is_upcoming": True,
            "countdown_date": "2025-02-01T00:00:00Z",
            "burn_enabled": False,
            "burn_reward_points": 1000,
            "show_number": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "TON Ecosystem",
            "description": "Official TON blockchain stickers",
            "image_url": "https://via.placeholder.com/300x200/0088cc/ffffff?text=TON",
            "price": 1000,
            "price_type": "SXTON",
            "rarity": "rare",
            "sticker_count": 8,
            "is_featured": False,
            "is_upcoming": False,
            "burn_enabled": False,
            "burn_reward_points": 0,
            "show_number": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Premium Stars Pack",
            "description": "Exclusive pack available with Telegram Stars",
            "image_url": "https://via.placeholder.com/300x200/ffd700/ffffff?text=Stars+Pack",
            "price": 250,
            "price_type": "STARS",
            "rarity": "epic",
            "sticker_count": 6,
            "is_featured": False,
            "is_upcoming": False,
            "burn_enabled": False,
            "burn_reward_points": 200,
            "show_number": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Clear existing packs
    await db.sticker_packs.delete_many({})
    print("✓ Cleared existing packs")
    
    # Insert sample packs
    if sample_packs:
        await db.sticker_packs.insert_many(sample_packs)
        print(f"✓ Inserted {len(sample_packs)} sample packs")
    
    # Initialize settings
    settings = {
        "id": "global_settings",
        "commission_rate": 2.5,
        "no_commission_mode": False,
        "min_sale_price": 1.0,
        "max_listings_per_collection": 10,
        "points_per_purchase": 500,
        "referral_level1_percent": 50.0,
        "referral_level2_percent": 10.0,
        "spin_price_ton": 1.0,
        "simulation_enabled": False,
        "simulation_daily_volume": 50,
        "simulation_min_volume_ton": 500.0,
        "hot_mode": "manual",
        "hot_collections": [sample_packs[0]["id"], sample_packs[1]["id"], sample_packs[4]["id"]],
        "external_sources_enabled": {"mrkt": True, "igloo": True, "palace": True}
    }
    
    await db.settings.delete_many({})
    await db.settings.insert_one(settings)
    print("✓ Initialized settings")
    
    # Generate some sample activity
    sample_activities = []
    for i in range(20):
        pack = sample_packs[i % len(sample_packs)]
        activity = {
            "id": str(uuid.uuid4()),
            "pack_name": pack["name"],
            "action": ["bought", "opened", "listed"][i % 3],
            "price": pack["price"],
            "price_type": pack["price_type"],
            "is_free": False,
            "is_simulation": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        sample_activities.append(activity)
    
    await db.activity.delete_many({})
    await db.activity.insert_many(sample_activities)
    print(f"✓ Generated {len(sample_activities)} sample activities")
    
    print("\n✨ Sample data initialization complete!")
    print("\n📊 Summary:")
    print(f"  - {len(sample_packs)} sticker packs")
    print(f"  - {len(sample_activities)} activity events")
    print(f"  - Settings configured")
    print("\n🎯 Next steps:")
    print("  1. Visit http://localhost:3000 to see the Mini App")
    print("  2. Login to admin at http://localhost:3000/admin/login")
    print("     Username: admin")
    print("     Password: admin123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_sample_data())