# StickersXTon - Telegram Mini App

A comprehensive Telegram Mini App for sticker marketplace with admin dashboard.

## Features

### User Mini App
- **Marketplace**: Browse and purchase sticker packs (TON, Stars, SXTON)
- **Activity Feed**: Real-time marketplace activity with filters
- **Hot Collections**: Top 5 trending collections
- **Profile**: Wallet management, balances, referrals, history
- **Roulette**: Spin to win random packs with animated effects
- **Multi-language**: 10 languages supported (EN, TR, ZH, RU, AR, KO, JA, DE, FR, TH)

### Admin Dashboard
- **Analytics**: Users, packs, transactions, volume metrics
- **Pack Management**: Create/edit/delete packs with full configuration
- **Settings**: Commission, rewards, referral, roulette settings
- **Activity Simulation**: Generate test activity data

## Tech Stack
- **Backend**: Python FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Styling**: Dark glassmorphism theme with neon accents

## Environment Variables

### Backend (.env)
```env
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="stickersxton_db"
CORS_ORIGINS="*"

# Admin Credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
ADMIN_TON_WALLET=""

# Telegram Bot (placeholder for now)
TELEGRAM_BOT_TOKEN="placeholder_bot_token"
ADMIN_ID="placeholder_admin_id"

# TON API (placeholder for now)
TON_API_KEY="placeholder_ton_api_key"
TONCENTER_API_KEY="placeholder_toncenter_key"

# Settings
COMMISSION_DEFAULT="2.5"
EXTERNAL_FEED_CONFIG="{}"
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://your-domain.com
```

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB
- Yarn package manager

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
yarn install
```

### Running Locally

The application is configured to run with supervisor. Services are automatically managed.

**To restart services:**
```bash
# Restart backend
sudo supervisorctl restart backend

# Restart frontend
sudo supervisorctl restart frontend
```

**View logs:**
```bash
# Backend logs
tail -f /var/log/supervisor/backend.*.log

# Frontend logs
tail -f /var/log/supervisor/frontend.*.log
```

## API Endpoints

### User Endpoints
- `POST /api/auth/telegram` - Authenticate via Telegram
- `GET /api/user/{user_id}` - Get user details
- `POST /api/wallet/connect` - Connect TON wallet
- `GET /api/packs` - Get sticker packs
- `POST /api/buy/pack` - Purchase pack
- `POST /api/sell/sticker` - List sticker for sale
- `POST /api/burn/sticker` - Burn sticker for points
- `POST /api/spin` - Spin roulette
- `GET /api/activity` - Get activity feed
- `GET /api/hot` - Get hot collections

### Admin Endpoints (require authentication)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/analytics` - Get analytics
- `POST /api/admin/packs` - Create pack
- `PUT /api/admin/packs/{id}` - Update pack
- `DELETE /api/admin/packs/{id}` - Delete pack
- `GET /api/admin/settings` - Get settings
- `PUT /api/admin/settings` - Update settings
- `POST /api/admin/simulate-activity` - Simulate activity

## Default Credentials

### Admin Dashboard
- **URL**: `http://localhost:3000/admin/login`
- **Username**: `admin`
- **Password**: `admin123`

## Project Structure

```
/app/
├── backend/
│   ├── server.py          # FastAPI application
│   ├── .env               # Backend environment variables
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/         # Main pages (MiniApp, Admin)
│   │   ├── components/    # React components
│   │   └── utils/         # Utilities (translations)
│   ├── package.json       # Node dependencies
│   └── .env               # Frontend environment variables
└── README.md
```

## Features Implementation Status

✅ Marketplace with glassmorphism cards
✅ Activity feed with auto-refresh
✅ Hot collections (top 5)
✅ Profile with wallet connect (mock)
✅ Roulette with animation
✅ Multi-language support (10 languages)
✅ Admin dashboard with analytics
✅ Pack management (CRUD)
✅ Settings panel
✅ Activity simulation
✅ Burn system
✅ Referral system (2-level)
✅ Commission system
✅ Points & rewards

## Mock Integrations

The following are currently mocked for MVP:
- TonConnect wallet integration (returns mock addresses)
- External sticker sources (mrkt, IGLOO, PalaceNFT)
- Telegram Bot API integration
- TON blockchain transactions

To integrate real services:
1. Update `.env` files with real API keys
2. Replace mock functions in `server.py` with actual API calls
3. Implement TonConnect SDK in frontend

## Deployment Notes

### Environment URLs
- Backend runs on port 8001 (mapped via supervisor)
- Frontend runs on port 3000
- All API routes must be prefixed with `/api`

### Production Checklist
- [ ] Add real Telegram Bot Token
- [ ] Add real TON API keys
- [ ] Configure admin wallet address
- [ ] Set up TonConnect integration
- [ ] Configure external sticker sources
- [ ] Set up proper authentication
- [ ] Configure CORS for production domain

## Support

For issues or questions, please refer to the project documentation or contact the development team.

## License

MIT License - See LICENSE file for details.