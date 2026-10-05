import { SOUND } from './config'
import bgmUrl from '../assets/sounds/dangopang.mp3'
import newDangoUrl from '../assets/sounds/effects/newdango.wav'
import pop1Url from '../assets/sounds/effects/pop1.wav'
import pop2Url from '../assets/sounds/effects/pop2.wav'
import pop3Url from '../assets/sounds/effects/pop3.wav'
import pop4Url from '../assets/sounds/effects/pop4.wav'
import completeUrl from '../assets/sounds/effects/complete.wav'
import newOrderUrl from '../assets/sounds/effects/neworder.wav'
import wrongUrl from '../assets/sounds/effects/wrong.wav'

// 효과음은 지연이 짧은 Web Audio, BGM 은 긴 파일이라 <audio> 로 스트리밍한다.
// 모바일 브라우저는 사용자 제스처 전엔 소리를 막으므로 첫 탭에서 잠금을 푼다.

const POP_URLS = [pop1Url, pop2Url, pop3Url, pop4Url]

type Ctx = AudioContext
let ctx: Ctx | null = null
const buffers = new Map<string, AudioBuffer>()
let bgm: HTMLAudioElement | null = null

function getCtx(): Ctx | null {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  for (const url of [newDangoUrl, completeUrl, newOrderUrl, wrongUrl, ...POP_URLS]) {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx!.decodeAudioData(data))
      .then((buf) => buffers.set(url, buf))
      .catch(() => {
        // 로드 실패 시 그 효과음만 조용히 빠진다
      })
  }
  return ctx
}

/** delayMs 뒤에 재생 (비행 착지 순간에 맞추기 위해 Web Audio 시계로 예약) */
function play(url: string, volume: number, delayMs = 0) {
  const c = getCtx()
  const buf = buffers.get(url)
  if (!c || !buf || c.state !== 'running') return
  const src = c.createBufferSource()
  const gain = c.createGain()
  gain.gain.value = volume
  src.buffer = buf
  src.connect(gain).connect(c.destination)
  src.start(c.currentTime + Math.max(0, delayMs) / 1000)
}

/** 꼬치에 index 번째(0부터) 알이 꽂히는 소리 */
export const playPop = (index: number, delayMs = 0) =>
  play(POP_URLS[Math.min(index, POP_URLS.length - 1)], SOUND.popVolume, delayMs)

/** 트레이에 새 알이 생기는 소리 */
export const playNewDango = (delayMs = 0) => play(newDangoUrl, SOUND.newDangoVolume, delayMs)

/** 내가 주문서를 따냈을 때 */
export const playComplete = (delayMs = 0) => play(completeUrl, SOUND.completeVolume, delayMs)

/** 위에 새 주문서가 뜰 때 */
export const playNewOrder = (delayMs = 0) => play(newOrderUrl, SOUND.newOrderVolume, delayMs)

/** 틀린 알이 꼬치에 부딪힐 때 */
export const playWrong = (delayMs = 0) => play(wrongUrl, SOUND.wrongVolume, delayMs)

function unlock() {
  const c = getCtx()
  if (c && c.state !== 'running') c.resume().catch(() => {})
  if (!bgm) {
    bgm = new Audio(bgmUrl)
    bgm.loop = true
    bgm.volume = SOUND.bgmVolume
  }
  if (bgm.paused) bgm.play().catch(() => {})
}

/** 첫 사용자 입력에서 오디오 잠금 해제 + BGM 무한 재생 시작 */
export function initSound() {
  const opts = { capture: true } as const
  window.addEventListener('pointerdown', unlock, opts)
  window.addEventListener('keydown', unlock, opts)
  // 탭을 다시 열면 멈춘 BGM 을 이어서 튼다 (iOS 는 백그라운드에서 오디오를 멈춤)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && bgm) unlock()
  })
}
