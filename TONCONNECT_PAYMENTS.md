# 🎨 Реальні Платежі TON - Інструкція для користувачів

## Огляд

StickersXTon тепер підтримує **реальні платежі через TonConnect** - користувачі можуть купувати стікери безпосередньо зі свого TON гаманця Tonkeeper, MyTonWallet або іншої підтримуваної гаманця!

## 📋 Як працюють платежі

### Схема потоку:

```
Користувач натискає "Buy" 
    ↓
Перевірка: Гаманець підключений?
    ↓ ❌ Ні → Запит на підключення гаманця
    ↓ ✅ Так
Створення транзакції TON:
    - Сума: precio паку × 10^9 (nanoTON)
    - Отримувач: Admin Wallet
    - Коментар: "pack:{packId}:{userId}"
    ↓
Користувач підтверджує в гамані
    ↓
Транзакція записується в блокчейн
    ↓
Backend отримує hash і видає стікери
    ↓
Статус: ✅ Куплено!
```

## 🔧 Технічні деталі

### Frontend (React)

**Файли:**
- `src/context/TonConnectContext.js` - Контекст для керування TonConnect
- `src/components/Marketplace.js` - Оновлений з кнопками реальних платежів

**Бібліотеки:**
```json
{
  "@tonconnect/ui": "^latest",
  "@tonconnect/protocol": "^latest",
  "ton": "^latest",
  "tonweb": "^latest"
}
```

**Manifest файл:**
```json
// public/tonconnect-manifest.json
{
  "url": "https://stickerxton.com",
  "name": "StickersXTon",
  "iconUrl": "https://stickerxton.com/logo.png",
  "termsOfUseUrl": "https://stickerxton.com/terms",
  "privacyPolicyUrl": "https://stickerxton.com/privacy"
}
```

### Backend (FastAPI)

**Endpoint:** `POST /api/buy/pack`

**Параметри:**
```python
{
    "user_id": "telegram_id",
    "pack_id": "pack_unique_id",
    "payment_type": "TON",  # або "STARS", "SXTON"
    "transaction_hash": "blockchain_hash",  # Для реальних платежів
    "quantity": 1  # Опціонально
}
```

**Логіка:**
1. Якщо `transaction_hash` передано → Перевіряємо на блокчейні (TODO: інтеграція)
2. Якщо `transaction_hash` відсутній → Перевіряємо баланс в системі (legacy)
3. Вичитаємо вартість паку
4. Видаємо стікери користувачу
5. Нараховуємо SXTON очки (500 per стікер)
6. Фіксуємо реферальні бонуси

## 🎯 Інтеграція TonConnect

### Ініціалізація:

```jsx
// App.js
import { TonConnectProvider } from "./context/TonConnectContext";

<TonConnectProvider>
  <BrowserRouter>
    {/* Your routes */}
  </BrowserRouter>
</TonConnectProvider>
```

### Використання у компоненті:

```jsx
import { useTonConnect } from "../context/TonConnectContext";

function Marketplace() {
  const { wallet, connectWallet, sendTransaction, isConnected } = useTonConnect();
  
  const handleBuy = async (pack) => {
    // Перевірити гаманець
    if (!wallet) {
      await connectWallet();
      return;
    }
    
    // Створити транзакцію
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [{
        address: adminWalletAddress,
        amount: String(pack.price * 1e9),
        payload: btoa(`pack:${pack.id}:${user.id}`)
      }]
    };
    
    // Надіслати
    const result = await sendTransaction(transaction);
    
    // Повідомити backend
    await axios.post(`${API}/buy/pack`, {
      user_id: user.id,
      pack_id: pack.id,
      payment_type: "TON",
      transaction_hash: result.boc
    });
  };
}
```

## 💰 Конфігурація Гаманця

**Переменні оточення:**

```bash
# frontend/.env
REACT_APP_ADMIN_WALLET=EQDrzVBj0qF2cBkuGyy0D-ChwQJpIcqLkf5_DvyXqgOTMwt8

# backend/.env
ADMIN_TON_WALLET=EQDrzVBj0qF2cBkuGyy0D-ChwQJpIcqLkf5_DvyXqgOTMwt8
```

**Заміна адреси:**
1. Відкрийте Tonkeeper/MyTonWallet
2. Скопіюйте вашу адресу гаманця
3. Вставте в `.env` файлах
4. Перезапустіть контейнери: `docker-compose restart`

## 🧪 Тестування

### Локальне тестування:

1. **Включити localhost в TonConnect manifest:**
   ```json
   {
     "url": "http://localhost:3000"
   }
   ```

2. **Встановити Tonkeeper на Android:**
   - Скачати Tonkeeper
   - Включити testnet mode
   - Отримати test TON з faucet

3. **Клікнути "Connect Wallet" у Marketplace:**
   - Мобільний браузер відкриє Tonkeeper
   - Схвалити підключення
   - Повернутися в app

4. **Клікнути "Buy" на паку:**
   - Tonkeeper запитає підтвердження
   - Підтвердити платіж
   - App покаже "Processing..."
   - Після 5-10 секунд - сторінка перезавантажиться зі стікерами

## ⚠️ Обмеження і TODO

### Поточні обмеження:
- ✅ Підтримуються кожні гаманці TonConnect (Tonkeeper, MyTonWallet, Ledger)
- ❌ Верифікація на блокчейні зараз просто довіряємо TonConnect
- ❌ Нема fallback механізму для помилок сіті
- ❌ Конвертація цін TON ↔ USD не має

### Майбутні покращення:

1. **Верифікація блокчейну:**
   ```python
   # backend/server.py - TODO
   async def verify_ton_transaction(tx_hash: str, expected_amount: int, recipient: str):
       """Verify transaction on TON blockchain using TonCenter API"""
       # Перевірити tx_hash існує
       # Перевірити сума збігається
       # Перевірити отримувач - наш admin wallet
   ```

2. **Динамічні курси:**
   ```python
   async def get_ton_price_usd():
       """Fetch TON/USD rate from CoinGecko API"""
       # Динамічна конвертація цін
   ```

3. **Обробка помилок:**
   - Retry логіка для помилок сіті
   - Refund механізм для невдалих транзакцій
   - Reconciliation між blockchain та DB

## 📞 Підтримка

**Гаманці:**
- Tonkeeper: https://tonkeeper.com
- MyTonWallet: https://mytonwallet.io
- TonHub: https://tonhub.com

**Ресурси:**
- TonConnect документація: https://docs.ton.org/develop/dapps/ton-connect/
- TON Blockchain API: https://toncenter.com

## 🔐 Безпека

### Рекомендації:

1. **Admin Wallet:**
   - Використовуйте безпечний гаманець (не hot wallet для великих сум)
   - Регулярно переводьте кошти на холодне сховище
   - Логуйте всі транзакції

2. **Validation:**
   - Завжди перевіряйте `amount` на backend
   - Перевіряйте `recipient` адресу
   - Логуйте усі успішні/невдалі покупки

3. **Rate Limiting:**
   - Обмежте кількість покупок за период
   - Запобігайте DDoS на `/buy/pack` endpoint

```python
# TODO: Додати rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@api_router.post("/buy/pack")
@limiter.limit("5/minute")  # 5 покупок на хвилину
async def buy_pack(...):
    ...
```

## 📊 Моніторинг

**Що треба відслідковувати:**
- Успішні платежі vs невдалі
- Середня сума платежу
- Найпопулярніші паки
- Часові паттерни покупок

```python
# Аналітика в backend
await db.transactions.insert_one({
    "user_id": user_id,
    "pack_id": pack_id,
    "amount": total_price,
    "currency": "TON",
    "status": "success",
    "tx_hash": transaction_hash,
    "timestamp": datetime.utcnow(),
    "wallet_address": wallet.account.address
})
```

---

**Версія:** 1.0  
**Створено:** 2025-12-17  
**Автор:** StickersXTon Team
