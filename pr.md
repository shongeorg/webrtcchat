production link https://webrtcchat-psi.vercel.app/

Тобі потрібен P2P-чат на WebRTC + JavaScript, без WebSocket і без постійного Node.js-сервера, щоб нормально деплоїтися на Vercel.

Це реально.

Архітектура:

- WebRTC DataChannel — передача повідомлень напряму між браузерами.
- Signaling через HTTP API — обмін SDP Offer/Answer та ICE-кандидатами.
- Vercel Functions — серверна частина для signaling.
- STUN — встановлення P2P-з'єднання.
- TURN — резервний relay, якщо пряме з'єднання неможливе.
  Важливий момент: WebRTC не потребує WebSocket, але потребує signaling-механізму для встановлення з'єднання.
  Мій вибір — Trystero
  Trystero — саме те, що ти шукаєш.

Trystero

MIT · JavaScript · WebRTC · P2P
ДокументаціяGitHub

Встановлення
npm install trystero

Мінімальний приклад чату
import { joinRoom } from 'trystero'

const room = joinRoom(
{ appId: 'my-p2p-chat' },
'room-123'
)

const chat = room.makeAction('message')

chat.onMessage = (message, { peerId }) => {
console.log(peerId, message)
}

function sendMessage(message) {
chat.send(message)
}

room.onPeerJoin = peerId => {
console.log('Online:', peerId)
}

room.onPeerLeave = peerId => {
console.log('Offline:', peerId)
}

Чому підходить
Можливість Підтримка
WebSocket власного сервера Не потрібен
Vercel deployment Так
P2P повідомлення Так
Групові кімнати Так
Передача файлів Так
Голос / відео Так
Nostr signaling Так, за замовчуванням
Власний сервер Не обов'язковий

Trystero використовує Nostr-реле для початкового узгодження з'єднання. Після встановлення WebRTC повідомлення йдуть напряму між клієнтами.
Trystero+2

Важливі обмеження

1. Повідомлення не зберігаються на сервері. Для історії потрібна окрема база.
2. Якщо користувачі офлайн, доставка повідомлень не гарантується.
3. Для деяких мереж знадобиться TURN.
4. Для великих груп mesh-архітектура погано масштабується.
   Trystero+1
   Висновок: для браузерного P2P-месенджера на чистому JS, який деплоїться на Vercel без власного WebSocket-сервера, я б починав саме з Trystero.
