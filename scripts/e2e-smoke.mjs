/**
 * Headless-Chrome CDP smoke test for the paginated reader build.
 * Usage: node scripts/e2e-smoke.mjs
 * Requires: `vite preview` running on :4173 and Chrome on CDP port 9223.
 */
import fs from 'node:fs/promises';

const CDP_URL = 'http://127.0.0.1:9223';
const APP = 'http://localhost:4173/';
const OUT = 'e2e-artifacts';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitHttp(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
    } catch {}
    await sleep(500);
  }
  throw new Error('endpoint never came up: ' + url);
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.pageErrors = [];
    this.consoleErrors = [];
    this.consoleLogs = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id) {
        const p = this.pending.get(m.id);
        if (!p) return;
        this.pending.delete(m.id);
        if (m.error) p.reject(new Error(JSON.stringify(m.error)));
        else p.resolve(m.result);
      } else if (m.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(m.params?.exceptionDetails?.text || 'exception');
      } else if (m.method === 'Runtime.consoleAPICalled') {
        const args = (m.params?.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
        if (m.params?.type === 'error') this.consoleErrors.push(args);
        else this.consoleLogs.push(`[${m.params?.type}] ${args}`);
      } else if (m.method === 'Log.entryAdded') {
        if (m.params?.entry?.level === 'error') {
          this.consoleErrors.push(m.params.entry.text);
        }
      }
    };
  }
  static async open(targetUrl) {
    const target = await fetch(
      `${CDP_URL}/json/new?${encodeURIComponent(targetUrl)}`,
      { method: 'PUT' }
    ).then((r) => r.json());
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    return new CDP(ws);
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async evalJS(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error(
        'eval failed: ' + JSON.stringify(r.exceptionDetails).slice(0, 500)
      );
    }
    return r.result?.value;
  }
  async waitFor(expression, timeoutMs = 15000, label = 'condition') {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (await this.evalJS(expression)) return true;
      await sleep(200);
    }
    throw new Error('timeout waiting for ' + label);
  }
  async screenshot(name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    await fs.mkdir(OUT, { recursive: true });
    await fs.writeFile(`${OUT}/${name}.png`, Buffer.from(r.data, 'base64'));
    return `${OUT}/${name}.png`;
  }
}

const stateExpr = `(() => {
  const el = document.querySelector('[data-hh-sub]');
  const sub = el ? parseInt(el.getAttribute('data-hh-sub') || '0', 10) : 0;
  const count = el ? parseInt(el.getAttribute('data-hh-count') || '0', 10) : 0;
  const h1 = document.querySelector('.hh-paged-sheet h1')?.textContent?.trim() || null;
  const canvas = document.querySelector('.hh-paged-sheet');
  const bar = (() => {
    const els = [...document.querySelectorAll('div,span')];
    for (const el of els) {
      const t = (el.textContent || '').trim();
      if (/^Page \\d+ \\/ \\d+$/.test(t) && el.children.length === 0) return t;
      if (/^第 \\d+ \\/ \\d+ 页$/.test(t) && el.children.length === 0) return t;
      if (/^全书 \\d+ \\/ \\d+ 页$/.test(t) && el.children.length === 0) return t;
      if (/^Book page \\d+ \\/ \\d+$/.test(t) && el.children.length === 0) return t;
    }
    return null;
  })();
  return { page: count > 0 ? sub + 1 : 0, total: count, h1, canvas: !!canvas, bar,
    dbg: el ? {
      sub: el.getAttribute('data-hh-sub'), count: el.getAttribute('data-hh-count'),
      ch: el.getAttribute('data-hh-ch'), rp: el.getAttribute('data-hh-rp'), paged: el.getAttribute('data-hh-paged'),
    } : null };
})()`;

async function main() {
  await waitHttp(`${CDP_URL}/json/version`);
  await waitHttp(`${APP}index.html`);
  // Close any leftover app tabs from previous runs, then open one fresh tab.
  const existing = await fetch(`${CDP_URL}/json/list`).then((r) => r.json());
  for (const t of existing) {
    if (t.type === 'page' && (t.url.includes('4173') || t.url === 'about:blank')) {
      await fetch(`${CDP_URL}/json/close/${t.id}`).catch(() => {});
    }
  }
  await sleep(600);

  const c = await CDP.open(APP);
  globalThis.__hhClient = c;
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Log.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: 400,
    height: 760,
    deviceScaleFactor: 1,
    mobile: true,
  });

  const out = {};

  // Kill any service worker so we always exercise the freshly built bundle.
  await c.evalJS(
    `(async () => { if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); } })()`
  );
  await sleep(400);
  await c.send('Page.reload', { ignoreCache: true });
  await c.waitFor(`document.querySelectorAll('h3').length > 0`, 20000, 'library');
  // Reset persisted reading progress/settings so every run starts fresh.
  await c.evalJS(`localStorage.clear(); true`);
  await c.send('Page.reload', { ignoreCache: true });
  await c.waitFor(`document.querySelectorAll('h3').length > 0`, 20000, 'library');
  out.library = await c.evalJS(`document.querySelectorAll('h3').length`);

  // 2. Open "The Time Machine"
  const opened = await c.evalJS(`(() => {
    const cards = [...document.querySelectorAll('[class*="cursor-pointer"]')];
    const card = cards.find((el) => {
      const h = el.querySelector('h3');
      return h && h.textContent.includes('The Time Machine');
    });
    if (!card) return false;
    card.click();
    return true;
  })()`);
  if (!opened) throw new Error('could not find The Time Machine card');
  await c.evalJS(`(() => {
    window.__evlog = [];
    const push = (kind, e) => {
      const t = e.target;
      window.__evlog.push(kind + '|' + (e.key || '') + '|trusted=' + e.isTrusted + '|x=' + (e.clientX ?? '') + '|y=' + (e.clientY ?? '') + '|cls=' + (t && t.className ? String(t.className).slice(0, 50) : '') + '|txt=' + (t && t.textContent ? t.textContent.trim().slice(0, 25) : ''));
    };
    window.addEventListener('keydown', (e) => push('kd', e), true);
    window.addEventListener('click', (e) => push('cl', e), true);
    window.addEventListener('touchend', (e) => push('te', e), true);
    return true;
  })()`);
  try {
    await c.waitFor(
      `(() => { const el = document.querySelector('[data-hh-sub]'); if (!el || !document.querySelector('.hh-paged-sheet')) return false; const count = parseInt(el.getAttribute('data-hh-count') || '0', 10); const sub = parseInt(el.getAttribute('data-hh-sub') || '0', 10); return count > 0 && sub === 0; })()`,
      20000,
      'reader page1'
    );
  } catch (err) {
    const body = await c.evalJS(`document.body ? document.body.innerText.slice(0, 700) : 'NOBODY'`);
    const sheet = await c.evalJS(`document.querySelector('.hh-paged-sheet') ? 'yes' : 'no'`);
    const evlog = await c.evalJS(`(window.__evlog || []).join('\\n')`);
    await c.screenshot('00-timeout');
    throw new Error(`${err.message}; sheet=${sheet}; evlog>>>${evlog}<<< body>>>${body}<<<`);
  }

  // give fonts/measure time to settle
  await sleep(1200);
  const s1 = await c.evalJS(stateExpr);
  out.s1 = s1;
  await c.screenshot('01-paged-chapter1-p1');
  if (!s1.canvas) throw new Error('paged sheet not rendered');
  if (s1.total === null || s1.total < 1 || s1.page !== 1) {
    throw new Error('unexpected initial state: ' + JSON.stringify(s1));
  }
  if (s1.total < 3) {
    // Chapter 1 is short-ish; still expect multiple pages at 400px width
    throw new Error('suspiciously few pages: ' + JSON.stringify(s1));
  }
  const firstTotal = s1.total;

  // 3. ArrowRight => next real page (same chapter), animation + count stable
  await c.evalJS(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))`);
  await sleep(300);
  await c.screenshot('02-page-turn-slide-mid');
  await sleep(500);
  const s2 = await c.evalJS(stateExpr);
  out.s2 = s2;
  if (s2.page !== 2 || s2.total !== firstTotal || s2.h1 !== s1.h1) {
    throw new Error('page 2 flip wrong: ' + JSON.stringify(s2));
  }

  // 4. Sweep to the last page then cross into chapter II
  let guard = 0;
  let last = s2;
  while (guard++ < 300) {
    await c.evalJS(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))`);
    await sleep(320);
    last = await c.evalJS(stateExpr);
    if (!last.h1 || last.h1 !== s1.h1) break; // chapter changed
    if (last.page === last.total) break;
  }
  out.afterSweep = last;
  await sleep(500);
  const s3 = await c.evalJS(stateExpr);
  out.s3 = s3;
  // Depending on where chapter I ends we either reached its last page or chapter II page 1.
  if (!(s3.h1 && s3.h1 !== s1.h1)) {
    // press one more time if still on chapter I last page
    await c.evalJS(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))`);
    await sleep(900);
  }
  const s4 = await c.evalJS(stateExpr);
  out.s4 = s4;
  if (!s4.h1 || s4.h1 === s1.h1) {
    throw new Error('did not advance into next chapter: ' + JSON.stringify(s4));
  }
  if (s4.page !== 1) {
    throw new Error('next chapter should open on page 1: ' + JSON.stringify(s4));
  }
  await c.screenshot('03-chapter2-page1');

  // 5. ArrowLeft from chapter II page 1 => back to last page of chapter I (cached count)
  await c.evalJS(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft'}))`);
  await sleep(1200);
  const s5 = await c.evalJS(stateExpr);
  out.s5 = s5;
  if (!(s5.h1 && s5.h1 === s1.h1)) {
    throw new Error('did not return to chapter I: ' + JSON.stringify(s5));
  }
  if (s5.page !== s5.total) {
    throw new Error('should land on LAST page of chapter I: ' + JSON.stringify(s5));
  }
  await c.screenshot('04-back-to-ch1-lastpage');

  // 6. Forward from the last page of chapter I => next chapter page 1
  await c.evalJS(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))`);
  await sleep(1100);
  const s6 = await c.evalJS(stateExpr);
  out.s6 = s6;
  if (!(s6.h1 && s6.h1 !== s1.h1 && s6.page === 1)) {
    throw new Error('step6 should advance to next chapter page 1: ' + JSON.stringify(s6));
  }

  // 7. Landscape resize: reflows while preserving chapter/page
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: 760,
    height: 400,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await sleep(900);
  const s7 = await c.evalJS(stateExpr);
  out.s7 = s7;
  if (s7.canvas !== true || s7.h1 !== s6.h1 || s7.page !== s6.page) {
    throw new Error('landscape reflow broke reader: ' + JSON.stringify(s7));
  }
  await c.screenshot('05-landscape-reflow');

  out.pageErrors = c.pageErrors;
  out.consoleErrors = c.consoleErrors.slice(0, 10);
  out.consoleLogs = c.consoleLogs.slice(-40);
  console.log(JSON.stringify(out, null, 2));
  const fatal =
    c.pageErrors.length > 0
      ? c.pageErrors.join('; ')
      : c.consoleErrors.filter((e) => !/favicon|fonts\.g|net::|ERR_/i.test(e)).length
        ? 'console errors: ' + c.consoleErrors.join('; ')
        : null;
  if (fatal) {
    console.error('E2E PROBLEMS: ' + fatal);
    process.exit(2);
  }
  console.log('E2E OK');
  c.ws.close();
}

main().catch((e) => {
  console.error('E2E FAILED: ' + e.message);
  if (globalThis.__hhClient) {
    const c = globalThis.__hhClient;
    console.error('pageErrors:', JSON.stringify(c.pageErrors));
    console.error('consoleErrors:', JSON.stringify(c.consoleErrors.slice(0, 20)));
    console.error('consoleLogs tail:', JSON.stringify(c.consoleLogs.slice(-30)));
  }
  process.exit(1);
});
