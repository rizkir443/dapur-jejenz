const fs = require('fs');
const path = require('path');
const { JSDOM, ResourceLoader } = require('jsdom');

const indexPath = '/data/data/com.termux/files/home/dapur-jejenz/index.html';
const html = fs.readFileSync(indexPath, 'utf8');

class QuietLoader extends ResourceLoader {
  fetch() { return Promise.resolve(Buffer.from('')); }
}

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: new QuietLoader(),
  url: 'file://' + indexPath,
  pretendToBeVisual: true,
});

const { window } = dom;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  await wait(300);
  const document = window.document;

  // 1. reset state agar konsisten
  window.localStorage.removeItem('dapurJejenz.v1');

  // 2. pilih menu pertama
  const firstAddBtn = document.querySelector('#menuGrid .menu-card button');
  if (!firstAddBtn) throw new Error('menu card tidak ditemukan');
  firstAddBtn.click();

  // 3. pilih menu kedua
  const allAddButtons = document.querySelectorAll('#menuGrid .menu-card button');
  if (allAddButtons[1]) allAddButtons[1].click();
  if (allAddButtons[1]) allAddButtons[1].click();

  // 4. isi form
  document.getElementById('customerName').value = 'Mat Test';
  document.getElementById('orderNote').value = 'Tidak pakai es';

  // 5. intercept window.open supaya kita tidak benar-benar buka WhatsApp
  let openedUrl = null;
  window.open = (url) => { openedUrl = url; return null; };

  // 6. klik Order via WhatsApp
  const checkout = document.getElementById('checkoutBtn');
  if (!checkout) throw new Error('tombol checkout tidak ditemukan');
  checkout.click();

  await wait(150);

  if (!openedUrl) throw new Error('window.open tidak terpanggil');

  // 7. decode URL
  const u = new URL(openedUrl);
  const text = decodeURIComponent(u.searchParams.get('text') || '');

  // 8. validasi
  const ok = (cond, label) => `${cond ? 'OK' : 'FAIL'} - ${label}`;
  const lines = [];
  lines.push(ok(u.origin === 'https://wa.me', 'origin https://wa.me'));
  lines.push(ok(u.pathname.includes('6281414031098'), 'nomor WhatsApp tujuan benar'));
  lines.push(ok(/Halo Dapur Jejenz/.test(text), 'memuat sapaan'));
  lines.push(ok(/Mat Test/.test(text), 'memuat nama pelanggan'));
  lines.push(ok(/Tidak pakai es/.test(text), 'memuat catatan'));
  lines.push(ok(/Total:/.test(text), 'memuat total'));
  lines.push(ok(/Pesanan:/.test(text), 'memuat daftar pesanan'));
  lines.push(ok(/Rp\d/.test(text), 'memuat harga rupiah'));

  // 9. tampilkan hasil
  console.log('TEST WHATSAPP ORDER');
  console.log('===================');
  console.log('URL :', openedUrl);
  console.log('TEXT:');
  console.log(text);
  console.log('===================');
  console.log(lines.join('\n'));

  const allOk = lines.every((l) => l.startsWith('OK'));
  if (!allOk) process.exit(1);
}

run().catch((err) => { console.error(err); process.exit(2); });
