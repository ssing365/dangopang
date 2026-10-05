import Peer, { type DataConnection } from 'peerjs'
import { NET } from '../game/config'
import { setOutbox, useGame } from '../game/store'
import type { NetMsg } from './protocol'

/**
 * 친구 대전 연결 관리 (PeerJS: 공개 시그널링 서버로 연결만 맺고, 이후는 브라우저끼리 직접 통신).
 * 방은 한 번에 하나, 상대도 한 명.
 */
let peer: Peer | null = null
let conn: DataConnection | null = null
let pingTimer: ReturnType<typeof setInterval> | undefined
let connectTimer: ReturnType<typeof setTimeout> | undefined
let lastSeen = 0

const peerOptions = { config: { iceServers: NET.iceServers } }

function makeCode() {
  let code = ''
  for (let i = 0; i < NET.codeLength; i++) code += NET.codeChars[Math.floor(Math.random() * NET.codeChars.length)]
  return code
}

/** 방 링크 (게스트가 열면 바로 접속) */
export const roomLink = (code: string) => `${location.origin}${location.pathname}?room=${code}`

/** URL 의 ?room= 코드 */
export const roomCodeFromUrl = () => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? ''

function clearRoomFromUrl() {
  if (!location.search.includes('room=')) return
  history.replaceState(null, '', location.pathname)
}

function cleanup() {
  clearInterval(pingTimer)
  clearTimeout(connectTimer)
  setOutbox(null)
  const p = peer
  peer = null
  conn = null
  p?.destroy()
}

/** 로비 단계에서 실패: 로비에 실패 문구를 띄운다 */
function fail(notice: string) {
  cleanup()
  useGame.setState({ net: 'failed', netNotice: notice })
}

/** 연결이 끊기거나 나가기: CPU 모드 메뉴로 돌아간다 */
function backToMenu(notice: string) {
  cleanup()
  clearRoomFromUrl()
  useGame.getState().goMenu()
  useGame.setState({ mode: 'cpu', role: null, net: 'idle', roomCode: '', netNotice: notice })
}

function handle(msg: NetMsg) {
  const s = useGame.getState()
  switch (msg.t) {
    case 'ping':
      return
    case 'bye':
      return backToMenu('친구가 방을 나갔어요')
    case 'place':
      return s.remotePlace(msg.color, msg.orderUid)
    case 'start':
      return s.remoteStart(msg.order, msg.orderUid)
    case 'complete':
      return s.remoteComplete(msg.winner, msg.order, msg.orderUid)
    case 'end':
      return s.remoteEnd(msg.host, msg.guest)
  }
}

function attach(c: DataConnection) {
  conn = c
  c.on('open', () => {
    if (conn !== c) return
    clearTimeout(connectTimer)
    lastSeen = performance.now()
    setOutbox((msg) => {
      if (c.open) c.send(msg)
    })
    useGame.setState({ net: 'connected', netNotice: '' })
    // 탭을 그냥 닫으면 close 이벤트가 안 올 때가 있어서 ping 으로 살아있는지 확인
    pingTimer = setInterval(() => {
      if (performance.now() - lastSeen > NET.deadMs) return backToMenu('친구와 연결이 끊겼어요')
      if (c.open) c.send({ t: 'ping' } satisfies NetMsg)
    }, NET.pingMs)
  })
  c.on('data', (data) => {
    if (conn !== c) return
    lastSeen = performance.now()
    handle(data as NetMsg)
  })
  c.on('close', () => {
    if (conn === c) backToMenu('친구와 연결이 끊겼어요')
  })
}

/** 방 만들기 (호스트) */
export function hostRoom() {
  cleanup()
  const code = makeCode()
  useGame.setState({ mode: 'online', role: 'host', net: 'waiting', roomCode: code, netNotice: '' })
  const p = new Peer(NET.peerPrefix + code, peerOptions)
  peer = p
  p.on('connection', (c) => {
    // 두 번째 손님은 받지 않는다
    if (conn) return void c.close()
    attach(c)
  })
  p.on('error', (err) => {
    if (peer !== p) return
    // 같은 코드의 방이 이미 있으면 새 코드로
    if (err.type === 'unavailable-id') return hostRoom()
    // 연결된 뒤 시그널링 서버와 끊기는 건 게임에 상관없다
    if (useGame.getState().net === 'connected') return
    fail('방을 만들지 못했어요. 인터넷 연결을 확인해 주세요')
  })
}

/** 방 들어가기 (게스트) */
export function joinRoom(code: string) {
  cleanup()
  useGame.setState({ mode: 'online', role: 'guest', net: 'connecting', roomCode: code, netNotice: '' })
  const p = new Peer(peerOptions)
  peer = p
  p.on('open', () => {
    if (peer === p) attach(p.connect(NET.peerPrefix + code, { reliable: true }))
  })
  p.on('error', (err) => {
    if (peer !== p || useGame.getState().net === 'connected') return
    fail(err.type === 'peer-unavailable' ? '방을 찾을 수 없어요. 링크를 다시 확인해 주세요' : '연결하지 못했어요')
  })
  connectTimer = setTimeout(() => {
    if (peer === p && useGame.getState().net !== 'connected') {
      fail('연결하지 못했어요. 둘 다 와이파이에 연결한 뒤 다시 시도해 보세요')
    }
  }, NET.connectTimeoutMs)
}

/** 방 나가기 → CPU 모드 메뉴 */
export function leaveRoom() {
  const p = peer
  if (conn?.open) conn.send({ t: 'bye' } satisfies NetMsg)
  // 이후 이벤트는 무시하고, bye 가 실제로 나간 뒤 닫히도록 한 박자 늦춰 정리한다
  peer = null
  conn = null
  backToMenu('')
  setTimeout(() => p?.destroy(), 300)
}
