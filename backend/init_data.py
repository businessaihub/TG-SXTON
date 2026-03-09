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
from datetime import datetime, timezone, timedelta
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
    
    # Create test stickers with purchase history for Hold Boost demo
    from datetime import timedelta
    test_user_id = "demo_user_001"  # Match with the demo user created in frontend
    test_stickers = []
    
    # Create stickers for first pack (10 days old)
    for i, pack in enumerate(sample_packs[:2]):
        for sticker_num in range(1, 5):  # 4 stickers per pack
            test_stickers.append({
                "id": str(uuid.uuid4()),
                "pack_id": pack["id"],
                "sticker_number": sticker_num,
                "position": sticker_num,
                "rarity": ["Common", "Rare", "Epic", "Legendary"][sticker_num % 4],
                "image_url": f"https://via.placeholder.com/200x200/667eea/ffffff?text=Sticker+{sticker_num}",
                "owner_id": test_user_id,
                "is_listed": False,
                "price": 0,
                # 10 days old - not yet eligible for boost
                "purchase_timestamp": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
                "verified_holder": False,
                "hold_multiplier_applied": 1.0,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # Create stickers for second pack (35 days old)
    for i, pack in enumerate(sample_packs[1:2]):
        for sticker_num in range(1, 5):  # 4 stickers per pack
            test_stickers.append({
                "id": str(uuid.uuid4()),
                "pack_id": pack["id"],
                "sticker_number": sticker_num,
                "position": sticker_num,
                "rarity": ["Common", "Rare", "Epic", "Legendary"][sticker_num % 4],
                "image_url": f"https://via.placeholder.com/200x200/667eea/ffffff?text=Sticker+{sticker_num}",
                "owner_id": test_user_id,
                "is_listed": False,
                "price": 0,
                # 35 days old - ELIGIBLE for 5% boost!
                "purchase_timestamp": (datetime.now(timezone.utc) - timedelta(days=35)).isoformat(),
                "verified_holder": True,
                "hold_multiplier_applied": 1.05,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    if test_stickers:
        await db.stickers.delete_many({})
        await db.stickers.insert_many(test_stickers)
        print(f"✓ Created {len(test_stickers)} test stickers for hold boost demo")
        print(f"  - Test user ID: {test_user_id}")
        print(f"  - 4 stickers: 10 days (not boosted)")
        print(f"  - 4 stickers: 35 days (BOOSTED +5%)")
    
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
    
    # Sample quests
    sample_quests = [
        {
            "id": str(uuid.uuid4()),
            "title": "Join Our Telegram",
            "description": "Follow our main channel for latest updates",
            "quest_type": "join_chat",
            "target_url": "https://t.me/StickersXTon",
            "reward_type": "SXTON",
            "reward_amount": 50.5,
            "is_active": True,
            "is_daily": False,
            "required_referrals": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Visit Our Website",
            "description": "Check out our official website",
            "quest_type": "link",
            "target_url": "https://stickerxton.com",
            "reward_type": "SXTON",
            "reward_amount": 75.0,
            "is_active": True,
            "is_daily": False,
            "required_referrals": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Invite 3 Friends",
            "description": "Earn rewards by inviting your friends to StickersXTon",
            "quest_type": "referral",
            "reward_type": "SXTON",
            "reward_amount": 150.75,
            "is_active": True,
            "is_daily": False,
            "required_referrals": 3,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Daily Login Bonus",
            "description": "Login every day to earn bonus SXTON",
            "quest_type": "link",
            "target_url": "",
            "reward_type": "SXTON",
            "reward_amount": 25.5,
            "is_active": True,
            "is_daily": True,
            "required_referrals": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.quests.delete_many({})
    await db.quests.insert_many(sample_quests)
    print(f"✓ Created {len(sample_quests)} sample quests")
    
    # Sample system logs
    from datetime import timedelta
    sample_logs = [
        {
            "id": str(uuid.uuid4()),
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
            "level": "info",
            "message": "User logged in",
            "source": "backend",
            "metadata": {"user_id": "user_123", "ip": "192.168.1.1"}
        },
        {
            "id": str(uuid.uuid4()),
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=4)).isoformat(),
            "level": "info",
            "message": "Pack purchased",
            "source": "backend",
            "metadata": {"user_id": "user_456", "pack_id": "pack_001", "amount": 5.0}
        },
        {
            "id": str(uuid.uuid4()),
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=3)).isoformat(),
            "level": "warning",
            "message": "Failed wallet connection",
            "source": "frontend",
            "metadata": {"user_id": "user_789", "error": "Invalid address"}
        },
        {
            "id": str(uuid.uuid4()),
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat(),
            "level": "info",
            "message": "Sticker listed for sale",
            "source": "backend",
            "metadata": {"user_id": "user_123", "sticker_id": "sticker_042", "price": 2.5}
        },
        {
            "id": str(uuid.uuid4()),
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(),
            "level": "error",
            "message": "Database connection timeout",
            "source": "backend",
            "metadata": {"error": "Connection timeout after 30s", "retries": 3}
        }
    ]
    
    await db.system_logs.delete_many({})
    await db.system_logs.insert_many(sample_logs)
    print(f"✓ Created {len(sample_logs)} sample system logs")
    
    print("\n✨ Sample data initialization complete!")
    print("\n📊 Summary:")
    print(f"  - {len(sample_packs)} sticker packs")
    print(f"  - {len(sample_activities)} activity events")
    print(f"  - {len(sample_quests)} quests")
    print(f"  - {len(sample_logs)} system logs")
    print(f"  - Settings configured")
    print("\n🎯 Next steps:")
    print("  1. Visit http://localhost:3000 to see the Mini App")
    print("  2. Login to admin at http://localhost:3000/admin/login")
    print("     Username: admin")
    print("     Password: admin123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_sample_data())