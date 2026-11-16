import {computed, onUnmounted, ref, shallowRef} from 'vue'
import {joinRoom} from '@trystero-p2p/mqtt'
import {useSounds} from './useSounds'

const APP_ID = 'webrtcchat-p2p-7c1f4a'
const PROFILE_KEY = 'webrtcchat.profile'
const HISTORY_PREFIX = 'webrtcchat.history.'
const MAX_NAME = 32
const MAX_TEXT = 2000
const MAX_FILE_BYTES = 25 * 1024 * 1024
const HISTORY_LIMIT = 200
const MESSAGE_LIMIT = 400
const TYPING_IDLE = 2500
const TYPING_TIMEOUT = 3500
const CALL_TIMEOUT = 30000
const STATUS_RANK = {sent: 0, delivered: 1, read: 2}

export function useChatRoom() {
  const roomId = ref('')
  const myName = ref('')
  const messages = ref([])
  const peers = ref([])
  const peerNames = ref({})
  const typingNames = ref({})
  const profile = ref(readProfile())
  const unread = ref(0)
  const notices = ref([])
  const call = ref({phase: 'idle', peerName: '', peerId: ''})
  const localStream = shallowRef(null)
  const remoteStreams = shallowRef([])
  const micEnabled = ref(true)
  const cameraEnabled = ref(true)
  const screenEnabled = ref(false)
  const screenPeers = ref({})

  const sounds = useSounds()

  const joined = computed(() => roomId.value !== '')

  const typingText = computed(() => {
    const names = Object.values(typingNames.value)

    if (names.length === 0) {
      return ''
    }

    const label = names.join(', ')
    return names.length === 1 ? `${label} друкує…` : `${label} друкують…`
  })

  let room = null
  let chatAction = null
  let typingAction = null
  let fileAction = null
  let ackAction = null
  let callAction = null
  let typingSent = false
  let typingTimer = null
  let callTimer = null
  let mediaStream = null
  let screenStream = null
  let cameraTrack = null
  const acceptedPeers = new Set()
  const declinedPeers = new Set()
  const peerTypingTimers = new Map()

  document.addEventListener('visibilitychange', handleVisibility)

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibility)
    leave()
  })

  function handleVisibility() {
    if (!document.hidden) {
      unread.value = 0
    }
  }

  function join(roomName, displayName) {
    const cleanRoom = String(roomName).trim().slice(0, 64)
    const cleanName = String(displayName).trim().slice(0, MAX_NAME)

    if (!cleanRoom || !cleanName) {
      return
    }

    leave()

    roomId.value = cleanRoom
    myName.value = cleanName
    saveProfile()

    messages.value = readHistory(cleanRoom)
    addSystem(`Ви приєдналися до кімнати «${cleanRoom}»`)

    room = joinRoom({appId: APP_ID}, cleanRoom)
    chatAction = room.makeAction('chat')
    typingAction = room.makeAction('typing')
    ackAction = room.makeAction('ack')
    callAction = room.makeAction('call')
    fileAction = room.makeAction('file', {onReceive: ({byteLength}) => byteLength <= MAX_FILE_BYTES})
    const nameAction = room.makeAction('name')

    chatAction.onMessage = (payload, {peerId}) => {
      if (!payload || typeof payload.text !== 'string') {
        return
      }

      const text = payload.text.slice(0, MAX_TEXT)

      if (!text) {
        return
      }

      rememberName(peerId, payload.name)
      pushMessage({
        id: typeof payload.id === 'string' ? payload.id : newId(),
        kind: 'chat',
        author: payload.name || peerLabel(peerId),
        text,
        time: Number(payload.time) || Date.now(),
        own: false
      })
      acknowledge(payload.id)
    }

    fileAction.onMessage = (data, {peerId, metadata}) => {
      if (!metadata || typeof metadata.name !== 'string') {
        return
      }

      rememberName(peerId, metadata.author)
      const blob = new Blob([data], {type: metadata.type || 'application/octet-stream'})
      pushMessage({
        id: typeof metadata.id === 'string' ? metadata.id : newId(),
        kind: 'file',
        author: metadata.author || peerLabel(peerId),
        time: Number(metadata.time) || Date.now(),
        own: false,
        file: {
          name: metadata.name,
          type: metadata.type || 'application/octet-stream',
          size: Number(metadata.size) || blob.size,
          url: URL.createObjectURL(blob)
        }
      })
      acknowledge(metadata.id)
    }

    nameAction.onMessage = (value, {peerId}) => {
      rememberName(peerId, value)
    }

    ackAction.onMessage = (payload, {peerId}) => {
      if (!payload || typeof payload.id !== 'string') {
        return
      }

      if (payload.state === 'read' || payload.state === 'delivered') {
        updateStatus(payload.id, payload.state)
      }

      if (payload.state === 'read') {
        hideTyping(peerId)
      }
    }

    typingAction.onMessage = (payload, {peerId}) => {
      if (!payload) {
        return
      }

      if (payload.typing) {
        showTyping(peerId, payload.name)
      } else {
        hideTyping(peerId)
      }
    }

    callAction.onMessage = (payload, {peerId}) => {
      handleCallMessage(payload, peerId)
    }

    room.onPeerJoin = peerId => {
      nameAction.send(myName.value, {target: peerId}).catch(() => {})
      refreshPeers()
    }

    room.onPeerLeave = peerId => {
      removePeer(peerId)
    }

    room.onPeerStream = (stream, peerId) => {
      const entry = {peerId, name: peerLabel(peerId), stream}
      remoteStreams.value = [...remoteStreams.value.filter(item => item.peerId !== peerId), entry]

      if (call.value.phase === 'outgoing' || call.value.phase === 'incoming') {
        clearTimeout(callTimer)
        callTimer = null
        call.value = {phase: 'active', peerName: '', peerId: ''}
      }
    }

    refreshPeers()
  }

  function leave() {
    stopCall(false)

    if (room) {
      room.leave()
    }

    clearTimeout(typingTimer)
    peerTypingTimers.forEach(timer => clearTimeout(timer))
    peerTypingTimers.clear()

    typingTimer = null
    typingSent = false
    room = null
    chatAction = null
    typingAction = null
    fileAction = null
    ackAction = null
    callAction = null
    roomId.value = ''
    myName.value = ''
    messages.value = []
    peers.value = []
    peerNames.value = {}
    typingNames.value = {}
    unread.value = 0
  }

  function sendMessage(rawText) {
    const text = String(rawText).trim().slice(0, MAX_TEXT)

    if (!text || !chatAction) {
      return
    }

    const payload = {id: newId(), name: myName.value, text, time: Date.now()}

    chatAction.send(payload).catch(() => {})
    stopTyping()
    pushMessage({
      id: payload.id,
      kind: 'chat',
      author: myName.value,
      text,
      time: payload.time,
      own: true,
      status: 'sent'
    })
  }

  async function sendFiles(fileList) {
    const files = Array.from(fileList || [])

    if (!fileAction || files.length === 0) {
      return
    }

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        notify(`Файл «${file.name}» більший за 25 МБ`, 'error')
        continue
      }

      const id = newId()
      const metadata = {
        id,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        author: myName.value,
        time: Date.now()
      }

      try {
        await fileAction.send(file, {metadata})
      } catch {
        notify(`Не вдалося надіслати «${file.name}»`, 'error')
        continue
      }

      pushMessage({
        id,
        kind: 'file',
        author: myName.value,
        time: metadata.time,
        own: true,
        status: 'sent',
        file: {
          name: metadata.name,
          type: metadata.type,
          size: metadata.size,
          url: URL.createObjectURL(file)
        }
      })
    }
  }

  function acknowledge(messageId) {
    if (!ackAction || typeof messageId !== 'string') {
      return
    }

    const state = document.hidden ? 'delivered' : 'read'
    ackAction.send({id: messageId, state}).catch(() => {})
  }

  function updateStatus(messageId, state) {
    const index = messages.value.findIndex(message => message.id === messageId)

    if (index === -1) {
      return
    }

    const message = messages.value[index]

    if (!message.own || !message.status) {
      return
    }

    if ((STATUS_RANK[state] ?? 0) <= (STATUS_RANK[message.status] ?? 0)) {
      return
    }

    messages.value[index] = {...message, status: state}
  }

  function notifyTyping() {
    if (!typingAction) {
      return
    }

    if (!typingSent) {
      typingSent = true
      typingAction.send({name: myName.value, typing: true}).catch(() => {})
    }

    clearTimeout(typingTimer)
    typingTimer = setTimeout(stopTyping, TYPING_IDLE)
  }

  function stopTyping() {
    clearTimeout(typingTimer)
    typingTimer = null

    if (!typingSent) {
      return
    }

    typingSent = false
    typingAction?.send({name: myName.value, typing: false}).catch(() => {})
  }

  function showTyping(peerId, name) {
    const label = typeof name === 'string' && name.trim() ? name.trim() : peerLabel(peerId)

    typingNames.value = {...typingNames.value, [peerId]: label}
    clearTimeout(peerTypingTimers.get(peerId))
    peerTypingTimers.set(peerId, setTimeout(() => hideTyping(peerId), TYPING_TIMEOUT))
  }

  function hideTyping(peerId) {
    clearTimeout(peerTypingTimers.get(peerId))
    peerTypingTimers.delete(peerId)

    if (!typingNames.value[peerId]) {
      return
    }

    const nextTyping = {...typingNames.value}
    delete nextTyping[peerId]
    typingNames.value = nextTyping
  }

  function rememberName(peerId, value) {
    if (typeof value !== 'string' || !value.trim()) {
      return
    }

    const cleanName = value.trim().slice(0, MAX_NAME)
    const isNew = !peerNames.value[peerId]

    if (peerNames.value[peerId] === cleanName) {
      return
    }

    peerNames.value = {...peerNames.value, [peerId]: cleanName}

    if (isNew) {
      addSystem(`${cleanName} тепер у кімнаті`)
    }

    refreshPeers()
  }

  function removePeer(peerId) {
    const name = peerNames.value[peerId]
    const nextNames = {...peerNames.value}
    delete nextNames[peerId]
    peerNames.value = nextNames
    hideTyping(peerId)
    refreshPeers()
    addSystem(name ? `${name} більше не в кімнаті` : 'Учасник покинув кімнату')

    if (screenPeers.value[peerId]) {
      const nextScreens = {...screenPeers.value}
      delete nextScreens[peerId]
      screenPeers.value = nextScreens
    }

    if (remoteStreams.value.some(item => item.peerId === peerId)) {
      remoteStreams.value = remoteStreams.value.filter(item => item.peerId !== peerId)

      if (remoteStreams.value.length === 0 && call.value.phase === 'active') {
        stopCall(false)
      }
    }
  }

  function peerLabel(peerId) {
    return peerNames.value[peerId] || `Гість ${peerId.slice(0, 6)}`
  }

  function refreshPeers() {
    if (!room) {
      peers.value = []
      return
    }

    peers.value = Object.keys(room.getPeers())
      .map(id => ({id, name: peerLabel(id)}))
      .sort((left, right) => left.name.localeCompare(right.name))
  }

  function addSystem(text) {
    pushMessage({kind: 'system', text})
  }

  function pushMessage(message) {
    const entry = {id: newId(), kind: 'chat', author: '', text: '', time: Date.now(), own: false, ...message}
    messages.value = [...messages.value, entry].slice(-MESSAGE_LIMIT)

    if (!entry.own && entry.kind !== 'system') {
      sounds.playMessage()

      if (document.hidden) {
        unread.value += 1
      }
    }

    if (entry.kind === 'chat') {
      saveHistory()
    }
  }

  function saveHistory() {
    try {
      const items = messages.value
        .filter(message => message.kind === 'chat')
        .slice(-HISTORY_LIMIT)
        .map(({id, author, text, time, own, status}) => ({id, author, text, time, own, status}))

      localStorage.setItem(HISTORY_PREFIX + roomId.value, JSON.stringify(items))
    } catch {
      return
    }
  }

  function saveProfile() {
    profile.value = {name: myName.value, room: roomId.value}

    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile.value))
    } catch {
      return
    }
  }

  function notify(text, tone = 'info') {
    const id = newId()
    notices.value = [...notices.value, {id, text, tone}]
    setTimeout(() => {
      notices.value = notices.value.filter(notice => notice.id !== id)
    }, 4000)
  }

  async function startCall() {
    if (!room || peers.value.length === 0) {
      notify('У кімнаті немає інших учасників', 'error')
      return
    }

    if (call.value.phase !== 'idle') {
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true})
      mediaStream = stream
      localStream.value = stream
      micEnabled.value = true
      cameraEnabled.value = true
      acceptedPeers.clear()
      declinedPeers.clear()
      call.value = {phase: 'outgoing', peerName: '', peerId: ''}
      sounds.startRingtone()
      callAction.send({type: 'invite', name: myName.value}).catch(() => {})
      callTimer = setTimeout(() => {
        if (call.value.phase === 'outgoing') {
          notify('Ніхто не відповів на дзвінок', 'error')
          stopCall(true)
        }
      }, CALL_TIMEOUT)
    } catch {
      notify('Немає доступу до камери або мікрофона', 'error')
    }
  }

  async function acceptCall() {
    if (call.value.phase !== 'incoming' || !room) {
      return
    }

    const callerId = call.value.peerId
    const callerName = call.value.peerName

    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true})
      mediaStream = stream
      localStream.value = stream
      micEnabled.value = true
      cameraEnabled.value = true
      room.addStream(stream, {target: callerId})
      callAction.send({type: 'accept', name: myName.value}, {target: callerId}).catch(() => {})
      sounds.stopRingtone()
      sounds.playCue()
      call.value = {phase: 'active', peerName: callerName, peerId: callerId}
    } catch {
      notify('Немає доступу до камери або мікрофона', 'error')
      declineCall()
    }
  }

  function declineCall() {
    const peerId = call.value.peerId

    if (peerId) {
      callAction?.send({type: 'decline', name: myName.value}, {target: peerId}).catch(() => {})
    }

    stopCall(false)
  }

  function endCall() {
    sounds.playCue()
    stopCall(true)
  }

  function stopCall(sendEnd) {
    sounds.stopRingtone()

    if (sendEnd) {
      callAction?.send({type: 'end', name: myName.value}).catch(() => {})
    }

    clearTimeout(callTimer)
    callTimer = null

    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
      screenStream = null
    }

    cameraTrack = null

    if (mediaStream) {
      if (room) {
        try {
          room.removeStream(mediaStream)
        } catch {}
      }

      mediaStream.getTracks().forEach(track => track.stop())
    }

    mediaStream = null
    localStream.value = null
    remoteStreams.value = []
    acceptedPeers.clear()
    declinedPeers.clear()
    screenEnabled.value = false
    screenPeers.value = {}
    call.value = {phase: 'idle', peerName: '', peerId: ''}
  }

  function handleCallMessage(payload, peerId) {
    if (!payload || typeof payload.type !== 'string') {
      return
    }

    const name = payload.name || peerLabel(peerId)

    if (payload.type === 'invite') {
      if (call.value.phase === 'idle') {
        call.value = {phase: 'incoming', peerName: name, peerId}
        sounds.startRingtone()
      } else {
        callAction.send({type: 'decline', name: myName.value}, {target: peerId}).catch(() => {})
      }

      return
    }

    if (payload.type === 'accept') {
      if (call.value.phase !== 'outgoing' && call.value.phase !== 'active') {
        return
      }

      clearTimeout(callTimer)
      callTimer = null
      acceptedPeers.add(peerId)

      if (mediaStream) {
        room.addStream(mediaStream, {target: peerId})
      }

      sounds.stopRingtone()
      sounds.playCue()
      call.value = {phase: 'active', peerName: '', peerId: ''}
      return
    }

    if (payload.type === 'decline') {
      if (call.value.phase !== 'outgoing') {
        return
      }

      declinedPeers.add(peerId)

      if (acceptedPeers.size === 0 && declinedPeers.size >= peers.value.length) {
        notify('Дзвінок відхилено', 'error')
        sounds.playCue()
        stopCall(false)
      }

      return
    }

    if (payload.type === 'screen') {
      const nextScreens = {...screenPeers.value}

      if (payload.active) {
        nextScreens[peerId] = true
      } else {
        delete nextScreens[peerId]
      }

      screenPeers.value = nextScreens
      return
    }

    if (payload.type === 'end') {
      if (call.value.phase === 'active' || call.value.phase === 'incoming') {
        sounds.playCue()
      }

      remoteStreams.value = remoteStreams.value.filter(item => item.peerId !== peerId)

      if (call.value.phase === 'active' && remoteStreams.value.length === 0) {
        stopCall(false)
      } else if (call.value.phase === 'incoming' && call.value.peerId === peerId) {
        stopCall(false)
      }
    }
  }

  function toggleMic() {
    micEnabled.value = !micEnabled.value
    mediaStream?.getAudioTracks().forEach(track => {
      track.enabled = micEnabled.value
    })
  }

  function toggleCamera() {
    cameraEnabled.value = !cameraEnabled.value
    mediaStream?.getVideoTracks().forEach(track => {
      track.enabled = cameraEnabled.value
    })
  }

  async function startScreenShare() {
    if (!room || !mediaStream || screenEnabled.value || call.value.phase !== 'active') {
      return
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({video: true, audio: false})
      const screenTrack = display.getVideoTracks()[0]

      if (!screenTrack) {
        display.getTracks().forEach(track => track.stop())
        return
      }

      cameraTrack = mediaStream.getVideoTracks()[0] || null

      if (cameraTrack) {
        cameraTrack.enabled = false
      }

      for (const connection of Object.values(room.getPeers())) {
        const sender = connection.getSenders().find(item => item.track && item.track.kind === 'video')

        if (sender) {
          await sender.replaceTrack(screenTrack)
        }
      }

      screenStream = display
      screenEnabled.value = true
      localStream.value = display
      callAction?.send({type: 'screen', active: true, name: myName.value}).catch(() => {})
      screenTrack.onended = () => {
        stopScreenShare()
      }
    } catch {
      notify('Не вдалося запустити трансляцію екрана', 'error')
    }
  }

  async function stopScreenShare() {
    if (!screenEnabled.value) {
      return
    }

    const display = screenStream
    const camera = mediaStream?.getVideoTracks()[0] || cameraTrack
    const replacements = []

    if (room && camera) {
      for (const connection of Object.values(room.getPeers())) {
        const sender = connection.getSenders().find(item => item.track && item.track.kind === 'video')

        if (sender) {
          replacements.push(sender.replaceTrack(camera).catch(() => {}))
        }
      }
    }

    await Promise.all(replacements)

    if (display) {
      display.getTracks().forEach(track => track.stop())
    }

    if (camera) {
      camera.enabled = cameraEnabled.value
    }

    screenStream = null
    cameraTrack = null
    screenEnabled.value = false
    localStream.value = mediaStream
    callAction?.send({type: 'screen', active: false, name: myName.value}).catch(() => {})
  }

  function toggleScreenShare() {
    if (screenEnabled.value) {
      stopScreenShare()
    } else {
      startScreenShare()
    }
  }

  function clearUnread() {
    unread.value = 0
  }

  return {
    joined,
    roomId,
    myName,
    profile,
    peers,
    messages,
    typingText,
    unread,
    notices,
    call,
    localStream,
    remoteStreams,
    micEnabled,
    cameraEnabled,
    screenEnabled,
    screenPeers,
    soundEnabled: sounds.enabled,
    join,
    leave,
    sendMessage,
    sendFiles,
    notifyTyping,
    stopTyping,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    toggleSound: sounds.toggleSound,
    clearUnread
  }
}

function readProfile() {
  try {
    const data = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}')
    return {
      name: typeof data.name === 'string' ? data.name.slice(0, MAX_NAME) : '',
      room: typeof data.room === 'string' ? data.room.slice(0, 64) : ''
    }
  } catch {
    return {name: '', room: ''}
  }
}

function readHistory(roomId) {
  try {
    const items = JSON.parse(localStorage.getItem(HISTORY_PREFIX + roomId) || '[]')

    if (!Array.isArray(items)) {
      return []
    }

    return items
      .filter(item => item && typeof item.text === 'string')
      .slice(-HISTORY_LIMIT)
      .map(item => ({
        id: typeof item.id === 'string' ? item.id : newId(),
        kind: 'chat',
        author: typeof item.author === 'string' ? item.author : 'Анонім',
        text: item.text.slice(0, MAX_TEXT),
        time: Number(item.time) || Date.now(),
        own: Boolean(item.own),
        status: typeof item.status === 'string' ? item.status : 'sent'
      }))
  } catch {
    return []
  }
}

function newId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
