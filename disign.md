Ось готовий дизайн-гайд для агента. Стилістика — ICQ / Аська кінця 90-х — початку 2000-х, але з сучасною реалізацією: впізнаваний насичений зелений, світлі панелі, компактні повідомлення, округлі елементи та характерна атмосфера старого месенджера.

Головне: не робити типовий сучасний SaaS-чат у зелених кольорах. Потрібно відтворити саме візуальну мову ICQ.

## 1. Кольорова палітра

Основні кольори

ICQ Green

\#00A859

Lime Green

\#8CC63F

Soft Green

\#DDF3DF

Background

\#F0F7F0

Panel

\#FFFFFF

Text

\#26352B

## 2. CSS Design Tokens

Готовий блок змінних для `styles/variables.css`.

```

:root {
  color-scheme: light;

  --color-primary: #00A859;
  --color-primary-hover: #008F4C;
  --color-primary-active: #007A40;
  --color-primary-light: #DDF3DF;
  --color-primary-subtle: #EFF9F0;

  --color-accent: #8CC63F;
  --color-accent-light: #EAF5D9;

  --color-bg: #F0F7F0;
  --color-surface: #FFFFFF;
  --color-surface-secondary: #F7FAF7;
  --color-surface-hover: #EDF5ED;

  --color-border: #D7E5D8;
  --color-border-strong: #B7D2B9;

  --color-text: #26352B;
  --color-text-secondary: #65756A;
  --color-text-muted: #95A398;
  --color-text-inverse: #FFFFFF;

  --color-success: #00A859;
  --color-danger: #E05252;
  --color-warning: #E5A323;
  --color-info: #4596D5;

  --color-message-out: #DDF3DF;
  --color-message-in: #FFFFFF;

  --color-online: #00C76A;
  --color-offline: #A5ADA7;
  --color-away: #E5A323;
  --color-busy: #E05252;

  --font-family: "Inter", "Segoe UI", sans-serif;
  --font-size-xs: 11px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 20px;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
  --radius-pill: 999px;

  --shadow-panel: 0 2px 8px rgba(31, 80, 43, 0.06);
  --shadow-window: 0 12px 40px rgba(31, 80, 43, 0.12);

  --sidebar-width: 320px;
  --header-height: 64px;
  --input-height: 48px;

  --transition-fast: 150ms ease;
  --transition-normal: 220ms ease;
}

```

## 3. Візуальна концепція

[曾是全球最受歡迎通訊軟件 ICQ 宣布 2024 年 6 月 26 停止運作 - 電腦領域 HKEPC Hardware - 全港 No.1 PC網站](https://images.openai.com/static-rsc-4/MMOmcSyf7qswghtnqQ0yVXSTcFhcjfFLtEzU-Xv_hHzwE9Y7-Cn95nsXRmZDvhZP0exvw18RydofL3ex0A93J97fF4a595cgT-UvSksNlDqfYBAof28GYEpfikmDAS1hB4HKcyEuiqj20AGpQcJvtDQTGO4Qqb8-XzrK2IOkC7A?purpose=inline)

[Volvió ICQ, uno de los primeros servicios de chat](https://images.openai.com/static-rsc-4/Z_7IyXcArlZsLAEWeVc6OtrZ32S1OCbso_idYa3pjEcK5b9cAqL_Bnmf-ynMzf87f1DL_PVnDJjjDt--EsfEUie0DP_JaK2ox4fvQGt2GDPdlL9K4soEMYmMqFq2YOgIQZ1o8A9Z27S1aM6dm-DN187PTUs1luzCJmBN7Qd1ry8?purpose=inline)

[Thread by @itcaat on Thread Reader App – Thread Reader App](https://images.openai.com/static-rsc-4/st_zvt6zG7FM0bfUY5tXOnGyTwv8y8PHpxfnmYzZoWnD0-VRr2kWVF863ihnBL83anPa28TFgqISfKVd48E4k0tpx_bsN5qSLhVyUcA8J2D7Z1SGADZn0YCgp0ot5aRRnS0qXx8hSCYH_Ax230s4mdLnN8cO2izD3GpmJsnKoS4?purpose=inline)

9

Загальна композиція:

- Світлий зелений фон застосунку.
- Білі панелі з тонкими зеленуватими рамками.
- Насичений зелений — головний колір дій.
- Компактна ліва панель контактів.
- Центральна область листування.
- Верхня панель із назвою контакту, статусом та аватаром.
- Нижня область введення повідомлень.

## 4. Компоненти інтерфейсу

| Компонент        | Дизайн                        |
| ---------------- | ----------------------------- |
| Sidebar          | Біла панель, 320px            |
| Header           | Білий, зелений акцент         |
| Contact item     | Hover зі світло-зеленим фоном |
| Active contact   | `#DDF3DF`                     |
| Online indicator | Зелена крапка                 |
| Outgoing message | `#DDF3DF`                     |
| Incoming message | Білий                         |
| Send button      | `#00A859`                     |
| Input            | Білий, зелена рамка при focus |
| Dividers         | `#D7E5D8`                     |

## 5. Повідомлення

Привіт! Як справи?

10:42 ✓✓

Все чудово! А ти як?

10:43

Сьогодні

Давай протестуємо наш новий месенджер!

10:44 ✓✓

Правила:

- Вхідні повідомлення — білі.
- Вихідні — світло-зелені.
- Не використовувати величезні bubble.
- Час повідомлення дрібний, ненав'язливий.
- Групування повідомлень одного автора.
- Статуси доставки та прочитання.
- Плавна поява нових повідомлень.

## 6. Контакти та статуси

## A

Alex

Online

## D

Developer

Away

## M

Maria

Online

## J

John

Offline

## 7. Візуальні деталі, які створюють атмосферу ICQ

- Класична зелена квітка ICQ як натхнення для власного логотипу, без копіювання торгового знака.
- Зелені індикатори присутності.
- Компактна типографіка.
- Невеликі іконки.
- Ненав'язливі тіні.
- Тонкі рамки замість масивних карток.
- Hover-ефекти зі зміною фону.
- Анімація появи контактів та повідомлень.
- Звукові сповіщення про повідомлення (з можливістю вимкнення).
- Стани Online, Away, Busy, Invisible, Offline.

## 8. Готове завдання для AI-агента

# Design System — Retro ICQ Green Messenger

Redesign the entire messenger UI using a visual direction inspired by the classic ICQ messenger from the early 2000s.

## Design direction

Create a nostalgic but modern instant messaging interface.

The design must feel like ICQ:

- Dominant green color identity.
- Light green and white surfaces.
- Compact contact lists.
- Simple rounded message bubbles.
- Small online presence indicators.
- Minimal borders and subtle shadows.
- Friendly, lightweight desktop messenger aesthetic.

Do NOT create a generic modern SaaS dashboard.\
Do NOT use purple, blue or dark gradients as primary visual elements.\
Do NOT use excessive glassmorphism.\
Do NOT use oversized cards or excessive whitespace.

## Design tokens

Use the CSS variables provided in the design specification as the single source of truth.

All colors, radii, shadows, spacing and typography must be centralized in CSS variables.

Do not hardcode colors inside individual components.

## Layout

Desktop:

- Left sidebar: 320px.
- Main chat area: flexible width.
- Chat header: 64px.
- Message composer fixed to the bottom of the chat area.
- Contact list scrolls independently.
- Message history scrolls independently.

Mobile:

- Contacts and conversation are separate navigation views.
- Chat opens as a full-screen view.
- Composer remains accessible above the mobile keyboard.
- Avoid horizontal scrolling.

## Components

Implement consistent styles for:

- Application shell.
- Sidebar.
- User profile.
- Contact list.
- Contact item.
- Presence indicators.
- Chat header.
- Message bubbles.
- Message groups.
- Date separators.
- Message status indicators.
- Typing indicator.
- Message composer.
- Attachment controls.
- Emoji picker.
- Empty states.
- Loading states.
- Connection states.
- Error notifications.
- Incoming call and outgoing call UI.

## Messaging visual rules

Incoming messages:

- White background.
- Subtle border.
- Left alignment.

Outgoing messages:

- Light green background.
- Right alignment.

Message timestamps:

- Small and muted.

Online status:

- Green dot.

Offline status:

- Gray dot.

Away:

- Yellow/orange dot.

Busy:

- Red dot.

## Interaction

- Subtle hover states.
- Smooth transitions between contacts.
- Animated incoming messages.
- Clear active contact state.
- Visible unread message count.
- Responsive composer.
- Accessible focus states.
- Consistent button sizes.

## Technical constraints

- Preserve the existing WebRTC architecture.
- Do not introduce WebSockets.
- Do not modify signaling, peer connection, ICE handling or media transport while implementing the visual redesign.
- Keep UI components separated from WebRTC transport logic.
- Preserve all existing messaging functionality.

## Quality requirements

- Consistent design across all screens.
- No arbitrary colors outside the design tokens.
- No inconsistent border radii.
- No default browser form controls.
- No unfinished placeholder styling.
- No broken mobile layouts.

The final result should look like a modern reinterpretation of classic ICQ, not a generic chat template with green buttons.

Ключова вимога: агент має переробити всю UI-систему, а не просто пофарбувати кнопки в зелений. Інакше вийде звичайний Telegram, який випадково впав у відро із зеленою фарбою.
