# Telegram Mini App Viewport Testing Guide

Забезпечення правильного відображення вашого веб-додатку в Telegram Mini App (WebApp).

## 1. Віртуальні Viewport Налаштування для Розробки

### 1.1 Chrome DevTools Mobile Emulation

**Кроки:**
1. Відкрити DevTools (`F12` або `Ctrl+Shift+I`)
2. Натиснути `Ctrl+Shift+M` для мобільного режиму
3. Обрати один з предустановленних пристроїв:
   - **iPhone 12/13/14** (390x844) - популярна ширина
   - **iPhone 15 Pro Max** (430x932) - більша ширина
   - **Pixel 7** (412x915) - Android пристрій
   - **Galaxy S21** (360x800) - менша ширина

### 1.2 Користувацькі Розміри

Для максимальної точності встановити пристрій на мобільний та змінити розміри:

```
DevTools → Device Toolbar → Custom Size
Рекомендовані розміри Telegram Mini App:
- Width: 320px (мінімум)
- Width: 360px (звичайний)
- Width: 390px (iPhone)
- Width: 412px (Android)
- Width: 430px (рідкий)

Height: залежить від віртуальної键board (от 600px до 900px)
```

### 1.3 Viewport Налаштування в DevTools

```
DevTools → Settings (⚙️) → Devices →
Додати новий пристрій з параметрами:
- Device name: "Telegram Mini App Mobile"
- Width: 390
- Height: 844 (або 800)
- Device pixel ratio: 3
- User agent: (залишити мобільний)
```

## 2. Локальне Тестування в Браузері

### 2.1 Базове Тестування

**Відкрити веб-додаток у браузері:**
```
http://localhost:3000
```

**Перевірити:**
- ✅ Не має горизонтального прокручування
- ✅ Всі элементи мають видимість
- ✅ Кнопки та інтерактивні елементи доступні
- ✅ Модальні вікна не виходять за межи екрана
- ✅ Текст читьо / не обрізаний

### 2.2 Включити Debug Режим Viewport

**В браузері натиснути:** `Ctrl+D`

З'явиться лічільник в лівому верхньому куті з інформацією:
```
Viewport Debug
W: 390 | H: 844
DPR: 3
TG: 844px (stable: 844)
SafeTop: 0, Bottom: 0
Ctrl+D to toggle - натисніть ще раз щоб відключити
```

Це показує:
- **W/H**: Поточні розміри вікна
- **DPR**: (Device Pixel Ratio) - масштаб екрану
- **TG**: Висота viewport Telegram
- **Safe**: Область за межами viewport (notch, keyboard)

### 2.3 Тестування Ґенерування Клавіатури

**Симулювати появу віртуальної клавіатури:**
1. В DevTools → Mobile throttling підібрати меньший height
2. Або фокус на input field у переносному пристрої

**Перевірити:**
- ✅ Контент не прихований за клавіатурою
- ✅ Input поля залишаються видимими
- ✅ Кнопки "Відправити" доступні

## 3. Safe Areas (для Notched Пристроїв)

### 3.1 Що Це Таке?

Safe area - це область екрана, яка **гарантовно видима** без перекриття камерою, хаком тощо.

### 3.2 CSS Підтримка (уже реалізовано)

```css
/* Автоматично обробляється в App.css */
html, body, #root {
  padding-top: max(0px, env(safe-area-inset-top));
  padding-bottom: max(0px, env(safe-area-inset-bottom));
  padding-left: max(0px, env(safe-area-inset-left));
  padding-right: max(0px, env(safe-area-inset-right));
}
```

**Перевірити в DevTools:**
1. Відкрити DevTools
2. Консоль (Console)
3. Ввести:
```javascript
// Перевірити safe-area-inset значення
const html = document.documentElement;
console.log({
  top: getComputedStyle(html).getPropertyValue("--safe-area-inset-top"),
  bottom: getComputedStyle(html).getPropertyValue("--safe-area-inset-bottom"),
  left: getComputedStyle(html).getPropertyValue("--safe-area-inset-left"),
  right: getComputedStyle(html).getPropertyValue("--safe-area-inset-right")
});
```

## 4. Viewport JavaScript API (укл)

**Уже реалізовано в App.js:**

```javascript
// Виклубається при зміні розміру вікна Telegram
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  
  // Розширити Mini App на весь екран
  tg.expand();
  
  // Стовідніка висота viewport
  console.log(tg.viewportHeight); // поточна висота
  console.log(tg.viewportStableHeight); // стійка висота (без keyboard)
}
```

## 5. Тестування на Реальному Пристрої

### 5.1 Через Telegram для розробників

1. **Встановити Telegram Desktop**
2. Авторизуватися як розробник
3. Ввести bot token в БОТ @BotFather
4. Додати ссилку на Mini App (http://localhost:3000)
5. Відкрити через Telegram

### 5.2 Через Safari на macOS

Якщо немає мобільного пристрою:
```
1. Відкрити Safari
2. Розробка → Увімкнути пристрій для розробки
3. Перейти на localhost:3000
4. В Safari → Розробка → Ваш Mac → Веб-інспектор
5.Симулювати мобільні розміри
```

## 6. Чек-лист Перед Деплоїм

- [ ] Без горизонтального скролювання
- [ ] Модальні вікна повністю видимі
- [ ] Input поля доступні при keyboard
- [ ] Кнопки "Back" / "Закрити" вільно доступні
- [ ] Текст читко (мін. 12px для мобілі)
- [ ] Дотичні мішені >= 44x44px (iOS) / 48x48px (Android)
- [ ] Контрастність текста >= 4.5:1
- [ ] Ніякої горизонтальної прокрутки
- [ ] Значки не обрізані на notched пристроях
- [ ] Viewport debug режим вимкнений (`Ctrl+D`)

## 7. Порекомендовані Розширення для Chrome

```
1. Telegram Mini App Emulator - симулює Telegram API
2. Mobile Simulator - точна мобільна емуляція
3. Responsive Viewer - тестування декількох розмірів
```

## 8. Порекомендовані Розміри для Тестування

```javascript
// Виконати у консолі, щоб перевірити всі розміри
const sizes = [
  { name: 'iPhone 11', w: 375, h: 812 },
  { name: 'iPhone 12/13 Mini', w: 375, h: 812 },
  { name: 'iPhone 12/13', w: 390, h: 844 },
  { name: 'iPhone 14/15', w: 393, h: 852 },
  { name: 'iPhone 15 Pro Max', w: 430, h: 932 },
  { name: 'Pixel 4a', w: 412, h: 915 },
  { name: 'Pixel 7', w: 412, h: 915 },
  { name: 'Galaxy S21', w: 360, h: 800 },
  { name: 'Tablet iPad', w: 768, h: 1024 },
];

sizes.forEach(s => console.log(`${s.name}: ${s.w}x${s.h}`));
```

## 9. Порядок Діагностики при Проблемах

### Проблема: Елементи обрізуються внизу

**Діагностика:**
1. Перевірити `tg.viewportHeight` в консолі
2. Перевірити наявність `.App { min-height: 100vh }` (замінити на `height: 100%`)
3. Переконатися, що bottom padding включений

```css
/* Правильно для Telegram */
.App {
  height: 100%;
  overflow: hidden;
}
```

### Проблема: Модальне вікна виходять за межи

**Діагностика:**
1. Перевірити `max-height` в Dialog.jsx
2. Переконатися, що max-width та max-height задані відсотком від viewport
3. Додати `overflow: auto` до Dialog

```jsx
// В Dialog.jsx
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Content
    className={cn(
      "max-h-[90vh] max-w-[90vw] overflow-y-auto overflow-x-hidden",
      className
    )}
    {...props}>
    {children}
  </DialogPrimitive.Content>
));
```

## 10. Корисні JS Команди для Тестування

**Копіюй-пастуй у консоль браузера:**

```javascript
// 1. Перевірити viewport
console.log({
  window: { w: window.innerWidth, h: window.innerHeight },
  screen: { w: screen.width, h: screen.height },
  telegram: {
    height: window.Telegram?.WebApp?.viewportHeight,
    stableHeight: window.Telegram?.WebApp?.viewportStableHeight
  }
});

// 2. Перевірити всі дочірні елементи які виходять за межи
Array.from(document.querySelectorAll('*')).filter(el => {
  const rect = el.getBoundingClientRect();
  return rect.bottom > window.innerHeight || rect.right > window.innerWidth;
}).forEach(el => console.log('Over:', el));

// 3. Вимкнути Ctrl+D debug режим
localStorage.setItem('telegram_viewport_debug', 'false');

// 4. Перевірити всі modals
document.querySelectorAll('[role="dialog"]').forEach((d, i) => {
  const rect = d.getBoundingClientRect();
  console.log(`Dialog ${i}:`, {x: rect.left, y: rect.top, w: rect.width, h: rect.height});
});
```

## Резюме

✅ **Цей проект вже налаштований для Telegram Mini App з:**
- Правильним viewport meta тегом
- Safe areas обробкою
- Telegram WebApp SDK ініціалізацією
- Debug вимірюванням (Ctrl+D)
- CSS обмеженнями overflow

**Просто тестуйте в Device Mode від DevTools і наслідуйте чек-лист вище!**
