import confetti from 'canvas-confetti'

export function fireConfetti() {
  const count = 200
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  }

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#22c55e', '#10b981'],
  })

  fire(0.2, {
    spread: 60,
    colors: ['#22c55e', '#10b981', '#f59e0b'],
  })

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#22c55e', '#3b82f6', '#f59e0b'],
  })

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    colors: ['#22c55e', '#10b981'],
  })

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#22c55e', '#10b981', '#f59e0b'],
  })
}

export function fireSmallConfetti(x: number, y: number) {
  confetti({
    particleCount: 30,
    spread: 60,
    origin: { x: x / window.innerWidth, y: y / window.innerHeight },
    colors: ['#22c55e', '#10b981', '#f59e0b'],
    zIndex: 9999,
    scalar: 0.8,
  })
}

export function fireSuccessConfetti() {
  const end = Date.now() + 500

  const colors = ['#22c55e', '#10b981']

  ;(function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
      zIndex: 9999,
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
      zIndex: 9999,
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  })()
}
