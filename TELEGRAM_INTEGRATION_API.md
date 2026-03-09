# Telegram WebApp Integration Guide

## Основні API Методи, Які Вже Реалізовані

### 1. Ініціалізація
```javascript
// Цей код вже запущений в App.js
const tg = window.Telegram.WebApp;

// Готовий до дії
tg.ready();

// Розширити додаток на весь екран
tg.expand();
```

### 2. Стилізація
```javascript
// Встановити колір інтерфейсу
tg.setHeaderColor("#1e1e2e");      // Колір header
tg.setBackgroundColor("#0f0f1a");   // Фоновий колір
```

### 3. Viewport Моніторинг
```javascript
// Отримати інформацію про viewport
console.log(tg.viewportHeight);      // Поточна висота
console.log(tg.viewportStableHeight); // Стабільна висота (без keyboard)

// Прослухати зміни
window.addEventListener('resize', () => {
  console.log('Viewport змінився:', tg.viewportHeight);
});
```

## Рекомендовані Налаштування для Вашого Додатку

### CSS Viewport Fix

**Уже включено в App.css:**
```css
html, body, #root {
  width: 100%;
  height: 100%;
  padding: env(safe-area-inset-*);  /* Для notched пристроїв */
  overflow: hidden;                  /* Не дозволяти прокручування */
}

body {
  position: fixed;                   /* Запобігти прокручуванню */
}
```

### HTML Viewport Meta Tag

**Уже оновлено в index.html:**
```html
<meta name="viewport" content="
  width=device-width,
  initial-scale=1,
  viewport-fit=cover,                <!-- Для notched phones -->
  user-scalable=no                   <!-- Не дозволяти масштабування -->
" />
```

## API Методи Для Майбутнього Розширення

### Натискання Кнопки (Back Button)
```javascript
if (tg.BackButton) {
  tg.BackButton.show();
  tg.BackButton.onClick(() => {
    // Назад на попередню екран
    navigate(-1);
  });
}
```

### Поточний Користувач
```javascript
if (tg.initDataUnsafe?.user) {
  const user = tg.initDataUnsafe.user;
  console.log({
    id: user.id,
    first_name: user.first_name,
    username: user.username,
    photo_url: user.photo_url
  });
}
```

### Контакт При Закритті
```javascript
tg.onEvent('mainButtonClicked', () => {
  console.log('Користувач натиснув основну кнопку');
  // Відправити дані на сервер
});
```

### Запис Даних
```javascript
// Зберегти дані користувача
tg.sendData(JSON.stringify({
  action: 'save',
  data: { /* дані */ }
}));
```

## Перевірка Telegram SDK у Браузері

### Колда Telegram Недоступна (для локального тестування)

Код в App.js автоматично обробляє відсутність Telegram:

```javascript
if (typeof window !== "undefined" && window.Telegram?.WebApp) {
  // Telegram доступна
  tg.ready();
} else {
  // Локальне тестування або звичайний браузер
  console.log("Telegram WebApp SDK не доступна");
}
```

### Mock Telegram для Тестування

Якщо потрібен mock:
```javascript
// Виконати у консолі браузера
window.Telegram = {
  WebApp: {
    ready: () => console.log('TG ready'),
    expand: () => console.log('TG expanded'),
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight - 50,
    setHeaderColor: () => {},
    setBackgroundColor: () => {}
  }
};
```

## Тестування на Реальному Пристрої

### 1. Через Telegram Bot
```
1. Створити бот через @BotFather
2. Додати команду /mini
3. Встановити WebApp URL
4. Тестування на мобільному Telegram
```

### 2. Через Telegram Developer
```
1. Встановити Telegram Desktop
2. Авторизуватися як розробник (Settings → API)
3. Додати Mini App URL
4. Тестування в Desktop додатку
```

## Перевірка Viewport у Консолі

```javascript
// Повна інформація про viewport
{
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  outerWidth: window.outerWidth,
  outerHeight: window.outerHeight,
  visualViewport: {
    width: window.visualViewport?.width,
    height: window.visualViewport?.height,
    scale: window.visualViewport?.scale,
    offsetTop: window.visualViewport?.offsetTop,
    offsetLeft: window.visualViewport?.offsetLeft
  },
  telegram: {
    viewportHeight: window.Telegram?.WebApp?.viewportHeight,
    viewportStableHeight: window.Telegram?.WebApp?.viewportStableHeight
  },
  devicePixelRatio: window.devicePixelRatio,
  screenDimensions: {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight
  }
}
```

## Порідок Діагностики Проблем

### 1. Перевірити, чи Telegram SDK завантажена
```javascript
console.log(window.Telegram); // Повинна бути об'єкт
```

### 2. Перевірити ViewportHeight
```javascript
console.log(window.Telegram?.WebApp?.viewportHeight);
// Повинна бути число > 0
```

### 3. Перевірити Safe Area Insets
```javascript
const root = document.documentElement;
console.log({
  top: getComputedStyle(root).getPropertyValue('--safe-area-inset-top'),
  bottom: getComputedStyle(root).getPropertyValue('--safe-area-inset-bottom'),
  left: getComputedStyle(root).getPropertyValue('--safe-area-inset-left'),
  right: getComputedStyle(root).getPropertyValue('--safe-area-inset-right')
});
```

### 4. Перевірити Overflow
```javascript
console.log({
  appOverflow: getComputedStyle(document.querySelector('.App')).overflow,
  bodyOverflow: getComputedStyle(document.body).overflow,
  htmlOverflow: getComputedStyle(document.documentElement).overflow
});
```

## Бест Практики

✅ **Робити:**
- Тестувати на мобільних розмірах (320-430px)
- Використовувати `%` замість `px` для контейнерів
- Зниження padding/margin на мобілях
- Перевіряти safe areas на notched пристроях
- Зберегти padding знизу для Bottom Navigation

❌ **Не робити:**
- Використовувати `100vh` (використовувати `100%`)
- Встановлювати фіксовану висоту на контейнерах
- Дозволяти горизонтальне прокручування
- Помішати вміст під keyboard
- Використовувати position: sticky без padding-bottom

## Посилання

- [Telegram WebApp API](https://core.telegram.org/bots/webapps/api)
- [Посібник по розробці](https://core.telegram.org/bots/webapps)
- [MDN Viewport](https://developer.mozilla.org/en-US/docs/Glossary/Viewport)
- [Safe Area Guide](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
