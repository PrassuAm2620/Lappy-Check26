import { Component, HostListener, OnDestroy, signal } from '@angular/core'
import { CommonModule } from '@angular/common'

type Status = 'idle' | 'running' | 'pass' | 'fail' | 'skipped'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule], // provides *ngIf, *ngFor, [ngClass]
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnDestroy {
  // tabs
  tab = signal<'all' | 'audio' | 'input' | 'display'>('all')

  // statuses
  keyboardStatus = signal<Status>('idle')
  speakerStatus = signal<Status>('idle')
  micStatus = signal<Status>('idle')
  displayStatus = signal<Status>('idle')
  cameraStatus = signal<Status>('idle')

  // --- Keyboard tester ---
  pressed = new Set<string>()
  recentlyPressed: string[] = []
  maxRecent = 10

  // helper for template (Angular templates can't call global Array.from)
  pressedArray(): string[] {
    return Array.from(this.pressed)
  }

  // nice labels
  codeToLabel(code: string): string {
    const map: Record<string, string> = {
      Space: 'Space',
      Enter: 'Enter',
      Backspace: 'Bksp',
      ShiftLeft: 'Shift',
      ShiftRight: 'Shift',
      ControlLeft: 'Ctrl',
      ControlRight: 'Ctrl',
      AltLeft: 'Alt',
      AltRight: 'Alt',
      MetaLeft: 'Meta',
      MetaRight: 'Meta',
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
    }
    return map[code] ?? code.replace('Key', '').replace('Digit', '')
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (this.pressed.has(e.code) && e.repeat) return
    this.pressed.add(e.code)
    this.recentlyPressed.unshift(this.codeToLabel(e.code))
    if (this.recentlyPressed.length > this.maxRecent) this.recentlyPressed.pop()
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    this.pressed.delete(e.code)
  }

  clearPressed() {
    this.pressed.clear()
  }

  simulateKeyboardRun() {
    this.keyboardStatus.set('running')
    setTimeout(() => this.keyboardStatus.set('pass'), 600)
  }

  // --- Speakers test (Web Audio) ---
  private audioCtx?: AudioContext
  private osc?: OscillatorNode
  private gain?: GainNode
  private panner?: StereoPannerNode

  isTone = signal(false)
  freq = signal(440) // Hz
  vol = signal(0.2) // 0..1
  pan = signal(0) // -1..1

  ensureAudio() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (!this.gain && this.audioCtx) this.gain = new GainNode(this.audioCtx, { gain: this.vol() })
    if (!this.panner && this.audioCtx) this.panner = new StereoPannerNode(this.audioCtx, { pan: this.pan() })
  }

  startTone() {
    this.ensureAudio()
    if (!this.audioCtx) return

    // stop previous
    try {
      this.osc?.stop()
      this.osc?.disconnect()
    } catch {}

    this.osc = new OscillatorNode(this.audioCtx, { type: 'sine', frequency: this.freq() })
    // connect: osc -> panner -> gain -> destination
    this.osc.connect(this.panner!)
    this.panner!.connect(this.gain!)
    this.gain!.connect(this.audioCtx.destination)
    this.osc.start()

    this.isTone.set(true)
    this.speakerStatus.set('running')
  }

  stopTone() {
    try {
      this.osc?.stop()
      this.osc?.disconnect()
    } catch {}
    this.osc = undefined
    this.isTone.set(false)
    this.speakerStatus.set('pass')
  }

  setFreqFromEvent(ev: Event) {
    const v = Number((ev.target as HTMLInputElement).value)
    this.freq.set(v)
    if (this.osc) this.osc.frequency.value = v
  }

  setVolFromEvent(ev: Event) {
    const v = Number((ev.target as HTMLInputElement).value)
    this.vol.set(v)
    if (this.gain) this.gain.gain.value = v
  }

  setPanFromEvent(ev: Event) {
    const v = Number((ev.target as HTMLInputElement).value)
    this.pan.set(v)
    if (this.panner) this.panner.pan.value = v
  }

  // runSpeaker toggles tone for convenience
  runSpeaker() {
    if (this.isTone()) this.stopTone()
    else this.startTone()
  }

  // placeholders for other modules
  runMic() {
    this.micStatus.set('running')
    setTimeout(() => this.micStatus.set('pass'), 900)
  }
  runDisplay() {
    this.displayStatus.set('running')
    setTimeout(() => this.displayStatus.set('pass'), 900)
  }
  runCamera() {
    this.cameraStatus.set('running')
    setTimeout(() => this.cameraStatus.set('pass'), 900)
  }

  ngOnDestroy(): void {
    try {
      this.stopTone()
    } catch {}
    try {
      this.audioCtx?.close()
    } catch {}
  }
}
