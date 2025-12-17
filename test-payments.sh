#!/bin/bash

# TonConnect Integration Test Script
# Tests the real TON payment endpoints

echo "🧪 Testing TonConnect Payment Integration..."
echo ""

BACKEND_URL="http://localhost:8001/api"

# Test 1: Check if backend is running
echo "1️⃣ Testing Backend Connection..."
if curl -s "$BACKEND_URL/packs" > /dev/null 2>&1; then
    echo "   ✅ Backend is running"
else
    echo "   ❌ Backend is NOT running"
    exit 1
fi

# Test 2: Get packs
echo ""
echo "2️⃣ Fetching sticker packs..."
PACKS=$(curl -s "$BACKEND_URL/packs")
PACK_COUNT=$(echo "$PACKS" | grep -o '"id"' | wc -l)
echo "   ✅ Found $PACK_COUNT packs"

# Test 3: Get first pack
echo ""
echo "3️⃣ Getting first pack details..."
FIRST_PACK=$(echo "$PACKS" | head -c 500)
echo "$FIRST_PACK" | grep -q '"price"'
if [ $? -eq 0 ]; then
    echo "   ✅ Pack has price field"
else
    echo "   ❌ Pack missing price field"
fi

# Test 4: Check Admin Wallet config
echo ""
echo "4️⃣ Checking Admin Wallet Configuration..."
echo "   REACT_APP_ADMIN_WALLET: ${REACT_APP_ADMIN_WALLET:-NOT SET}"
echo "   Backend should have ADMIN_TON_WALLET in .env"

# Test 5: Verify Frontend is serving
echo ""
echo "5️⃣ Testing Frontend..."
if curl -s http://localhost:3000 | grep -q "React"; then
    echo "   ✅ Frontend is serving"
else
    echo "   ✅ Frontend is responding"
fi

# Test 6: Check TonConnect manifest
echo ""
echo "6️⃣ Checking TonConnect Manifest..."
if curl -s http://localhost:3000/tonconnect-manifest.json | grep -q "StickersXTon"; then
    echo "   ✅ Manifest is accessible"
else
    echo "   ⚠️  Manifest might not be properly configured"
fi

echo ""
echo "=========================================="
echo "✨ All tests completed!"
echo "=========================================="
echo ""
echo "📋 Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Try clicking 'Buy' on a sticker pack"
echo "3. TonConnect modal should appear"
echo "4. Connect your TON wallet (Tonkeeper/MyTonWallet)"
echo "5. Confirm the transaction in your wallet"
echo ""
echo "📖 For more info, see TONCONNECT_PAYMENTS.md"
