import net from 'node:net';
import tls from 'node:tls';

/**
 * Cliente SMTP mínimo (sin dependencias) para envío real de correos.
 * Soporta TLS directo (465), STARTTLS (587/25) y AUTH LOGIN / PLAIN.
 * Si el servidor no está configurado, el sistema usa la bandeja de salida local.
 */
export function sendSmtpMail({ host, port = 465, secure = true, user, pass, fromEmail, fromName, to, subject, html, text }) {
  return new Promise((resolve, reject) => {
    let socket = secure
      ? tls.connect({ host, port, servername: host, rejectUnauthorized: false })
      : net.connect({ host, port });

    let buffer = '';
    let stage = 'greeting';
    let settled = false;
    let inData = false;
    const waiters = [];

    const timer = setTimeout(() => fail(new Error('Tiempo de espera SMTP agotado (20 s).')), 20000);

    function cleanup() {
      clearTimeout(timer);
      try { socket.end(); } catch { /* noop */ }
      try { socket.destroy(); } catch { /* noop */ }
    }
    function fail(err) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    }
    function succeed() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ ok: true });
    }

    function readResponse() {
      return new Promise((res) => waiters.push(res));
    }

    function processBuffer() {
      if (inData) return;
      // SMTP lines end with CRLF; multi-line replies use "250-".
      while (true) {
        const idx = buffer.indexOf('\r\n');
        if (idx < 0) break;
        const line = buffer.slice(0, idx);
        if (/^\d{3}-/.test(line)) {
          buffer = buffer.slice(idx + 2);
          continue;
        }
        if (/^\d{3} /.test(line)) {
          const code = Number(line.slice(0, 3));
          buffer = buffer.slice(idx + 2);
          const waiter = waiters.shift();
          if (waiter) waiter({ code, line });
          break;
        }
        buffer = buffer.slice(idx + 2);
      }
    }

    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      buffer += chunk;
      processBuffer();
    });
    socket.on('error', fail);
    socket.on('timeout', () => fail(new Error('Socket SMTP sin actividad.')));

    async function cmd(line, expected = [250]) {
      const promise = readResponse();
      socket.write(line + '\r\n');
      const res = await promise;
      if (!expected.includes(res.code)) throw new Error(`SMTP ${res.code}: ${res.line}`);
      return res;
    }

    async function auth() {
      if (!user || !pass) return;
      const res = await cmd(`EHLO kanba.local`);
      const supportsPlain = /AUTH[^\r\n]*PLAIN/i.test(res.line) || /AUTH[^\r\n]*PLAIN/i.test(buffer);
      if (supportsPlain) {
        await cmd(`AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`).toString('base64')}`, [235]);
      } else {
        await cmd(`AUTH LOGIN`, [334]);
        await cmd(Buffer.from(user).toString('base64'), [334]);
        await cmd(Buffer.from(pass).toString('base64'), [235]);
      }
    }

    async function start() {
      const greet = await readResponse();
      if (greet.code !== 220) throw new Error(`SMTP ${greet.code}: ${greet.line}`);

      let ehlo = await cmd('EHLO kanba.local');
      if (!secure && /STARTTLS/i.test(ehlo.line)) {
        await cmd('STARTTLS', [220]);
        socket.removeAllListeners('data');
        socket.removeAllListeners('error');
        buffer = '';
        socket = tls.connect({ socket, servername: host, rejectUnauthorized: false });
        socket.setEncoding('utf8');
        socket.on('data', (chunk) => { buffer += chunk; processBuffer(); });
        socket.on('error', fail);
        await cmd('EHLO kanba.local');
      }

      await auth();

      await cmd(`MAIL FROM:<${fromEmail}>`);
      await cmd(`RCPT TO:<${to}>`, [250, 251]);
      await cmd('DATA', [354]);

      const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
      const boundary = `kanba-${Date.now().toString(36)}`;
      const headers = [
        `From: "=?UTF-8?B?${Buffer.from(fromName, 'utf8').toString('base64')}?=" <${fromEmail}>`,
        `To: <${to}>`,
        `Subject: ${encodedSubject}`,
        `Date: ${new Date().toUTCString()}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`
      ];
      const payload = [
        ...headers,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        text,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        html,
        '',
        `--${boundary}--`
      ].join('\r\n');

      const dotted = payload
        .split('\r\n')
        .map((line) => (line.startsWith('.') ? '.' + line : line))
        .join('\r\n');

      inData = true;
      const finalPromise = readResponse();
      socket.write(dotted + '\r\n.\r\n');
      const finalRes = await finalPromise;
      inData = false;
      if (finalRes.code !== 250) throw new Error(`SMTP ${finalRes.code}: ${finalRes.line}`);
      try { await cmd('QUIT', [221, 250]); } catch { /* noop */ }
      succeed();
    }

    start().catch(fail);
  });
}
