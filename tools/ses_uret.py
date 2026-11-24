# ses_uret.py — offline Turkish voice ("karma B") + word timings, no Whisper needed.
#   python ses_uret.py <script.txt> <voice.wav> <words.json> [model.onnx]
# Each phrase (split at , . : ? !) is synthesised alone with Piper, filtered (pitch .94, tempo 1.28, bass +2),
# trimmed, and joined with fixed pauses. Word times inside a phrase are spread by vowel count (≈ syllables).
import sys, json, re, subprocess, wave, io
import numpy as np
from piper import PiperVoice

script, out_wav, out_json = sys.argv[1], sys.argv[2], sys.argv[3]
model = sys.argv[4] if len(sys.argv) > 4 else '/home/claude/tts/vits-piper-tr_TR-fahrettin-medium/tr_TR-fahrettin-medium.onnx'
voice = PiperVoice.load(model)
SR = 22050
FILT = 'asetrate=22050*0.94,aresample=22050,atempo=1.28,bass=g=2'
PAUSE = {'.': .30, '!': .30, '?': .30, ':': .2, ',': .14, '': .06}

def synth(text):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w: voice.synthesize_wav(text, w)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', '-', '-af', FILT, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         input=buf.getvalue(), capture_output=True, check=True).stdout
    y = np.frombuffer(raw, np.float32).copy()
    e = np.abs(y) > .02
    if e.any():
        a, b = np.argmax(e), len(e) - np.argmax(e[::-1])
        y = y[max(0, a - 220):min(len(y), b + 660)]
    return y

text = open(script, encoding='utf-8').read().strip()
words = text.split()
# phrases: runs of words ending in punctuation
phrases, cur = [], []
for w in words:
    cur.append(w)
    p = w.rstrip('"\'”')[-1:]
    if p in '.,:?!': phrases.append((cur, p)); cur = []
if cur: phrases.append((cur, ''))
out, res, t = [], [], .05
out.append(np.zeros(int(.05 * SR), np.float32))
for ws, p in phrases:
    y = synth(' '.join(w.strip('"') for w in ws))
    d = len(y) / SR
    v = [max(1, len(re.findall(r'[aeıioöuüâîû]', w.lower()))) + .4 for w in ws]
    tot, acc = sum(v), 0
    for w, k in zip(ws, v):
        s = t + .03 + (d - .06) * acc / tot; acc += k; e = t + .03 + (d - .06) * acc / tot
        res.append({'word': w, 'start': round(s, 3), 'end': round(e, 3)})
    out.append(y); t += d
    pz = PAUSE.get(p, .06); out.append(np.zeros(int(pz * SR), np.float32)); t += pz
y = np.concatenate(out)
y = y / max(1e-6, np.abs(y).max()) * .89
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-ar', '24000', out_wav], input=y.tobytes(), check=True)
json.dump({'words': res, 'duration': round(len(y) / SR, 3)}, open(out_json, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('OK', len(res), 'words', round(len(y) / SR, 2), 's', round(len(res) / (len(y) / SR), 2), 'w/s')
