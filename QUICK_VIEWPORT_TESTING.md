# Telegram Mini App Viewport - Швидкий Старт

## Як Тестувати Локально в Браузері

### Крок 1: Відкрити DevTools
- Натиснути `F12` або `Ctrl+Shift+I` (Windows/Linux)
- Натиснути `Cmd+Option+I` (macOS)

### Крок 2: Включити Мобільний Режим
- Натиснути `Ctrl+Shift+M` або `Cmd+Shift+M`
- Або клікнути на іконку телефону в DevTools

### Крок 3: Обрати Пристрій
DevTools → Device Toolbar (верхній ліво) →
**iPhone 12/13** або **Pixel 7** або **нестандартний розмір**

**Рекомендовані розміри:**
- ✅ 390×844 (iPhone 12/13/14) - найпопулярніша
- ✅ 412×915 (Pixel 4a/7)
- ✅ 360×800 (Galaxy S21, менші пристрої)

### Крок 4: Перевірити Viewport
**У консолі браузера ввести:**
```javascript
// Перевірити поточний розмір
console.log({
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: window.devicePixelRatio
});
```

### Крок 5: Включити Debug Режим
**Натиснути:** `Ctrl+D`

З'явиться зелена вікна з інформацією про viewport у лівому верхньому куті:
```
Viewport Debug
W: 390 | H: 844    ← поточні розміри
DPR: 3             ← масштаб piksela
TG: 844px          ← висота Telegram viewport
SafeTop: 0         ← відступи від paese екрана
```

## Що Перевіряти

| Перевірка | Статус |
|-----------|--------|
| ❌ Без горизонтального скролювання | |
| ❌ Панелі не виходять за межи екрана | |
| ❌ Кнопки видимі приклад в кінці | |
| ❌ Модальні вікна завповнені | |
| ❌ Текст читко (не завмалий) | |
| ❌ Нав при поява keyboard | |

## Найчастіші Проблеми

### Проблема: Елементи обрізаються внизу
**Рішення:**
1. Відкрити DevTools
2. Elements → знайти `.App` div
3. Перевірити `height` (повинна бути 100%, не 100vh)
4. Перевірити `overflow` (повинна бути `hidden`)

### Проблема: Панель Bottom Nav прихована
**Рішення:**
1. Перевірити, чи Bottom Nav має fixed позицію
2. Перевірити `bottom: 0` та `z-index: висока`
3. Переконатися що контейнер має `padding-bottom` рівна висоті Bottom Nav

### Проблема: Модальне вікно завмалий
**Рішення:**
1. В DevTools Elements → Dialog
2. Перевірити `max-width` та `max-height` (повинні бути %)
3. Додати `overflow: auto` якщо контент довгий

## Команди для Консолі

### Перевірити всі елементи що выходять за межи
```javascript
Array.from(document.querySelectorAll('*')).filter(el => {
  const r = el.getBoundingClientRect();
  return r.bottom > window.innerHeight + 10 || r.right > window.innerWidth + 10;
}).forEach(el => console.warn('Out of bounds:', el));
```

### Вимкнути Debug Режим
```javascript
localStorage.setItem('telegram_viewport_debug', 'false');
location.reload();
```

### Включити Debug Режим
```javascript
localStorage.setItem('telegram_viewport_debug', 'true');
location.reload();
```

### Перевірити Safe Areas
```javascript
const root = document.documentElement;
const style = getComputedStyle(root);
console.log({
  top: style.paddingTop,
  bottom: style.paddingBottom,
  left: style.paddingLeft,
  right: style.paddingRight
});
```

## Мобільні Ємулятори

### Встановлені в цьому проекті
✅ Telegram WebApp SDK
✅ Safe Area обробка
✅ Viewport monitoring
✅ Debug режим (Ctrl+D)

### Назовні інструменти
- **Chrome DevTools** (вбудована) - найкраща для розробки
- **Firefox Responsive Design Mode** (`Ctrl+Shift+M`)
- **Safari Develop Menu** (macOS тільки)

## Фінальна Перевірка Перед Деплоєм

```bash
# 1. Запустити локально
npm start

# 2. Відкрити в браузері
http://localhost:3000

# 3. Включити мобільний режим (Ctrl+Shift+M)
# 4. Обрати iPhone 12/13
# 5. Натиснути Ctrl+D для debug
# 6. Перевірити чек-лист:
```

- [ ] Без горизонтального прокручування
- [ ] Bottom Nav видима
- [ ] Модальні вікна повністю видимі
- [ ] Кнопки доступні
- [ ] Текст читко
- [ ] Нема обрізаних об'єктів

**Якщо все OK → готово до деплою! 🚀**

## Додаткові Посилання

- [Telegram WebApp Documentation](https://core.telegram.org/bots/webapps)
- [MDN: Viewport Meta Tag](https://developer.mozilla.org/en-US/docs/Mozilla/Mobile/Viewport_meta_tag)
- [Safe Area Insets](https://developer.mozilla.org/en-US/docs/Web/CSS/env)
- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
