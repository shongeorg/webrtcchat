import {joinRoom} from "https://esm.sh/trystero@0.26.0"

const APP_ID = "webrtcchat-p2p-7c1f4a"
const STORAGE_KEY = "webrtcchat.profile"
const MAX_NAME = 32
const MAX_TEXT = 2000

const statusEl = document.querySelector("#status")
const joinView = document.querySelector("#joinView")
const chatView = document.querySelector("#chatView")
const joinForm = document.querySelector("#joinForm")
const nameInput = document.querySelector("#nameInput")
const roomInput = document.querySelector("#roomInput")
const roomLabel = document.querySelector("#roomLabel")
const peerCount = document.querySelector("#peerCount")
const peerList = document.querySelector("#peerList")
const messagesEl = document.querySelector("#messages")
const composer = document.querySelector("#composer")
const messageInput = document.querySelector("#messageInput")
const leaveButton = document.querySelector("#leaveButton")

let room = null
let chatAction = null
let currentRoom = ""
let myName = ""
const peerNames = new Map()

const saved = readProfile()
nameInput.value = saved.name
roomInput.value = saved.room

joinForm.addEventListener("submit", event => {
  event.preventDefault()
  startChat(roomInput.value.trim(), nameInput.value.trim())
})

composer.addEventListener("submit", event => {
  event.preventDefault()
  sendMessage()
})

messageInput.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
})

leaveButton.addEventListener("click", () => {
  stopChat()
  showJoinView()
})

function readProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    return {
      name: typeof parsed.name === "string" ? parsed.name.slice(0, MAX_NAME) : "",
      room: typeof parsed.room === "string" ? parsed.room.slice(0, 64) : ""
    }
  } catch {
    return {name: "", room: ""}
  }
}

function saveProfile(name, roomId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({name, room: roomId}))
  } catch {
    return
  }
}

function startChat(roomId, displayName) {
  if (!roomId || !displayName) {
    return
  }

  stopChat()

  currentRoom = roomId
  myName = displayName.slice(0, MAX_NAME)
  saveProfile(myName, currentRoom)

  room = joinRoom({appId: APP_ID}, currentRoom)
  chatAction = room.makeAction("chat")
  const nameAction = room.makeAction("name")

  chatAction.onMessage = (payload, {peerId}) => {
    if (!payload || typeof payload.text !== "string") {
      return
    }

    if (payload.name) {
      rememberName(peerId, payload.name)
    }

    renderMessage({
      author: payload.name || "Анонім",
      text: payload.text.slice(0, MAX_TEXT),
      time: Number(payload.time) || Date.now(),
      own: false
    })
  }

  nameAction.onMessage = (value, {peerId}) => {
    rememberName(peerId, value)
  }

  room.onPeerJoin = peerId => {
    nameAction.send(myName, {target: peerId})
    renderPeers()
  }

  room.onPeerLeave = peerId => {
    peerNames.delete(peerId)
    renderPeers()
  }

  joinView.hidden = true
  chatView.hidden = false
  roomLabel.textContent = currentRoom
  messagesEl.replaceChildren()
  renderPeers()
  messageInput.focus()
}

function stopChat() {
  if (room) {
    room.leave()
  }

  room = null
  chatAction = null
  currentRoom = ""
  myName = ""
  peerNames.clear()
}

function showJoinView() {
  chatView.hidden = true
  joinView.hidden = false
  statusEl.textContent = "Не в кімнаті"
  peerCount.textContent = "0"
  peerList.replaceChildren()
  messagesEl.replaceChildren()
  roomInput.value = readProfile().room
  nameInput.focus()
}

function rememberName(peerId, value) {
  if (typeof value !== "string" || !value.trim()) {
    return
  }

  peerNames.set(peerId, value.trim().slice(0, MAX_NAME))
  renderPeers()
}

function renderPeers() {
  if (!room) {
    return
  }

  const peerIds = Object.keys(room.getPeers())
  const items = [createPeerItem(`Ви · ${myName}`, true)]

  for (const peerId of peerIds) {
    items.push(createPeerItem(peerNames.get(peerId) || shortId(peerId), false))
  }

  peerList.replaceChildren(...items)
  peerCount.textContent = String(peerIds.length + 1)
  statusEl.textContent = `Кімната ${currentRoom} · ${peerIds.length + 1} онлайн`
}

function createPeerItem(label, isSelf) {
  const item = document.createElement("li")
  item.textContent = label

  if (isSelf) {
    item.classList.add("is-self")
  }

  return item
}

function shortId(peerId) {
  return `Гість ${peerId.slice(0, 6)}`
}

function sendMessage() {
  if (!chatAction) {
    return
  }

  const text = messageInput.value.trim()

  if (!text) {
    return
  }

  const payload = {
    name: myName,
    text: text.slice(0, MAX_TEXT),
    time: Date.now()
  }

  chatAction.send(payload).catch(() => {})
  messageInput.value = ""
  renderMessage({author: myName, text: payload.text, time: payload.time, own: true})
  messageInput.focus()
}

function renderMessage({author, text, time, own}) {
  const item = document.createElement("li")
  item.classList.add("message")

  if (own) {
    item.classList.add("message-own")
  }

  const meta = document.createElement("div")
  meta.className = "message-meta"

  const name = document.createElement("strong")
  name.textContent = own ? "Ви" : author

  const stamp = document.createElement("time")
  stamp.textContent = formatTime(time)

  const body = document.createElement("p")
  body.className = "message-text"
  body.textContent = text

  meta.append(name, stamp)
  item.append(meta, body)
  messagesEl.append(item)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function formatTime(time) {
  return new Date(time).toLocaleTimeString("uk-UA", {
    hour: "2-digit",
    minute: "2-digit"
  })
}
