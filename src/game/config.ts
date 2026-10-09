// 게임 전체 튜닝 값을 한 곳에 모아둔 파일.
// 색상 / 크기 / 타이밍 / 난이도는 여기만 고치면 된다.

export const DANGO_COLORS = {
  sakura: { label: '벚꽃', hex: '#f79bb7', sheen: '#ffe4ec' },
  white: { label: '흰색', hex: '#fff9ee', sheen: '#fff6e8' },
  mugwort: { label: '쑥', hex: '#9fcd7c', sheen: '#eaffd8' },
  pumpkin: { label: '단호박', hex: '#fbcf5f', sheen: '#fff3cc' },
  mitarashi: { label: '미타라시', hex: '#b9784a', sheen: '#ffdcc0' },
} as const

export type DangoColor = keyof typeof DANGO_COLORS

/** 실제로 게임에 등장하는 색 (4~5종으로 조절) */
export const ACTIVE_COLORS: DangoColor[] = ['sakura', 'white', 'mugwort', 'pumpkin', 'mitarashi']

export const GAME = {
  roundSeconds: 60,
  countdownSeconds: 3,
  orderLengthMin: 3,
  orderLengthMax: 4,
  traySize: 10,
  stunMs: 600,
  /** 맞는 알이 트레이 → 꼬치로 날아가는 시간 */
  flightHitMs: 300,
  /** 틀린 알이 날아갔다가 튕겨 돌아오는 전체 시간 */
  flightMissMs: 520,
  /** 포물선 높이 (px) */
  flightArcPx: 90,
  /** 새 주문서가 뜬 뒤 입력을 받기 시작하기까지 */
  orderSwapDelayMs: 350,
  /** CPU 알이 위에서 떨어져 꽂히는 시간 */
  cpuDropMs: 220,
  /** 완성 꼬치가 접시로 빠지는 연출 시간 */
  finishAnimMs: 650,
}

export type Difficulty = 'easy' | 'normal' | 'hard'

export const DIFFICULTY: Record<Difficulty, { label: string; reactionMs: [number, number]; mistakeRate: number }> = {
  easy: { label: '쉬움', reactionMs: [1300, 1900], mistakeRate: 0.25 },
  normal: { label: '보통', reactionMs: [1000, 1500], mistakeRate: 0.2 },
  hard: { label: '어려움', reactionMs: [700, 1100], mistakeRate: 0.15 },
}

export const SIZES = {
  dangoRadius: 0.5,
  /** 살짝 눌린 구: y 스케일 */
  dangoSquashY: 0.86,
  /** 꼬치 위 알 간격 */
  slotSpacing: 0.86,
  /** 꼬치에서 첫 알 중심 높이 */
  slotBaseY: 0.5,
  skewerRadius: 0.055,
  skewerLength: 4.3,
  skewerColor: '#e9c98f',
  trayBallScale: 1.1,
  /** 대기 중 숨쉬기 진폭 */
  breatheAmp: 0.025,
  breatheSpeed: 2.2,
  /** 손으로 빚은 듯한 울퉁불퉁함 (반지름 대비 비율) */
  lumpAmp: 0.035,
  lumpFreq: 1.6,
  /** 모양 변형 가짓수 (seed 로 고름) */
  lumpVariants: 5,
}

export const MATERIAL = {
  /** 넓고 부드럽게 퍼지는 광택 (낮을수록 반짝, 높을수록 가루처럼 무광) */
  roughness: 0.55,
  /** 기본 반사 세기. 1 이면 고무/플라스틱처럼 하이라이트가 또렷하다 */
  specular: 0.55,
  sheen: 0.7,
  sheenRoughness: 0.6,
  /** 또렷한 코팅 광택은 고무처럼 보여서 아주 약하게만 */
  clearcoat: 0.12,
  clearcoatRoughness: 0.5,
  /** 반죽 결 요철 세기 */
  bumpScale: 0.3,
  /** 그림자 쪽이 회색으로 죽지 않게 자기 색으로 살짝 띄움 */
  emissive: 0.08,
}

/** 당고 표면 절차적 텍스처 */
export const TEXTURE = {
  /** 텍스처 세로 해상도 (가로는 2배) */
  size: 256,
  /** 반죽 결 촘촘함 */
  grainFreq: 30,
  /** 색 얼룩 크기 (작을수록 큰 얼룩) */
  mottleFreq: 4,
  /** 색 얼룩 세기 (0~1) */
  mottle: 0.1,
}

export const LIGHTS = {
  ambient: 0.5,
  /** 반구광: 위는 밝은 크림, 아래는 따뜻한 복숭아색 → 그림자가 따뜻하게 */
  skyColor: '#fffaf2',
  groundColor: '#f6d9c4',
  hemi: 0.95,
  warmColor: '#fff4e4',
  warm: 2.0,
  fillColor: '#e6efff',
  fill: 0.45,
  /** 뒤쪽 위에서 비추는 하얀 림 라이트: 알 테두리가 빛나서 입체감이 생김 */
  rimColor: '#ffffff',
  rim: 1.6,
  /** CPU 쪽은 살짝 어둡게 */
  cpuDim: 0.88,
}

export const SPRING = {
  squash: { tension: 520, friction: 12 },
  pop: { tension: 380, friction: 14 },
}

export const LAYOUT = {
  maxWidth: 430,
  topPct: 20,
  midPct: 50,
  bottomPct: 30,
  /** 중앙 영역에서 내 꼬치 칸 비율 (CPU = 1) */
  myColumnFlex: 1.35,
}

export const HAPTICS = {
  hit: 12 as number | number[],
  miss: [30, 40, 30] as number | number[],
}

/** 사운드 볼륨 (0~1) */
export const SOUND = {
  bgmVolume: 0.35,
  popVolume: 0.9,
  newDangoVolume: 0.6,
  completeVolume: 0.8,
  newOrderVolume: 0.6,
  wrongVolume: 0.8,
}

/** 친구 대전(PeerJS P2P) 설정 */
export const NET = {
  /** PeerJS 공개 시그널링 서버에서 쓰는 peer id 접두사 (뒤에 방 코드가 붙음) */
  peerPrefix: 'dangopang-',
  codeLength: 4,
  /** 헷갈리는 글자(0/O, 1/I)는 뺀 방 코드 문자 */
  codeChars: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  /** 게스트가 방에 붙기까지 기다리는 최대 시간 */
  connectTimeoutMs: 12000,
  /** 연결 확인용 ping 간격 / 이 시간 동안 아무 메시지도 없으면 끊긴 것으로 본다 */
  pingMs: 1500,
  deadMs: 6000,
  /** 게스트: 내 타이머가 끝난 뒤 호스트의 최종 점수를 기다리는 최대 시간 */
  endWaitMs: 2500,
  /** STUN 은 기본, TURN 은 환경변수가 있을 때만 (LTE 등에서 직접 연결이 안 될 때 중계) */
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    ...(import.meta.env.VITE_TURN_URL
      ? [
          {
            urls: import.meta.env.VITE_TURN_URL as string,
            username: import.meta.env.VITE_TURN_USER as string,
            credential: import.meta.env.VITE_TURN_PASS as string,
          },
        ]
      : []),
  ] as RTCIceServer[],
}
