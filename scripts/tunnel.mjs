import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import qrcode from 'qrcode-terminal';

const port = process.env.TUNNEL_PORT ?? '3000';
const tunnel = spawn(
  'cloudflared',
  ['tunnel', '--no-autoupdate', '--url', `http://localhost:${port}`],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);

tunnel.on('error', (err) => {
  console.error(
    err.code === 'ENOENT'
      ? 'cloudflared no está en el PATH: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/'
      : err.message,
  );
  process.exit(1);
});

tunnel.on('exit', (code) => process.exit(code ?? 0));

let publicUrl = null;
let announced = false;

createInterface({ input: tunnel.stderr }).on('line', (line) => {
  publicUrl ??= line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0] ?? null;

  if (/\bERR\b/.test(line)) console.error(line);

  const tunnelIsReachable = line.includes('Registered tunnel connection');
  if (!publicUrl || !tunnelIsReachable || announced) return;

  announced = true;
  console.log(`\n  Túnel a :${port} → ${publicUrl}\n`);
  qrcode.generate(publicUrl, { small: true });
});
