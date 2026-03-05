(function () {
    'use strict';

    const STATE = { stage: 1, attempts: 0, locked: false };
    const S1_PIN = '';
    let s1Pin = '';

    try { localStorage.setItem('_sys_k', '7'); } catch (e) { }
    console.log('%c[SPECTER-SYS] All modules up. sys-module-3 pending storage handshake.', 'color:#00e5ff;font-family:monospace;font-size:11px;font-weight:bold');
    console.table({ 'sys-module-1': 'loaded', 'sys-module-2': 'loaded', 'sys-module-3': 'check persistent storage' });

    const bgC = document.getElementById('bg-canvas');
    const bgX = bgC.getContext('2d');
    bgC.width = innerWidth;
    bgC.height = innerHeight;
    window.addEventListener('resize', () => { bgC.width = innerWidth; bgC.height = innerHeight; });
    (function noise() {
        const d = bgX.createImageData(bgC.width, bgC.height);
        for (let i = 0; i < d.data.length; i += 4) {
            const v = Math.random() > 0.5 ? 255 : 0;
            d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.floor(Math.random() * 25);
        }
        bgX.putImageData(d, 0, 0);
        requestAnimationFrame(noise);
    })();

    function genMem() {
        const el = document.getElementById('mem-content'); if (!el) return;
        let h = ''; for (let r = 0; r < 3; r++) {
            const a = (0x00FF2A00 + r * 16).toString(16).toUpperCase().padStart(8, '0');
            let b = '', c = ''; for (let i = 0; i < 16; i++) { const x = Math.floor(Math.random() * 256); b += x.toString(16).toUpperCase().padStart(2, '0') + ' '; c += (x >= 32 && x < 127) ? String.fromCharCode(x) : '.'; }
            h += `<div>${a}  ${b}|${c}|</div>`;
        } el.innerHTML = h;
    }
    genMem(); setInterval(genMem, 2000);

    let oscPhase = 0;
    function drawOsc() {
        const c = document.getElementById('osc-canvas'); if (!c || STATE.stage !== 2) return;
        const ctx = c.getContext('2d'), W = c.clientWidth * devicePixelRatio || 800, H = 90;
        c.width = W; c.height = H;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#010200'; ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = 'rgba(255,170,0,0.06)'; ctx.lineWidth = 1;
        for (let x = 0; x < W; x += W / 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        ctx.beginPath(); ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 2;
        ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 6;
        for (let x = 0; x < W; x++) {
            const t = x / W;
            const y = H / 2 + Math.sin(t * 25 + oscPhase) * 15 + Math.sin(t * 50 + oscPhase * 1.3) * 6 + Math.sin(t * 8 + oscPhase * 0.5) * 20;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.shadowBlur = 0;
        oscPhase += 0.08;
    }
    setInterval(drawOsc, 33);

    let primeT = 0;
    function drawPrimes() {
        const c = document.getElementById('prime-canvas'); if (!c || STATE.stage !== 3) return;
        const ctx = c.getContext('2d'), W = c.clientWidth || 700, H = 160;
        c.width = W; c.height = H;
        ctx.fillStyle = '#000002'; ctx.fillRect(0, 0, W, H);
        const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
        const COLS = 25, ROWS = 5, cw = W / COLS, rh = H / ROWS;
        primes.forEach((p, i) => {
            const col = i % COLS, row = Math.floor(i / COLS);
            const x = col * cw + cw / 2, y = row * rh + rh / 2;
            const fib = [2, 3, 5, 13, 89, 233, 1597, 28657].includes(p);
            const pulse = Math.sin(primeT * 2 + i * 0.7) * 0.3 + 0.7;
            ctx.font = `${fib ? 'bold ' : ''}${fib ? 13 : 10}px 'Share Tech Mono',monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = fib ? `rgba(189,0,255,${pulse})` : `rgba(80,40,120,${0.2 + Math.random() * 0.1})`;
            if (fib) { ctx.shadowColor = '#bd00ff'; ctx.shadowBlur = 10; }
            ctx.fillText(p, x, y);
            ctx.shadowBlur = 0;
        });

        for (let k = 0; k < 8; k++) {
            const big = 101 + k * 12;
            const bx = ((W / 8) * k + primeT * 20) % (W + 100) - 50;
            ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(100,50,150,0.12)';
            ctx.fillText(big, bx, H - 12);
        }
        primeT += 0.02;
    }
    setInterval(drawPrimes, 40);

    function incrAttempts() {
        STATE.attempts++;
        document.getElementById('global-attempts').textContent = STATE.attempts;
        document.getElementById('s1-att').textContent = STATE.attempts;
    }

    function updateNav(active) {
        ['sn1', 'sn2', 'sn3', 'sn4'].forEach((id, i) => {
            const el = document.getElementById(id); if (!el) return;
            el.className = 'sn-step';
            if (i + 1 < active) el.classList.add('done');
            else if (i + 1 === active) {
                el.classList.add('active');
                if (active === 2) el.classList.add('s2-active');
                if (active === 3) el.classList.add('s3-active');
            }
        });
    }

    function transitionTo(next, msg, sub, color, doneCallback) {
        const ov = document.getElementById('trans-overlay');
        const tc = document.getElementById('trans-canvas');
        const tt = document.getElementById('trans-text');
        const ts = document.getElementById('trans-sub');
        tt.style.color = color || '#00e5ff';
        tt.textContent = msg;
        ts.textContent = sub || '';
        ov.classList.add('active');
        const ctx = tc.getContext('2d');
        tc.width = innerWidth; tc.height = innerHeight;

        const animFns = { 2: glitchTransition, 3: binaryRainTransition, 4: shockwaveTransition };
        const anim = animFns[next] || glitchTransition;
        let elapsed = 0;
        function loop() {
            elapsed += 16;
            anim(ctx, tc.width, tc.height, elapsed);
            if (elapsed < 1800) requestAnimationFrame(loop);
            else {
                document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));
                if (next === 4) {
                    document.getElementById('stage-final').classList.add('active');
                    updateNav(4);
                } else {
                    document.getElementById('stage-' + next).classList.add('active');
                    updateNav(next);
                }
                STATE.stage = next;
                ov.classList.remove('active');
                ctx.clearRect(0, 0, tc.width, tc.height);
                if (doneCallback) doneCallback();
            }
        }
        requestAnimationFrame(loop);
    }

    function glitchTransition(ctx, W, H, t) {
        ctx.fillStyle = `rgba(0,0,0,${t < 900 ? 0.05 : 0.15})`;
        ctx.fillRect(0, 0, W, H);
        if (Math.random() > 0.3) {
            const colors = ['#ff2244', '#ffaa00', '#00e5ff', '#00ff88'];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)] + Math.floor(Math.random() * 50 + 10).toString(16).padStart(2, '0');
            ctx.fillRect(
                Math.random() * W, Math.random() * H,
                Math.random() * 200 + 20, Math.random() * 40 + 4
            );
        }
    }

    const MATRIX_CHARS = '01アイウエオカキクケコサシ0110111100';
    const matrixCols = [];
    function binaryRainTransition(ctx, W, H, t) {
        if (t === 16) { for (let i = 0; i < Math.floor(W / 16); i++) matrixCols[i] = Math.random() * H; }
        ctx.fillStyle = 'rgba(0,0,2,0.12)'; ctx.fillRect(0, 0, W, H);
        ctx.font = '14px Share Tech Mono'; ctx.fillStyle = 'rgba(0,255,136,0.8)';
        matrixCols.forEach((y, i) => {
            const ch = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
            ctx.fillText(ch, i * 16, y); matrixCols[i] = (y > H && Math.random() > .95) ? 0 : y + 18;
        });
    }

    function shockwaveTransition(ctx, W, H, t) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 0, W, H);
        const r = (t / 1800) * Math.max(W, H) * 0.8;
        const grad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
        grad.addColorStop(0, 'rgba(0,255,136,0.0)');
        grad.addColorStop(0.9, 'rgba(0,255,136,0.15)');
        grad.addColorStop(1, 'rgba(0,255,136,0.0)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
        if (Math.random() > .7) {
            ctx.fillStyle = `rgba(0,255,136,${Math.random() * 0.12})`;
            ctx.fillRect(0, Math.random() * H, W, Math.random() * 3 + 1);
        }
    }

    function doLockdown() {
        STATE.locked = true;
        const ld = document.getElementById('lockdown-overlay'); ld.classList.add('active');
        let t = 10; document.getElementById('ldo-timer').textContent = t;
        const iv = setInterval(() => {
            t--; document.getElementById('ldo-timer').textContent = t;
            if (t <= 0) { clearInterval(iv); ld.classList.remove('active'); STATE.locked = false; setS1Msg('>_ SYSTEM RESET. TRY AGAIN.', ''); }
        }, 1000);
    }

    function setS1Msg(txt, cls) { const el = document.getElementById('s1-msg'); el.textContent = txt; el.className = 'scn-msg' + (cls ? ' ' + cls : ''); }
    function refreshS1Display() {
        for (let i = 0; i < 6; i++) {
            const el = document.getElementById('p' + i);
            if (i < s1Pin.length) { el.textContent = s1Pin[i]; el.classList.remove('empty'); }
            else { el.textContent = '—'; el.classList.add('empty'); }
        }
    }

    window.s1Key = function (d) { if (STATE.locked || STATE.stage !== 1 || s1Pin.length >= 6) return; s1Pin += d.toString(); refreshS1Display(); setS1Msg('>_ INPUT RECEIVED...', ''); };
    window.s1Clr = function () { if (STATE.locked || STATE.stage !== 1) return; s1Pin = ''; refreshS1Display(); setS1Msg('>_ AWAITING OVERRIDE SEQUENCE', ''); };
    window.s1Sub = function () {
        if (STATE.locked || STATE.stage !== 1) return;
        if (s1Pin.length !== 6) { setS1Msg('>_ ERR: SEQUENCE INCOMPLETE', 'err'); shakeEl('s1-pin-row'); return; }
        setS1Msg('>_ VALIDATING...', '');
        setTimeout(() => {
            const sig = document.querySelector('meta[name="x-op-checksum"]');
            const mX = (sig ? atob(sig.content) : '').replace(/\D/g, '');
            const _xk = localStorage.getItem('_sys_k');
            const pt = s1Pin;

            // Checking logic without revealing the actual target numbers
            // Target equation used to be: (p * 7) - 105 === 4614589
            // We transform the evaluation:
            let pass = false;
            try {
                if (mX.length > 0 && _xk) {
                    const c1 = parseInt(pt, 10);
                    const c2 = parseInt(_xk, 10);
                    const tm = parseInt(mX, 10);
                    // 105 = 0x69
                    if (c2 > 0 && ((c1 * c2) - 0x69) === tm) pass = true;
                }
            } catch (e) { }

            if (pass) {
                setS1Msg('>_ CIPHER LOCK OPEN. ROUTING...', 'ok');
                document.getElementById('s1-status').textContent = 'ROUTING';
                setTimeout(() => transitionTo(2, 'CIPHER LOCK BREACHED', '// ROUTING TO SIGNAL TAP', '#00e5ff'), 800);
            } else {
                incrAttempts(); setS1Msg('>_ OVERRIDE REJECTED // ACCESS DENIED', 'err');
                shakeEl('s1-pin-row');
                s1Pin = ''; refreshS1Display();
                if (STATE.attempts > 0 && STATE.attempts % 3 === 0) doLockdown();
            }
        }, 600);
    };

    window.s2Sub = function () {
        if (STATE.stage !== 2) return;
        const inp = document.getElementById('s2-input');
        const val = inp.value.trim().toUpperCase();
        const msg = document.getElementById('s2-msg');
        inp.classList.remove('err', 'ok');
        if (btoa(val) === 'U0lHTUE=') {
            inp.classList.add('ok');
            msg.textContent = '>_ KEYWORD ACCEPTED. MOVING TO NEXT GATE...'; msg.className = 's2-msg ok';
            setTimeout(() => transitionTo(3, 'SIGNAL DECRYPTED', '// ACCESSING PRIME CORE', '#ffaa00'), 1000);
        } else {
            inp.classList.add('err');
            msg.textContent = '>_ DECRYPTION MISMATCH. RECHECK YOUR XOR.'; msg.className = 's2-msg err';
            incrAttempts();
            setTimeout(() => inp.classList.remove('err'), 500);
        }
    };
    document.addEventListener('keydown', (e) => {
        if (STATE.stage === 2 && e.key === 'Enter') s2Sub();
        if (STATE.stage === 3 && e.key === 'Enter') s3Sub();
        if (STATE.stage === 1) {
            if (e.key >= '0' && e.key <= '9') s1Key(parseInt(e.key));
            else if (e.key === 'Backspace' || e.key === 'Escape') s1Clr();
            else if (e.key === 'Enter') s1Sub();
        }
    });

    window.s3Sub = function () {
        if (STATE.stage !== 3) return;
        const inp = document.getElementById('s3-input');
        const val = parseInt(inp.value.trim(), 10);
        const msg = document.getElementById('s3-msg');
        inp.classList.remove('err', 'ok');
        if (val === parseInt('e9', 16)) {
            inp.classList.add('ok');
            msg.textContent = '>_ KEY VALIDATED. INITIATING VAULT UNLOCK SEQUENCE...'; msg.className = 's3-msg ok';
            setTimeout(() => transitionTo(4, 'PRIME CORE OFFLINE', '// VAULT UNSEALING... STAND BY', '#bd00ff', startVaultSequence), 1000);
        } else {
            inp.classList.add('err');
            msg.textContent = `>_ INCORRECT. Verify your FibPrime set and index.`; msg.className = 's3-msg err';
            incrAttempts();
            setTimeout(() => inp.classList.remove('err'), 500);
        }
    };

    function startVaultSequence() {
        initFinalCanvas();
        setTimeout(() => {
            document.getElementById('vault-wheel').classList.add('spinning');
        }, 300);
        setTimeout(() => {
            document.querySelectorAll('.vbolt').forEach(b => b.classList.add('retract'));
        }, 1800);
        setTimeout(() => {
            document.getElementById('vault-door-wrap').classList.add('vault-opening');
        }, 2400);
        setTimeout(() => { revealFinalText(); }, 3600);
    }

    function revealFinalText() {
        const ft = document.getElementById('final-text');
        const title = document.getElementById('ft-title');
        const flag = document.getElementById('ft-flag');
        ft.classList.add('show');

        const FINAL_TITLE = 'VAULT BREACHED';
        const glyph = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!$%&';
        let iters = 0; const MAX = 30;
        const iv = setInterval(() => {
            title.textContent = FINAL_TITLE.split('').map((ch, i) => {
                if (i < (iters / MAX) * FINAL_TITLE.length) return ch;
                return ch === ' ' ? ' ' : glyph[Math.floor(Math.random() * glyph.length)];
            }).join('');
            iters++;
            if (iters >= MAX) { title.textContent = FINAL_TITLE; clearInterval(iv); revealFlag(flag); }
        }, 60);
    }

    function revealFlag(el) {
        const _f = [67, 84, 70, 123, 116, 104, 114, 51, 51, 95, 108, 52, 121, 51, 114, 53, 95, 98, 114, 51, 52, 99, 104, 51, 100, 125];
        const FINAL = String.fromCharCode(..._f);
        const g = 'ABCDEFGHIJKLMNOPQRSTUVabcdef0123456789!@#{}[]';
        let it = 0; const MX = 40;
        const iv = setInterval(() => {
            el.textContent = FINAL.split('').map((ch, i) => {
                if (i < (it / MX) * FINAL.length) return ch;
                return ['_', '{', '}'].includes(ch) ? ch : g[Math.floor(Math.random() * g.length)];
            }).join('');
            it++;
            if (it >= MX) { el.textContent = FINAL; clearInterval(iv); }
        }, 55);
    }

    const FC_COLORS = ['#00ff88', '#00e5ff', '#ffaa00', '#fff', '#bd00ff'];
    let particles = [];
    function initFinalCanvas() {
        const c = document.getElementById('final-canvas');
        c.width = innerWidth; c.height = innerHeight;
        const ctx = c.getContext('2d');
        const cx = innerWidth / 2, cy = innerHeight / 2;
        for (let i = 0; i < 120; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = Math.random() * 4 + 1;
            particles.push({
                x: cx, y: cy, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
                r: Math.random() * 3 + 1, life: 1, col: FC_COLORS[Math.floor(Math.random() * FC_COLORS.length)]
            });
        }
        (function loop() {
            ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(0, 0, c.width, c.height);
            particles = particles.filter(p => p.life > 0.01);
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= 0.012;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
                ctx.fillStyle = p.col; ctx.globalAlpha = p.life;
                ctx.fill(); ctx.globalAlpha = 1;
            });
            if (particles.length > 0) requestAnimationFrame(loop);
            else ctx.clearRect(0, 0, c.width, c.height);
        })();
    }

    function shakeEl(id) {
        const el = document.getElementById(id); if (!el) return;
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        setTimeout(() => el.classList.remove('shake'), 500);
    }

})();