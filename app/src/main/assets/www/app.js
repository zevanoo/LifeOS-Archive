'use strict';
/* LifeOS app UI. Depends on core.js (window.LifeOS). */
const L = window.LifeOS;
let S = L.load();
let curDate = L.todayISO();          // journal tab
let curMonth = L.monthKey(L.todayISO()); // money tab
let curList = 'all';                 // tasks filter
let hideDone = false;
let editingId = null;
let saveTimer = null;
let selTxType = 'out';
let deferredPrompt = null;
let recMode = 'week', recOff = 0;    // recap

/* native bridge (Android WebView) */
const BRIDGE = () => (typeof AndroidBridge !== 'undefined') ? AndroidBridge : null;
function pushReminders() {
  const b = BRIDGE();
  if (!b) return;
  b.pushReminders(JSON.stringify(S.reminders.map(r => ({ id: r.id, title: r.title, at: r.at, active: !!r.active, done: !!r.done, fired: !!r.fired, created: r.created }))));
}
window.LifeBridge = {
  setReminders: function (json) {
    try { const arr = JSON.parse(json); if (Array.isArray(arr)) { S.reminders = arr; save(); render(); } } catch (e) {}
  }
};

if (!L.hasData()) seed();

/* ---------- i18n ---------- */
const EN = {
  'Hari Ini': 'Today', 'Tugas': 'Tasks', 'Keuangan': 'Money', 'Pengingat': 'Reminders',
  'Pengaturan': 'Settings', 'Catatan': 'Notes', 'Uang': 'Money', 'Alarm': 'Alarm', 'Recap': 'Recap',
  'Cari catatan…': 'Search notes…', 'Folder': 'Folders',
  'Belum ada folder. Buat sub folder dari ikon folder di atas.': 'No folders yet. Create one from the folder icon above.',
  'Disematkan': 'Pinned', 'Sematkan catatan penting lewat menu ⋮': 'Pin important notes via the ⋮ menu',
  'Terbaru': 'Recent', 'Belum ada catatan. Tekan + untuk mulai.': 'No notes yet. Tap + to start.',
  'Sub folder': 'Subfolders', 'Folder kosong. Tekan + untuk catatan baru.': 'Empty folder. Tap + for a new note.',
  'Buat sub folder': 'New subfolder', 'Judul catatan…': 'Note title…', 'Tulis markdown di sini…': 'Write markdown here…',
  'Disimpan otomatis': 'Auto-saved', 'Tanpa isi': 'Empty', 'Catatan baru': 'New note',
  'Sematkan': 'Pin', 'Lepas sematan': 'Unpin', 'Pindah folder': 'Move folder', 'Ekspor .md': 'Export .md',
  'Hapus catatan': 'Delete note', 'Hapus catatan ini? Tidak bisa dibatalkan.': 'Delete this note? Cannot be undone.',
  'Folder baru': 'New folder', 'Nama folder': 'Folder name', 'Nama folder wajib diisi': 'Folder name is required',
  'Buat': 'Create', 'Pindah ke folder': 'Move to folder', 'Pindah': 'Move',
  'Simpan': 'Save', 'Batal': 'Cancel', 'Tutup': 'Close', 'Konfirmasi': 'Confirm', 'Ya': 'Yes', 'Hapus': 'Delete',
  'Kembali ke hari ini': 'Back to today', 'Mood': 'Mood', '✅ Sudah kukerjakan': '✅ Done',
  'Aktivitas yang sudah dilakukan…': 'Activity you have done…', '⏳ Belum / To-do': '⏳ To-do',
  'Yang masih harus dilakukan…': 'Still to do…', '📓 Catatan jurnal': '📓 Journal note',
  'Refleksi harian, markdown didukung…': 'Daily reflection, markdown supported…',
  '🚩 Deadline hari ini': '🚩 Deadlines today', 'Lihat di tab Tugas': 'See Tasks tab',
  'Tidak ada deadline hari ini': 'No deadlines today', '🔔 Pengingat hari ini': '🔔 Reminders today',
  'Tidak ada pengingat hari ini': 'No reminders today', 'Kosong': 'Empty',
  '📊 Recap mingguan & bulanan': '📊 Weekly & monthly recap',
  'Minggu': 'Week', 'Bulan': 'Month', 'Minggu ini': 'This week', 'Bulan ini': 'This month',
  'Dibuat': 'Created', 'Diselesaikan': 'Completed', 'Tingkat penyelesaian': 'Completion rate',
  'Masih terbuka': 'Still open', 'Deadline terlewat': 'Missed deadlines', 'Jurnal': 'Journal',
  'Hari aktif': 'Active days', 'Mood terbanyak': 'Top mood', 'Belum ada jurnal di periode ini': 'No journal entries this period',
  'Pemasukan': 'Income', 'Pengeluaran': 'Expenses', 'Saldo bersih': 'Net', 'Kategori pengeluaran terbesar': 'Top expense category',
  'Belum ada transaksi di periode ini': 'No transactions this period', 'Diperbarui': 'Updated',
  'Berbunyi': 'Fired', 'Aktif': 'Active', 'Tidak ada data': 'No data',
  'Semua': 'All', 'Sembunyikan selesai': 'Hide completed', 'Tugas baru': 'New task',
  'Apa yang harus dikerjakan?': 'What needs to be done?', 'Deadline': 'Deadline', '★ Penting': '★ Important',
  'Tambah': 'Add', '🔴 Terlambat': '🔴 Overdue', '🟠 Hari ini': '🟠 Today', '🔵 7 hari ke depan': '🔵 Next 7 days',
  'Mendatang / tanpa tanggal': 'Upcoming / no date', '✅ Selesai': '✅ Done',
  'Terlambat': 'Overdue', 'Hari ini': 'Today', 'Besok': 'Tomorrow',
  'Tidak ada tugas. Tambahkan di atas.': 'No tasks. Add one above.',
  'Tandai selesai': 'Mark done', 'Tandai belum selesai': 'Mark not done', 'Edit': 'Edit',
  'Edit tugas': 'Edit task', 'Hapus tugas ini?': 'Delete this task?',
  'Saldo total': 'Total balance', 'Pemasukan bulan ini': 'Income this month', 'Pengeluaran bulan ini': 'Expenses this month',
  'Anggaran': 'Budget', '{n}% terpakai': '{n}% used', 'Ubah anggaran': 'Change budget',
  'Set anggaran bulan ini': 'Set this month budget', 'Pengeluaran per kategori': 'Expenses by category',
  'Pemasukan per kategori': 'Income by category', 'Transaksi': 'Transactions',
  'Belum ada transaksi bulan ini. Tekan + untuk mencatat.': 'No transactions this month. Tap + to add.',
  'Belum ada pemasukan bulan ini.': 'No income this month.', 'Belum ada pengeluaran bulan ini.': 'No expenses this month.',
  'Transaksi baru': 'New transaction', 'Edit transaksi': 'Edit transaction',
  'Pengeluaran': 'Expense', 'Jumlah (Rp)': 'Amount (Rp)', 'Kategori': 'Category',
  'Catatan (opsional)': 'Note (optional)', 'Jumlah harus lebih dari 0': 'Amount must be more than 0',
  'Browser tidak mendukung notifikasi. Pengingat tetap muncul saat app terbuka.': 'Browser does not support notifications. Reminders still appear while the app is open.',
  'Notifikasi diblokir. Aktifkan di pengaturan browser untuk alarm saat app tertutup.': 'Notifications are blocked. Enable them in browser settings for alarms while the app is closed.',
  'Izinkan notifikasi agar alarm bisa berbunyi walau app tertutup.': 'Allow notifications so alarms can ring even when the app is closed.',
  'Izinkan': 'Allow', 'Pengingat baru': 'New reminder', 'Kegiatan apa? (mis. minum obat)': 'What activity? (e.g. take medicine)',
  'Simpan pengingat': 'Save reminder', 'Akan berbunyi': 'Upcoming', 'Sudah berbunyi': 'Fired',
  'Belum ada pengingat. Tambahkan di atas.': 'No reminders yet. Add one above.',
  'Judul pengingat wajib diisi': 'Reminder title is required', 'Edit pengingat': 'Edit reminder',
  'Tunda 5 menit': 'Snooze 5 min', 'Ditunda 5 menit': 'Snoozed 5 min', 'Hapus pengingat ini?': 'Delete this reminder?',
  'Notifikasi diizinkan 🔔': 'Notifications allowed 🔔', 'Notifikasi ditolak': 'Notifications denied',
  'Waktunya:': 'Time:', 'Beres ✅': 'Done ✅', 'Nanti (5 menit)': 'Later (5 min)', 'Selesai': 'Done',
  'Tema': 'Theme', 'Warna utama': 'Primary color', 'Warna kustom': 'Custom color', 'Mode': 'Mode',
  'Terang': 'Light', 'Gelap': 'Dark', 'Sistem': 'System', 'Kepadatan': 'Density',
  'Padat': 'Compact', 'Nyaman': 'Comfortable', 'Bahasa': 'Language', 'Bahasa Indonesia': 'Bahasa Indonesia',
  'English (US)': 'English (US)', 'Data & Backup': 'Data & Backup',
  'Semua data tersimpan lokal di perangkat ini. Ekspor JSON secara berkala agar aman.': 'All data is stored locally on this device. Export JSON regularly to stay safe.',
  'Ekspor backup (JSON)': 'Export backup (JSON)', 'Impor backup': 'Import backup', 'Hapus semua data': 'Erase all data',
  'Hapus SEMUA data (catatan, tugas, keuangan, pengingat)? Tindakan ini permanen!': 'Erase ALL data (notes, tasks, money, reminders)? This is permanent!',
  'Aplikasi': 'App',
  'LifeOS v1.1 • super app offline pengatur hidup: catatan markdown, jurnal harian, tugas & deadline, keuangan, pengingat.': 'LifeOS v1.1 • offline life-management super app: markdown notes, daily journal, tasks & deadlines, money, reminders.',
  'Pasang aplikasi ke layar utama': 'Install app to home screen',
  '💡 Buka menu browser → <b>Tambahkan ke layar utama</b> agar LifeOS terasa seperti aplikasi native.': '💡 Open browser menu → <b>Add to Home screen</b> so LifeOS feels like a native app.',
  'Backup diekspor': 'Backup exported', 'Backup berhasil diimpor': 'Backup imported', 'File backup tidak valid': 'Invalid backup file'
};
const t = s => (S.lang === 'en' && EN[s] !== undefined ? EN[s] : s);

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function pad2(n) { return String(n).padStart(2, '0'); }
function save() { L.save(S); }
function emptyState(msg) { return '<div class="empty">' + esc(msg) + '</div>'; }
function snack(msg) {
  let el = $('#snack');
  if (!el) { el = document.createElement('div'); el.id = 'snack'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2600);
}
function modalOpen() { return !!document.querySelector('.backdrop'); }
function closeModal() { const b = document.querySelector('.backdrop'); if (b) b.remove(); }
function modal(o) {
  closeModal();
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  const actions = o.ok != null
    ? '<div class="sheet-actions"><button class="btn" data-m="cancel">' + esc(o.cancel || t('Batal')) + '</button><button class="btn btn-primary" data-m="ok">' + esc(o.ok) + '</button></div>'
    : '<div class="sheet-actions"><button class="btn" data-m="cancel">' + esc(o.cancel || t('Tutup')) + '</button></div>';
  bd.innerHTML = '<div class="sheet"><div class="sheet-title">' + esc(o.title) + '</div><div class="sheet-body">' + o.body + '</div>' + actions + '</div>';
  document.body.appendChild(bd);
  bd.addEventListener('click', e => {
    const el2 = e.target;
    if (el2 === bd || el2.dataset.m === 'cancel') return closeModal();
    if (el2.dataset.m === 'ok') { const res = o.onOk && o.onOk(); if (res !== false) closeModal(); }
  });
  const f = bd.querySelector('input,select,textarea'); if (f) setTimeout(() => f.focus(), 50);
}
function confirmModal(msg, onYes) {
  modal({ title: t('Konfirmasi'), body: '<p class="muted">' + esc(msg) + '</p>', ok: t('Ya'), onOk: () => { onYes(); } });
}
function menuModal(title, items) {
  const body = items.map(it => '<button class="menu-item' + (it.danger ? ' danger' : '') + '" data-act="' + it.act + '" data-id="' + esc(it.id || '') + '">' + (it.icon ? icon(it.icon) : '') + '<span>' + esc(it.label) + '</span></button>').join('');
  modal({ title: title, body: body, ok: null, cancel: t('Tutup') });
}
function segSel(cur, opts, act) {
  return '<div class="seg">' + opts.map(([v, lab]) => '<button class="seg-btn' + (cur === v ? ' on' : '') + '" data-act="' + act + '" data-extra="' + v + '">' + lab + '</button>').join('') + '</div>';
}

/* ---------- icons (Material, 24dp) ---------- */
const I = {
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  folder: 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z',
  folderOpen: 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z',
  search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
  note: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  bell: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
  wallet: 'M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  today: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z',
  list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  gear: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
  dark: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6V6z',
  light: 'M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z',
  dl: 'M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z',
  ul: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  flag: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z',
  clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
  eye: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  chevL: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z',
  chevR: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
  checkCircle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  alarm: 'M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37V8zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
  chart: 'M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z'
};
function icon(n, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + I[n] + '"/></svg>'; }

/* ---------- seed data (first run) ---------- */
function seed() {
  const now = Date.now();
  S.folders.push({ id: 'f-selamat', name: 'Selamat Datang', parent: 'root' });
  S.notes.push({
    id: 'n-selamat', folderId: 'f-selamat', title: 'Selamat datang di LifeOS 👋', pinned: true, created: now, updated: now,
    md: '## Semua data tersimpan **offline** di HP kamu.\n\n### Yang bisa dilakukan:\n- 📝 **Catatan** — markdown + folder bersarang\n- ⭐ **Hari Ini** — jurnal harian: sudah/belum dikerjakan, mood, deadline\n- ✅ **Tugas** — checklist + deadline + prioritas\n- 💰 **Keuangan** — pemasukan/pengeluaran + anggaran bulanan\n- 🔔 **Pengingat** — alarm kegiatan\n- 📊 **Recap** — rekap mingguan & bulanan\n- 🎨 **Pengaturan** — ganti tema, bahasa, backup JSON\n\nCoba buat catatan baru dengan tombol **+** di kanan bawah.'
  });
  S.notes.push({
    id: 'n-md', folderId: 'f-selamat', title: 'Contoh Markdown', pinned: false, created: now, updated: now,
    md: '# Heading 1\n## Heading 2\n\n**tebal**, *miring*, ~~coret~~, `kode`\n\n- [x] tugas selesai\n- [ ] tugas belum\n\n> kutipan\n\n| Fitur | Status |\n|---|---|\n| Markdown | ✅ |\n| Offline | ✅ |\n\n---\n\n```js\n// blok kode dengan syntax highlighting\nconst greet = (name) => `Halo, ${name}!`;\nfunction main() {\n  const list = [1, 2, 3];\n  if (list.length > 0) {\n    console.log(greet(\"dunia\"));\n  }\n}\nmain();\n```'
  });
  save();
}

/* ---------- theme ---------- */
function isDark() {
  return S.theme.mode === 'dark' || (S.theme.mode === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
}
function applyTheme() {
  const dark = isDark();
  const p = L.palette(S.theme.seed, dark);
  const r = document.documentElement.style;
  Object.entries(p).forEach(([k, v]) => r.setProperty('--' + k, v));
  r.setProperty('--pad', S.theme.density === 'padat' ? '10px' : '16px');
  r.setProperty('--fs', S.theme.density === 'padat' ? '14px' : '16px');
  document.documentElement.dataset.mode = dark ? 'dark' : 'light';
  const mt = document.querySelector('meta[name="theme-color"]');
  if (mt) mt.setAttribute('content', p.background);
  $('#view').scrollTop = 0;
}

/* ---------- routing ---------- */
function parseHash() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean); }
function folderName(id) { const f = S.folders.find(x => x.id === id); return f ? f.name : '?'; }
function folderDepth(id) { let d = 0, cur = id; while (cur && cur !== 'root') { const f = S.folders.find(x => x.id === cur); if (!f) break; cur = f.parent; d++; } return d; }
function folderOptions(sel) {
  const opts = ['<option value="root">— ' + t('Catatan') + ' —</option>'];
  S.folders.filter(f => f.id !== 'root').forEach(f => {
    const ind = '&nbsp;'.repeat(Math.max(0, folderDepth(f.id) - 1) * 3);
    opts.push('<option value="' + esc(f.id) + '"' + (f.id === sel ? ' selected' : '') + '>' + ind + esc(f.name) + '</option>');
  });
  return opts.join('');
}
function noteIn(id) { return S.notes.find(n => n.id === id); }
function notesInFolder(fid) { return S.notes.filter(n => n.folderId === fid); }
function countNotes(fid) {
  let c = notesInFolder(fid).length;
  S.folders.filter(f => f.parent === fid).forEach(f => c += countNotes(f.id));
  return c;
}
function ancestors(id) { const a = []; let cur = id; while (cur && cur !== 'root') { const f = S.folders.find(x => x.id === cur); if (!f) break; a.unshift(f); cur = f.parent; } return a; }
function snippet(n) { return esc(n.md.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 90) || t('Tanpa isi')); }
function noteUpdated(n) { return L.fmtDateShort(L.dateISO(new Date(n.updated))) || ''; }
function dueLabel(iso) {
  if (!iso) return '';
  const td = L.todayISO();
  if (iso < td) return t('Terlambat');
  if (iso === td) return t('Hari ini');
  if (iso === L.addDays(td, 1)) return t('Besok');
  return L.fmtDateShort(iso);
}
function catColor(name) { let h = 0; for (const c of name) h = (h * 31 + (c.codePointAt(0) || 0)) % 360; return 'hsl(' + h + ' 65% 45%)'; }
function jGet(d) { return S.journal[d] || (S.journal[d] = { mood: '', did: [], todo: [], text: '' }); }
function renderMd(el, src) {
  el.innerHTML = L.mdToHtml(src);
  el.querySelectorAll('pre code[class^="lang-"]').forEach(c => {
    const lang = c.className.replace('lang-', '');
    c.innerHTML = L.highlightCode(c.textContent, lang);
  });
}

/* ---------- top bar / nav / fab ---------- */
function setTopbar(name, parts) {
  const tb = $('#topbar');
  const modeIcon = isDark() ? 'light' : 'dark';
  const gear = '<button class="btn-icon" data-act="goto" data-extra="settings" aria-label="' + t('Pengaturan') + '">' + icon('gear') + '</button>';
  const modeBtn = '<button class="btn-icon" data-act="themeToggle" aria-label="Mode">' + icon(modeIcon) + '</button>';
  if (name === 'note') {
    const n = noteIn(parts[1]);
    tb.innerHTML = '<button class="btn-icon" data-act="edBack">' + icon('back') + '</button>' +
      '<input id="edTitle" class="ed-title" placeholder="' + esc(t('Judul catatan…')) + '" value="' + esc(n ? n.title : '') + '">' +
      '<button class="btn-icon" data-act="togglePreview" aria-label="Pratinjau">' + icon('eye') + '</button>' +
      '<button class="btn-icon" data-act="noteMenu" data-id="' + esc(parts[1]) + '" aria-label="Menu">' + icon('more') + '</button>';
  } else if (name === 'folder') {
    tb.innerHTML = '<button class="btn-icon" data-act="folderBack" data-id="' + esc(parts[1]) + '">' + icon('back') + '</button>' +
      '<div class="ttl">' + esc(folderName(parts[1])) + '</div><div class="spacer"></div>' +
      '<button class="btn-icon" data-act="newFolder" data-id="' + esc(parts[1]) + '" aria-label="' + t('Buat sub folder') + '">' + icon('folderOpen') + '</button>' + gear;
  } else if (name === 'recap') {
    tb.innerHTML = '<button class="btn-icon" data-act="goto" data-extra="today">' + icon('back') + '</button>' +
      '<div class="ttl">' + t('Recap') + '</div><div class="spacer"></div>' + modeBtn + gear;
  } else {
    const titles = { notes: 'LifeOS', today: t('Hari Ini'), tasks: t('Tugas'), money: t('Keuangan'), reminders: t('Pengingat'), settings: t('Pengaturan') };
    tb.innerHTML = '<div class="ttl">' + titles[name] + '</div><div class="spacer"></div>' + modeBtn + gear;
  }
}
function setNav(name) {
  const items = [['notes', 'note', t('Catatan')], ['today', 'today', t('Hari Ini')], ['tasks', 'list', t('Tugas')], ['money', 'wallet', t('Uang')], ['reminders', 'alarm', t('Alarm')]];
  $('#bottom').innerHTML = items.map(([n, ic, label]) =>
    '<button class="nav-item' + (name === n ? ' active' : '') + '" data-act="goto" data-extra="' + n + '">' + icon(ic) + '<span>' + label + '</span></button>').join('');
}
function setFab(name, parts) {
  const fab = $('#fab');
  if (name === 'notes') fab.innerHTML = '<button class="fab" data-act="newNote" data-id="root" aria-label="' + t('Catatan baru') + '">' + icon('add') + '</button>';
  else if (name === 'folder') fab.innerHTML = '<button class="fab" data-act="newNote" data-id="' + esc(parts[1]) + '" aria-label="' + t('Catatan baru') + '">' + icon('add') + '</button>';
  else if (name === 'money') fab.innerHTML = '<button class="fab" data-act="txAdd" aria-label="' + t('Transaksi baru') + '">' + icon('add') + '</button>';
  else fab.innerHTML = '';
}

function render() {
  flushEditor();
  L.setLang(S.lang || 'id');
  const parts = parseHash();
  const name = parts[0] || 'notes';
  setTopbar(name, parts);
  setNav(name);
  setFab(name, parts);
  const view = $('#view');
  if (name === 'note') renderEditor(parts[1]);
  else if (name === 'folder') renderFolder(parts[1]);
  else if (name === 'today') renderToday();
  else if (name === 'tasks') renderTasks();
  else if (name === 'money') renderMoney();
  else if (name === 'reminders') renderReminders();
  else if (name === 'recap') renderRecap();
  else if (name === 'settings') renderSettings();
  else renderNotes();
  applyTheme();
}

/* ================= NOTES ================= */
function renderNotes() {
  const pinned = S.notes.filter(n => n.pinned).sort((a, b) => b.updated - a.updated);
  const recent = S.notes.filter(n => !n.pinned).sort((a, b) => b.updated - a.updated).slice(0, 15);
  const folders = S.folders.filter(f => f.parent === 'root');
  const card = f => '<button class="folder-card" data-act="openFolder" data-id="' + esc(f.id) + '">' +
    '<span class="ficon">' + icon('folder') + '</span><span class="fname">' + esc(f.name) + '</span>' +
    '<span class="fcount">' + countNotes(f.id) + '</span></button>';
  const row = n => '<div class="row search-item" data-searchtext="' + esc(n.title + ' ' + n.md) + '" data-act="openNote" data-id="' + esc(n.id) + '">' +
    '<span class="note-ico">' + icon('note') + '</span>' +
    '<div class="grow"><div class="t1">' + esc(n.title) + '</div><div class="t2">' + snippet(n) + ' • ' + noteUpdated(n) + '</div></div>' +
    '<button class="btn-icon" data-act="noteMenu" data-id="' + esc(n.id) + '">' + icon('more') + '</button></div>';
  $('#view').innerHTML =
    '<div class="searchbar"><input class="field" id="noteSearch" placeholder="' + esc(t('Cari catatan…')) + '" data-search="notes-list" autocomplete="off">' + icon('search', 'sico') + '</div>' +
    '<div class="section-title">' + t('Folder') + '</div>' +
    (folders.length ? '<div class="grid">' + folders.map(card).join('') + '</div>' : emptyState(t('Belum ada folder. Buat sub folder dari ikon folder di atas.'))) +
    '<div class="section-title">' + t('Disematkan') + '</div>' +
    (pinned.length ? '<div class="notes-list">' + pinned.map(row).join('') + '</div>' : emptyState(t('Sematkan catatan penting lewat menu ⋮'))) +
    '<div class="section-title">' + t('Terbaru') + '</div>' +
    (recent.length ? '<div class="notes-list">' + recent.map(row).join('') + '</div>' : '') +
    (S.notes.length === 0 ? emptyState(t('Belum ada catatan. Tekan + untuk mulai.')) : '');
}

function renderFolder(id) {
  const subs = S.folders.filter(f => f.parent === id);
  const notes = notesInFolder(id).sort((a, b) => b.updated - a.updated);
  const crumbs = ancestors(id);
  const row = n => '<div class="row search-item" data-searchtext="' + esc(n.title + ' ' + n.md) + '" data-act="openNote" data-id="' + esc(n.id) + '">' +
    '<span class="note-ico">' + icon('note') + '</span>' +
    '<div class="grow"><div class="t1">' + esc(n.title) + '</div><div class="t2">' + snippet(n) + ' • ' + noteUpdated(n) + '</div></div>' +
    '<button class="btn-icon" data-act="noteMenu" data-id="' + esc(n.id) + '">' + icon('more') + '</button></div>';
  $('#view').innerHTML =
    '<div class="crumbs"><button class="crumb" data-act="goto" data-extra="notes">' + t('Catatan') + '</button>' +
    crumbs.map(f => '<span class="csep">›</span><button class="crumb" data-act="openFolder" data-id="' + esc(f.id) + '">' + esc(f.name) + '</button>').join('') + '</div>' +
    (subs.length ? '<div class="section-title">' + t('Sub folder') + '</div><div class="grid">' +
      subs.map(f => '<button class="folder-card" data-act="openFolder" data-id="' + esc(f.id) + '">' + icon('folder', 'ficon') + '<span class="fname">' + esc(f.name) + '</span><span class="fcount">' + countNotes(f.id) + '</span></button>').join('') + '</div>' : '') +
    '<div class="section-title">' + t('Catatan') + '</div>' +
    (notes.length ? '<div class="notes-list">' + notes.map(row).join('') + '</div>' : emptyState(t('Folder kosong. Tekan + untuk catatan baru.'))) +
    (subs.length === 0 ? '<button class="btn btn-tonal btn-block" data-act="newFolder" data-id="' + esc(id) + '">' + icon('folderOpen') + ' ' + t('Buat sub folder') + '</button>' : '');
}

function renderEditor(id) {
  const n = noteIn(id);
  if (!n) { location.hash = '#/notes'; return; }
  editingId = id;
  $('#view').innerHTML =
    '<div class="tb">' +
    [['bold', 'B'], ['italic', 'I'], ['strike', 'S̶'], ['code', '</>'], ['h1', 'H1'], ['h2', 'H2'], ['quote', '❝'], ['ul', '•≡'], ['task', '☑'], ['link', '🔗'], ['hr', '—'], ['table', '⊞']].map(f =>
      '<button class="tb-btn" data-act="fmt" data-extra="' + f[0] + '" title="' + f[0] + '">' + f[1] + '</button>').join('') + '</div>' +
    '<div id="edWrap"><textarea id="edBody" class="md-in" placeholder="' + esc(t('Tulis markdown di sini…')) + '">' + esc(n.md) + '</textarea>' +
    '<div id="edPrev" class="md-preview" hidden></div></div>' +
    '<div class="ed-meta">' + t('Disimpan otomatis') + '</div>';
  const ta = $('#edBody'), prev = $('#edPrev');
  const update = () => {
    renderMd(prev, ta.value);
    if (!n.title) n.title = t('Catatan baru');
    n.md = ta.value; n.updated = Date.now();
    clearTimeout(saveTimer); saveTimer = setTimeout(save, 400);
    ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
  };
  ta.addEventListener('input', update);
  $('#edTitle').addEventListener('input', e => { n.title = e.target.value || t('Catatan baru'); n.updated = Date.now(); clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); });
  update();
}

function flushEditor() {
  if (!editingId) return;
  const ta = $('#edBody'), ti = $('#edTitle');
  const n = noteIn(editingId);
  if (n && ta) { n.md = ta.value; n.title = ti ? (ti.value || t('Catatan baru')) : n.title; n.updated = Date.now(); }
  save();
  editingId = null;
}

function newNote(folderId) {
  const n = { id: L.uid(), folderId: folderId || 'root', title: t('Catatan baru'), md: '', pinned: false, created: Date.now(), updated: Date.now() };
  S.notes.push(n); save();
  location.hash = '#/note/' + n.id;
}

/* ================= JOURNAL ================= */
function renderToday() {
  const j = jGet(curDate);
  const today = L.todayISO();
  const deads = S.tasks.filter(t => !t.done && t.due === curDate);
  const rems = S.reminders.filter(r => !r.done && (r.at || '').slice(0, 10) === curDate);
  const moods = ['😄', '🙂', '😐', '😟', '😫'];
  const chkRow = (list, txt, i) =>
    '<div class="chk-row"><button class="cb' + (list === 'did' ? ' on' : '') + '" data-act="jToggle" data-extra="' + list + '" data-i="' + i + '" aria-label="toggle">' + (list === 'did' ? icon('check') : '') + '</button>' +
    '<span class="chk-txt">' + esc(txt) + '</span>' +
    '<button class="btn-icon sm" data-act="jDel" data-extra="' + list + '" data-i="' + i + '" aria-label="hapus">' + icon('close') + '</button></div>';
  $('#view').innerHTML =
    '<div class="jnav"><button class="btn-icon" data-act="jPrev">' + icon('chevL') + '</button>' +
    '<div class="jdate">' + (curDate === today ? '<b>' + t('Hari ini') + '</b> • ' : '') + esc(L.fmtDate(curDate)) + '</div>' +
    '<button class="btn-icon" data-act="jNext">' + icon('chevR') + '</button></div>' +
    (curDate !== today ? '<div class="center"><button class="chip" data-act="jToday">' + t('Kembali ke hari ini') + '</button></div>' : '') +
    '<div class="section-title">' + t('Mood') + '</div>' +
    '<div class="mood-row">' + moods.map(m => '<button class="mood' + (j.mood === m ? ' on' : '') + '" data-act="mood" data-extra="' + m + '">' + m + '</button>').join('') + '</div>' +
    '<div class="card"><div class="card-title">' + t('✅ Sudah kukerjakan') + '</div>' +
    (j.did.length ? j.did.map((tt, i) => chkRow('did', tt, i)).join('') : emptyState(t('Kosong'))) +
    '<div class="addline"><input id="didInput" class="field" placeholder="' + esc(t('Aktivitas yang sudah dilakukan…')) + '"><button class="btn-icon" data-act="jAdd" data-extra="did">' + icon('add') + '</button></div></div>' +
    '<div class="card"><div class="card-title">' + t('⏳ Belum / To-do') + '</div>' +
    (j.todo.length ? j.todo.map((tt, i) => chkRow('todo', tt, i)).join('') : emptyState(t('Kosong'))) +
    '<div class="addline"><input id="todoInput" class="field" placeholder="' + esc(t('Yang masih harus dilakukan…')) + '"><button class="btn-icon" data-act="jAdd" data-extra="todo">' + icon('add') + '</button></div></div>' +
    '<div class="card"><div class="card-title">' + t('📓 Catatan jurnal') + ' <button class="btn-icon sm float-r" data-act="jPrevToggle">' + icon('eye') + '</button></div>' +
    '<textarea id="jText" class="md-in" placeholder="' + esc(t('Refleksi harian, markdown didukung…')) + '">' + esc(j.text) + '</textarea>' +
    '<div id="jPrevOut" class="md-preview" hidden></div></div>' +
    '<div class="card"><div class="card-title">' + t('🚩 Deadline hari ini') + '</div>' +
    (deads.length ? deads.map(tk => '<div class="row" data-act="goto" data-extra="tasks"><div class="grow"><div class="t1">' + esc(tk.text) + '</div><div class="t2">' + t('Lihat di tab Tugas') + '</div></div>' + icon('flag', 'sico') + '</div>').join('') : emptyState(t('Tidak ada deadline hari ini'))) + '</div>' +
    '<div class="card"><div class="card-title">' + t('🔔 Pengingat hari ini') + '</div>' +
    (rems.length ? rems.map(r => '<div class="row" data-act="goto" data-extra="reminders"><div class="grow"><div class="t1">' + esc(r.title) + '</div><div class="t2">' + esc((r.at || '').split('T')[1] || '') + '</div></div>' + icon('bell', 'sico') + '</div>').join('') : emptyState(t('Tidak ada pengingat hari ini'))) + '</div>' +
    '<button class="btn btn-tonal btn-block" data-act="goto" data-extra="recap">' + icon('chart') + ' ' + t('📊 Recap mingguan & bulanan') + '</button>';
  const jt = $('#jText');
  if (jt) jt.addEventListener('input', () => { j.text = jt.value; renderMd($('#jPrevOut'), jt.value); save(); });
}

/* ================= RECAP ================= */
function recRange() {
  const now = new Date();
  if (recMode === 'week') {
    const dow = (now.getDay() + 6) % 7; // Monday start
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + recOff * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return [L.dateISO(start), L.dateISO(end)];
  }
  const d = new Date(now.getFullYear(), now.getMonth() + recOff, 1);
  return [L.dateISO(d), L.dateISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))];
}
function recapData() {
  const [a, b] = recRange();
  const inR = iso => iso && iso.slice(0, 10) >= a && iso.slice(0, 10) <= b;
  const tasks = S.tasks.filter(t => inR(L.dateISO(new Date(t.created))));
  const doneT = S.tasks.filter(t => t.done && inR(L.dateISO(new Date(t.updated))));
  const tx = S.tx.filter(t => inR(t.date));
  const notesC = S.notes.filter(n => inR(L.dateISO(new Date(n.created))));
  const notesU = S.notes.filter(n => inR(L.dateISO(new Date(n.updated))));
  const remFired = S.reminders.filter(r => r.fired && inR((r.at || '').slice(0, 10))).length;
  const remDone = S.reminders.filter(r => r.done && inR((r.at || '').slice(0, 10))).length;
  let jDays = 0; const moods = {};
  for (const [d, j] of Object.entries(S.journal)) {
    if (d >= a && d <= b && (j.text || j.did.length || j.todo.length || j.mood)) jDays++;
    if (j.mood && d >= a && d <= b) moods[j.mood] = (moods[j.mood] || 0) + 1;
  }
  const topMood = Object.entries(moods).sort((x, y) => y[1] - x[1])[0] ? Object.entries(moods).sort((x, y) => y[1] - x[1])[0][0] : '';
  const inS = tx.filter(x => x.type === 'in').reduce((s, x) => s + x.amount, 0);
  const outS = tx.filter(x => x.type === 'out').reduce((s, x) => s + x.amount, 0);
  const outBy = {};
  tx.filter(x => x.type === 'out').forEach(x => outBy[x.cat] = (outBy[x.cat] || 0) + x.amount);
  const topCat = Object.entries(outBy).sort((x, y) => y[1] - x[1])[0] || null;
  const open = S.tasks.filter(t => !t.done).length;
  const overdue = S.tasks.filter(t => !t.done && t.due && t.due < L.todayISO()).length;
  const rate = tasks.length ? Math.round(doneT.length / tasks.length * 100) : 0;
  return { a, b, tasks: tasks.length, doneT: doneT.length, rate, open, overdue, tx: tx.length, inS, outS, topCat, notesC: notesC.length, notesU: notesU.length, remFired, remDone, jDays, topMood };
}
function renderRecap() {
  const d = recapData();
  const [a, b] = recRange();
  const label = recMode === 'week' ? L.fmtDateShort(a) + ' – ' + L.fmtDateShort(b) : L.monthLabel(a.slice(0, 7));
  const kv = (k, v, cls) => '<div class="rec-row"><span>' + t(k) + '</span><b class="' + (cls || '') + '">' + v + '</b></div>';
  $('#view').innerHTML =
    '<div class="jnav"><button class="btn-icon" data-act="recPrev">' + icon('chevL') + '</button>' +
    '<div class="jdate">' + esc(label) + '</div>' +
    '<button class="btn-icon" data-act="recNext">' + icon('chevR') + '</button></div>' +
    '<div class="center">' + segSel(recMode, [['week', t('Minggu')], ['month', t('Bulan')]], 'recMode') + '</div>' +
    '<div class="card"><div class="card-title">✅ ' + t('Tugas') + '</div>' +
    kv('Dibuat', d.tasks) + kv('Diselesaikan', d.doneT) +
    '<div class="rec-row"><span>' + t('Tingkat penyelesaian') + '</span><div class="rec-bar"><div class="bar"><i style="width:' + d.rate + '%"></i></div><b>' + d.rate + '%</b></div></div>' +
    kv('Masih terbuka', d.open) + (d.overdue ? kv('Deadline terlewat', d.overdue, 'neg') : '') + '</div>' +
    '<div class="card"><div class="card-title">📓 ' + t('Jurnal') + '</div>' +
    (d.jDays ? kv('Hari aktif', d.jDays) + (d.topMood ? kv('Mood terbanyak', d.topMood) : '') : emptyState(t('Belum ada jurnal di periode ini'))) + '</div>' +
    '<div class="card"><div class="card-title">💰 ' + t('Keuangan') + '</div>' +
    (d.tx ? kv('Pemasukan', L.fmtIDR(d.inS)) + kv('Pengeluaran', L.fmtIDR(d.outS), 'neg') + kv('Saldo bersih', L.fmtIDR(d.inS - d.outS), d.inS - d.outS < 0 ? 'neg' : '') +
      (d.topCat ? kv('Kategori pengeluaran terbesar', esc(d.topCat[0]) + ' (' + L.fmtIDR(d.topCat[1]) + ')') : '') : emptyState(t('Belum ada transaksi di periode ini'))) + '</div>' +
    '<div class="card"><div class="card-title">📝 ' + t('Catatan') + '</div>' +
    kv('Dibuat', d.notesC) + kv('Diperbarui', d.notesU) + '</div>' +
    '<div class="card"><div class="card-title">🔔 ' + t('Pengingat') + '</div>' +
    kv('Berbunyi', d.remFired) + kv('Selesai', d.remDone) + '</div>';
}

/* ================= TASKS ================= */
function tasksFiltered() { return S.tasks.filter(x => curList === 'all' || x.list === curList); }
function renderTasks() {
  const groups = { late: [], today: [], soon: [], later: [], done: [] };
  const today = L.todayISO();
  const byDate = (a, b) => (a.due || '9999') < (b.due || '9999') ? -1 : 1;
  tasksFiltered().forEach(tk => {
    if (tk.done) { if (!hideDone) groups.done.push(tk); return; }
    if (tk.due) {
      if (tk.due < today) groups.late.push(tk);
      else if (tk.due === today) groups.today.push(tk);
      else if (tk.due <= L.addDays(today, 7)) groups.soon.push(tk);
      else groups.later.push(tk);
    } else groups.later.push(tk);
  });
  ['late', 'today', 'soon', 'later', 'done'].forEach(k => groups[k].sort((a, b) => (b.prio - a.prio) || byDate(a, b)));
  const titles = { late: t('🔴 Terlambat'), today: t('🟠 Hari ini'), soon: t('🔵 7 hari ke depan'), later: t('Mendatang / tanpa tanggal'), done: t('✅ Selesai') };
  const row = (tk, g) => {
    const list = S.lists.find(x => x.id === tk.list);
    const dueTxt = g === 'soon' ? dueLabel(tk.due) : (tk.due ? L.fmtDateShort(tk.due) : '');
    return '<div class="row task-row" data-act="tMenu" data-id="' + esc(tk.id) + '">' +
      '<button class="cb' + (tk.done ? ' on' : '') + '" data-act="tToggle" data-id="' + esc(tk.id) + '" aria-label="selesai">' + (tk.done ? icon('check') : '') + '</button>' +
      '<div class="grow"><div class="t1' + (tk.done ? ' done-txt' : '') + '">' + esc(tk.text) + '</div>' +
      '<div class="badges">' + (tk.due ? '<span class="badge ' + (g === 'late' ? 'b-red' : g === 'today' ? 'b-orange' : '') + '">' + esc(dueTxt) + '</span>' : '') +
      (tk.prio ? '<span class="badge b-red">' + t('★ Penting') + '</span>' : '') +
      (list ? '<span class="b-dot" style="background:' + esc(list.color) + '"></span>' : '') + '</div></div>' + icon('more', 'sico') + '</div>';
  };
  let html = '<div class="filter-row">' +
    '<button class="chip' + (curList === 'all' ? ' on' : '') + '" data-act="tfList" data-extra="all">' + t('Semua') + '</button>' +
    S.lists.map(l => '<button class="chip' + (curList === l.id ? ' on' : '') + '" data-act="tfList" data-extra="' + esc(l.id) + '">' + esc(l.name) + '</button>').join('') +
    '<button class="chip' + (hideDone ? ' on' : '') + '" data-act="tfHide">' + t('Sembunyikan selesai') + '</button></div>' +
    '<div class="card"><div class="card-title">' + t('Tugas baru') + '</div>' +
    '<input id="tText" class="field" placeholder="' + esc(t('Apa yang harus dikerjakan?')) + '">' +
    '<div class="form-row">' +
    '<input id="tDue" type="date" class="field half" title="' + t('Deadline') + '">' +
    '<select id="tList" class="field half">' + S.lists.map(l => '<option value="' + esc(l.id) + '">' + esc(l.name) + '</option>').join('') + '</select></div>' +
    '<div class="form-row"><label class="prio"><input type="checkbox" id="tPrio"> ' + t('★ Penting') + '</label>' +
    '<button class="btn btn-primary" data-act="tAdd">' + t('Tambah') + '</button></div></div>';
  let any = false;
  Object.keys(groups).forEach(k => {
    if (!groups[k].length) return;
    any = true;
    html += '<div class="section-title">' + titles[k] + ' <span class="cnt">' + groups[k].length + '</span></div>' +
      groups[k].map(x => row(x, k)).join('');
  });
  html += any ? '' : emptyState(t('Tidak ada tugas. Tambahkan di atas.'));
  $('#view').innerHTML = html;
}

/* ================= MONEY ================= */
function renderMoney() {
  const mk = curMonth;
  const month = S.tx.filter(x => x.date.slice(0, 7) === mk);
  const sum = (arr, type) => arr.filter(x => x.type === type).reduce((a, x) => a + x.amount, 0);
  const mIn = sum(month, 'in'), mOut = sum(month, 'out');
  const allIn = sum(S.tx, 'in'), allOut = sum(S.tx, 'out');
  const bal = allIn - allOut;
  const budget = S.budget[mk];
  const used = budget ? Math.round(mOut / budget * 100) : 0;
  const bars = type => {
    const arr = month.filter(x => x.type === type);
    if (!arr.length) return emptyState(type === 'in' ? t('Belum ada pemasukan bulan ini.') : t('Belum ada pengeluaran bulan ini.'));
    const tot = arr.reduce((a, x) => a + x.amount, 0);
    const by = {};
    arr.forEach(x => by[x.cat] = (by[x.cat] || 0) + x.amount);
    return Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, v]) =>
      '<div class="bar-line"><div class="bl-name"><span class="b-dot" style="background:' + catColor(c) + '"></span>' + esc(c) + '<b>' + L.fmtIDR(v) + '</b></div>' +
      '<div class="bar"><i style="width:' + Math.round(v / tot * 100) + '%;background:' + catColor(c) + '"></i></div></div>').join('');
  };
  const days = {};
  month.sort((a, b) => b.date.localeCompare(a.date)).forEach(x => (days[x.date] = days[x.date] || []).push(x));
  const txRows = Object.keys(days).sort((a, b) => b.localeCompare(a)).map(dd =>
    '<div class="section-title sm">' + esc(L.fmtDate(dd)) + '</div>' +
    days[dd].map(x =>
      '<div class="row"><span class="tx-dot" style="background:' + catColor(x.cat) + '"></span>' +
      '<div class="grow"><div class="t1">' + esc(x.cat) + (x.note ? ' — ' + esc(x.note) : '') + '</div></div>' +
      '<div class="amt ' + x.type + '">' + (x.type === 'in' ? '+' : '−') + L.fmtIDR(x.amount) + '</div>' +
      '<button class="btn-icon sm" data-act="txMenu" data-id="' + esc(x.id) + '">' + icon('more') + '</button></div>').join('')).join('');
  $('#view').innerHTML =
    '<div class="mnav"><button class="btn-icon" data-act="mPrev">' + icon('chevL') + '</button>' +
    '<div class="jdate">' + esc(L.monthLabel(mk)) + '</div>' +
    '<button class="btn-icon" data-act="mNext">' + icon('chevR') + '</button></div>' +
    '<div class="card balance"><div class="bl">' + t('Saldo total') + '</div><div class="big ' + (bal >= 0 ? '' : 'neg') + '">' + L.fmtIDR(bal) + '</div>' +
    '<div class="inout"><div class="in"><div>' + t('Pemasukan bulan ini') + '</div><b>+' + L.fmtIDR(mIn) + '</b></div>' +
    '<div class="out"><div>' + t('Pengeluaran bulan ini') + '</div><b>−' + L.fmtIDR(mOut) + '</b></div></div>' +
    (budget != null ? '<div class="budget"><div class="bl-name">' + t('Anggaran') + ': <b>' + L.fmtIDR(budget) + '</b> <span class="' + (used > 100 ? 'neg' : '') + '">' + t('{n}% terpakai').replace('{n}', used) + '</span></div>' +
      '<div class="bar"><i style="width:' + Math.min(100, used) + '%;background:' + (used > 100 ? 'var(--error)' : 'var(--primary)') + '"></i></div>' +
      '<button class="btn btn-tonal sm-btn" data-act="mBudget">' + t('Ubah anggaran') + '</button></div>' :
      '<button class="btn btn-tonal sm-btn" data-act="mBudget">' + t('Set anggaran bulan ini') + '</button>') + '</div>' +
    '<div class="card"><div class="card-title">' + t('Pengeluaran per kategori') + '</div>' + bars('out') + '</div>' +
    '<div class="card"><div class="card-title">' + t('Pemasukan per kategori') + '</div>' + bars('in') + '</div>' +
    '<div class="card"><div class="card-title">' + t('Transaksi') + '</div>' + (txRows || emptyState(t('Belum ada transaksi bulan ini. Tekan + untuk mencatat.'))) + '</div>';
}

function txModal(tx) {
  const isEdit = !!tx;
  selTxType = tx ? tx.type : 'out';
  const cats = S.cats[selTxType] || [];
  const body = '<div class="seg" id="txType"><button class="seg-btn' + (selTxType === 'out' ? ' on' : '') + '" data-tx="out">' + t('Pengeluaran') + '</button>' +
    '<button class="seg-btn' + (selTxType === 'in' ? ' on' : '') + '" data-tx="in">' + t('Pemasukan') + '</button></div>' +
    '<input id="txAmt" type="number" inputmode="numeric" class="field big-field" placeholder="' + t('Jumlah (Rp)') + '" value="' + (tx ? tx.amount : '') + '">' +
    '<input id="txCat" class="field" list="catList" placeholder="' + t('Kategori') + '" value="' + esc(tx ? tx.cat : (selTxType === 'out' ? 'Makan' : 'Gaji')) + '">' +
    '<datalist id="catList">' + cats.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist>' +
    '<input id="txNote" class="field" placeholder="' + t('Catatan (opsional)') + '" value="' + esc(tx ? tx.note : '') + '">' +
    '<input id="txDate" type="date" class="field" value="' + (tx ? tx.date : L.todayISO()) + '">';
  modal({
    title: isEdit ? t('Edit transaksi') : t('Transaksi baru'), body: body, ok: t('Simpan'),
    onOk: () => {
      const amt = Math.round(Number($('#txAmt').value) || 0);
      if (amt <= 0) { snack(t('Jumlah harus lebih dari 0')); return false; }
      const dd = { type: selTxType, amount: amt, cat: $('#txCat').value.trim() || 'Lainnya', note: $('#txNote').value.trim(), date: $('#txDate').value || L.todayISO() };
      if (isEdit) Object.assign(tx, dd); else { dd.id = L.uid(); S.tx.push(dd); }
      save(); renderMoney();
    }
  });
  const bd = document.querySelector('.backdrop');
  bd.addEventListener('click', e => {
    const b = e.target.closest('[data-tx]');
    if (!b) return;
    selTxType = b.dataset.tx;
    bd.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('on', x === b));
    const dl = bd.querySelector('#catList'); dl.innerHTML = (S.cats[selTxType] || []).map(c => '<option value="' + esc(c) + '">').join('');
    bd.querySelector('#txCat').value = S.cats[selTxType][0] || '';
  });
}

/* ================= REMINDERS ================= */
function renderReminders() {
  const sorted = S.reminders.slice().sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  const up = sorted.filter(r => !r.done && !r.fired), fired = sorted.filter(r => !r.done && r.fired), done = sorted.filter(r => r.done);
  const row = (r, st) => '<div class="row"><span class="note-ico">' + icon(st === 'done' ? 'checkCircle' : 'bell') + '</span>' +
    '<div class="grow"><div class="t1' + (st === 'done' ? ' done-txt' : '') + '">' + esc(r.title) + '</div>' +
    '<div class="t2">' + esc(L.fmtDateTime(r.at)) + (st === 'fired' ? ' • <b class="b-orange">' + t('Berbunyi') + '</b>' : '') + '</div></div>' +
    (st === 'up' ? '<button class="switch' + (r.active ? ' on' : '') + '" data-act="rToggle" data-id="' + esc(r.id) + '" role="switch"></button>' : '') +
    '<button class="btn-icon sm" data-act="rMenu" data-id="' + esc(r.id) + '">' + icon('more') + '</button></div>';
  let notifHtml = '';
  if (!BRIDGE()) {
    if (!('Notification' in window)) notifHtml = '<div class="banner">' + t('Browser tidak mendukung notifikasi. Pengingat tetap muncul saat app terbuka.') + '</div>';
    else if (Notification.permission === 'denied') notifHtml = '<div class="banner">' + t('Notifikasi diblokir. Aktifkan di pengaturan browser untuk alarm saat app tertutup.') + '</div>';
    else if (Notification.permission === 'default') notifHtml = '<div class="banner">' + t('Izinkan notifikasi agar alarm bisa berbunyi walau app tertutup.') + ' <button class="btn btn-tonal sm-btn" data-act="notifPerm">' + t('Izinkan') + '</button></div>';
  }
  $('#view').innerHTML = notifHtml +
    '<div class="card"><div class="card-title">' + t('Pengingat baru') + '</div>' +
    '<input id="rTitle" class="field" placeholder="' + esc(t('Kegiatan apa? (mis. minum obat)')) + '">' +
    '<div class="form-row"><input id="rDate" type="date" class="field half" value="' + L.todayISO() + '">' +
    '<input id="rTime" type="time" class="field half" value="' + pad2(new Date().getHours()) + ':' + pad2(new Date().getMinutes()) + '"></div>' +
    '<button class="btn btn-primary btn-block" data-act="rAdd">' + t('Simpan pengingat') + '</button></div>' +
    (up.length ? '<div class="section-title">' + t('Akan berbunyi') + '</div>' + up.map(r => row(r, 'up')).join('') : '') +
    (fired.length ? '<div class="section-title">' + t('Sudah berbunyi') + '</div>' + fired.map(r => row(r, 'fired')).join('') : '') +
    (done.length ? '<div class="section-title">' + t('Selesai') + '</div>' + done.map(r => row(r, 'done')).join('') : '') +
    (!S.reminders.length ? emptyState(t('Belum ada pengingat. Tambahkan di atas.')) : '');
}

function reminderModal(r) {
  const d = (r.at || '').split('T');
  modal({
    title: t('Edit pengingat'),
    body: '<input id="rTitle2" class="field" placeholder="' + t('Pengingat') + '" value="' + esc(r.title) + '">' +
      '<div class="form-row"><input id="rDate2" type="date" class="field half" value="' + (d[0] || L.todayISO()) + '">' +
      '<input id="rTime2" type="time" class="field half" value="' + (d[1] || '08:00') + '"></div>',
    ok: t('Simpan'), onOk: () => {
      r.title = $('#rTitle2').value.trim() || t('Pengingat');
      r.at = $('#rDate2').value + 'T' + $('#rTime2').value;
      save(); renderReminders(); scheduleNative(r);
      pushReminders();
    }
  });
}

/* notifications */
function notifOK() { return 'Notification' in window && Notification.permission === 'granted'; }
function scheduleNative(r) {
  if (!('serviceWorker' in navigator) || !r.active || r.done || r.fired) return;
  const T = window.TimestampTrigger || window.NotificationTrigger;
  if (!T) return;
  const at = new Date(r.at);
  if (at <= new Date()) return;
  try {
    navigator.serviceWorker.ready.then(reg => {
      reg.getNotifications({ tag: 'r-' + r.id }).then(ns => ns.forEach(n => n.close()));
      reg.showNotification(r.title, {
        tag: 'r-' + r.id, body: t('Pengingat') + ': ' + r.title + ' • ' + L.fmtDateTime(r.at),
        data: { url: './index.html#/reminders' },
        showTrigger: new T(at.getTime())
      });
    });
  } catch (e) { /* unsupported */ }
}
function cancelNative(id) {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then(reg => reg.getNotifications({ tag: 'r-' + id }).then(ns => ns.forEach(n => n.close()))).catch(() => {});
}
function fireReminder(r) {
  r.fired = true; save();
  if (!BRIDGE() && notifOK()) { try { new Notification('⏰ ' + r.title, { body: L.fmtDateTime(r.at), tag: 'r-' + r.id }); } catch (e) {} }
  snack('⏰ ' + r.title);
  modal({
    title: '⏰ ' + r.title, ok: null, cancel: t('Nanti (5 menit)'),
    body: '<p class="muted">' + t('Waktunya:') + ' ' + esc(L.fmtDateTime(r.at)) + '</p>' +
      '<div class="sheet-actions"><button class="btn btn-primary" data-act="rDone" data-id="' + esc(r.id) + '">' + t('Beres ✅') + '</button></div>'
  });
}
function checkReminders() {
  const now = new Date();
  S.reminders.forEach(r => {
    if (!r.active || r.done || r.fired) return;
    if (new Date(r.at) <= now) fireReminder(r);
  });
}

/* ================= SETTINGS ================= */
function renderSettings() {
  const presets = ['#6750A4', '#0B57D0', '#006A6A', '#2E7D32', '#8A6D00', '#E8710A', '#B3261E', '#C2185B', '#7D5260', '#445E91', '#545454', '#006C4C'];
  $('#view').innerHTML =
    '<div class="card"><div class="card-title">' + t('Tema') + '</div>' +
    '<div class="section-title sm">' + t('Warna utama') + '</div><div class="swatches">' +
    presets.map(c => '<button class="sw' + (S.theme.seed === c ? ' on' : '') + '" data-act="setSeed" data-extra="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>').join('') + '</div>' +
    '<label class="field-row"><span>' + t('Warna kustom') + '</span><input type="color" id="seedInput" value="' + esc(S.theme.seed) + '" data-change="seedChange"></label>' +
    '<div class="section-title sm">' + t('Mode') + '</div>' + segSel(S.theme.mode, [['light', t('Terang')], ['dark', t('Gelap')], ['system', t('Sistem')]], 'setMode') +
    '<div class="section-title sm">' + t('Kepadatan') + '</div>' + segSel(S.theme.density, [['padat', t('Padat')], ['nyaman', t('Nyaman')]], 'setDensity') + '</div>' +
    '<div class="card"><div class="card-title">' + t('Bahasa') + '</div>' +
    segSel(S.lang || 'id', [['id', t('Bahasa Indonesia')], ['en', t('English (US)')]], 'setLang') + '</div>' +
    '<div class="card"><div class="card-title">' + t('Data & Backup') + '</div>' +
    '<p class="muted">' + t('Semua data tersimpan lokal di perangkat ini. Ekspor JSON secara berkala agar aman.') + '</p>' +
    '<div class="stack"><button class="btn btn-tonal" data-act="exportData">' + icon('dl') + ' ' + t('Ekspor backup (JSON)') + '</button>' +
    '<button class="btn btn-tonal" data-act="importData">' + icon('ul') + ' ' + t('Impor backup') + '</button>' +
    '<input type="file" id="importFile" accept=".json,application/json" hidden>' +
    '<button class="btn btn-tonal danger-btn" data-act="resetData">' + icon('del') + ' ' + t('Hapus semua data') + '</button></div></div>' +
    '<div class="card"><div class="card-title">' + t('Aplikasi') + '</div>' +
    '<p class="muted">' + t('LifeOS v1.1 • super app offline pengatur hidup: catatan markdown, jurnal harian, tugas & deadline, keuangan, pengingat.') + '</p>' +
    (deferredPrompt ? '<button class="btn btn-primary btn-block" data-act="installApp">' + t('Pasang aplikasi ke layar utama') + '</button>' :
      '<p class="muted">' + t('💡 Buka menu browser → <b>Tambahkan ke layar utama</b> agar LifeOS terasa seperti aplikasi native.') + '</p>') +
    '</div>';
}

/* ================= ACTIONS ================= */
const ACTIONS = {
  goto(id, extra) { location.hash = '#/' + extra; },
  themeToggle() {
    S.theme.mode = isDark() ? 'light' : 'dark'; save(); render();
  },
  /* notes */
  openFolder(id) { location.hash = '#/folder/' + id; },
  openNote(id) { location.hash = '#/note/' + id; },
  newNote(id) { newNote(id); },
  newFolder(parentId) {
    modal({ title: t('Folder baru'),
      body: '<input id="nfName" class="field" placeholder="' + t('Nama folder') + '">',
      ok: t('Buat'), onOk: () => {
        const name = $('#nfName').value.trim();
        if (!name) { snack(t('Nama folder wajib diisi')); return false; }
        S.folders.push({ id: L.uid(), name: name, parent: parentId || 'root' });
        save(); render();
      } });
  },
  noteMenu(id) {
    const n = noteIn(id);
    menuModal(esc(n.title), [
      { label: n.pinned ? t('Lepas sematan') : t('Sematkan'), icon: 'star', act: 'notePin', id },
      { label: t('Pindah folder'), icon: 'folder', act: 'noteMove', id },
      { label: t('Ekspor .md'), icon: 'dl', act: 'noteExport', id },
      { label: t('Hapus catatan'), icon: 'del', act: 'noteDel', id, danger: true }
    ]);
  },
  notePin(id) { const n = noteIn(id); n.pinned = !n.pinned; save(); render(); },
  noteMove(id) {
    const n = noteIn(id);
    modal({ title: t('Pindah ke folder'),
      body: '<select id="mvSel" class="field">' + folderOptions(n.folderId) + '</select>',
      ok: t('Pindah'), onOk: () => { n.folderId = $('#mvSel').value; save(); render(); } });
  },
  noteExport(id) { download(noteIn(id).title + '.md', noteIn(id).md); },
  noteDel(id) {
    confirmModal(t('Hapus catatan ini? Tidak bisa dibatalkan.'), () => {
      S.notes = S.notes.filter(x => x.id !== id); save();
      if (editingId === id) editingId = null;
      render();
    });
  },
  folderBack(id) {
    const f = S.folders.find(x => x.id === id);
    location.hash = f && f.parent && f.parent !== 'root' ? '#/folder/' + f.parent : '#/notes';
  },
  edBack() {
    const n = editingId ? noteIn(editingId) : null;
    location.hash = n && n.folderId && n.folderId !== 'root' ? '#/folder/' + n.folderId : '#/notes';
  },
  togglePreview() {
    const ta = $('#edBody'), pv = $('#edPrev');
    if (!ta) return;
    ta.hidden = !ta.hidden; pv.hidden = !pv.hidden;
  },
  fmt(id, extra) {
    const ta = $('#edBody'); if (!ta) return;
    const FMTS = {
      bold: ['**', '**'], italic: ['*', '*'], strike: ['~~', '~~'], code: ['`', '`'],
      h1: ['\n# ', '\n'], h2: ['\n## ', '\n'], quote: ['\n> ', '\n'],
      ul: ['\n- ', '\n'], task: ['\n- [ ] ', '\n'],
      link: ['[', '](https://)'], hr: ['\n\n---\n\n', ''], table: ['\n| Kolom 1 | Kolom 2 |\n| ------- | ------- |\n| a | b |\n', '']
    };
    const [a, b] = FMTS[extra];
    const s = ta.selectionStart, e = ta.selectionEnd, v = ta.value;
    ta.setRangeText(a + v.slice(s, e) + b, s, e, 'select');
    ta.dispatchEvent(new Event('input'));
  },
  /* journal */
  jPrev() { curDate = L.addDays(curDate, -1); render(); },
  jNext() { curDate = L.addDays(curDate, 1); render(); },
  jToday() { curDate = L.todayISO(); render(); },
  mood(id, m) { jGet(curDate).mood = m; save(); render(); },
  jAdd(id, list) {
    const inp = document.getElementById(list === 'did' ? 'didInput' : 'todoInput');
    const txt = inp && inp.value.trim();
    if (!txt) return;
    jGet(curDate)[list].push(txt); save(); render();
  },
  jToggle(id, list, el) {
    const j = jGet(curDate); const i = Number(el.dataset.i);
    const from = j[list];
    if (i < from.length) {
      const item = from.splice(i, 1)[0];
      j[list === 'did' ? 'todo' : 'did'].push(item);
    }
    save(); render();
  },
  jDel(id, list, el) { const j = jGet(curDate); j[list].splice(Number(el.dataset.i), 1); save(); render(); },
  jPrevToggle() {
    const tt = $('#jText'), pp = $('#jPrevOut');
    if (!tt) return;
    tt.hidden = !tt.hidden; pp.hidden = !pp.hidden;
    if (!pp.hidden) renderMd(pp, tt.value);
  },
  /* recap */
  recPrev() { recOff--; render(); },
  recNext() { recOff++; render(); },
  recMode(id, m) { recMode = m; recOff = 0; render(); },
  /* tasks */
  tfList(id, extra) { curList = extra; render(); },
  tfHide() { hideDone = !hideDone; render(); },
  tAdd() {
    const text = $('#tText').value.trim();
    if (!text) return;
    const tk = { id: L.uid(), text: text, done: false, due: $('#tDue').value || '', prio: $('#tPrio').checked ? 1 : 0, list: $('#tList').value, created: Date.now(), updated: Date.now() };
    S.tasks.push(tk); save(); render();
  },
  tToggle(id) { const tk = S.tasks.find(x => x.id === id); tk.done = !tk.done; tk.updated = Date.now(); save(); render(); },
  tMenu(id) {
    const tk = S.tasks.find(x => x.id === id);
    if (!tk) return;
    menuModal(esc(tk.text), [
      { label: tk.done ? t('Tandai belum selesai') : t('Tandai selesai'), icon: 'checkCircle', act: 'tToggle', id },
      { label: t('Edit'), icon: 'edit', act: 'tEdit', id },
      { label: t('Hapus'), icon: 'del', act: 'tDel', id, danger: true }
    ]);
  },
  tEdit(id) {
    const tk = S.tasks.find(x => x.id === id);
    modal({ title: t('Edit tugas'),
      body: '<input id="tE1" class="field" value="' + esc(tk.text) + '">' +
        '<div class="form-row"><input id="tE2" type="date" class="field half" value="' + esc(tk.due || '') + '">' +
        '<select id="tE3" class="field half">' + S.lists.map(l => '<option value="' + esc(l.id) + '"' + (tk.list === l.id ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') + '</select></div>' +
        '<label class="prio"><input type="checkbox" id="tE4"' + (tk.prio ? ' checked' : '') + '> ' + t('★ Penting') + '</label>',
      ok: t('Simpan'), onOk: () => {
        tk.text = $('#tE1').value.trim() || tk.text; tk.due = $('#tE2').value; tk.list = $('#tE3').value; tk.prio = $('#tE4').checked ? 1 : 0; tk.updated = Date.now();
        save(); render();
      } });
  },
  tDel(id) {
    confirmModal(t('Hapus tugas ini?'), () => { S.tasks = S.tasks.filter(x => x.id !== id); save(); render(); });
  },
  /* money */
  mPrev() { curMonth = L.addMonths(curMonth, -1); render(); },
  mNext() { curMonth = L.addMonths(curMonth, 1); render(); },
  mBudget() {
    const mk = curMonth; const cur = S.budget[mk];
    modal({ title: t('Anggaran') + ' ' + L.monthLabel(mk),
      body: '<input id="bgAmt" type="number" inputmode="numeric" class="field big-field" placeholder="' + t('Anggaran') + ' (Rp)" value="' + (cur || '') + '">',
      ok: t('Simpan'), onOk: () => {
        const v = Math.round(Number($('#bgAmt').value) || 0);
        if (v > 0) S.budget[mk] = v; else delete S.budget[mk];
        save(); render();
      } });
  },
  txAdd() { txModal(null); },
  txMenu(id) {
    const x = S.tx.find(t2 => t2.id === id);
    if (!x) return;
    menuModal(L.fmtIDR(x.amount) + ' — ' + esc(x.cat), [
      { label: t('Edit'), icon: 'edit', act: 'txEdit', id },
      { label: t('Hapus'), icon: 'del', act: 'txDel', id, danger: true }
    ]);
  },
  txEdit(id) { txModal(S.tx.find(x => x.id === id)); },
  txDel(id) {
    confirmModal(t('Hapus transaksi ini?'), () => { S.tx = S.tx.filter(x => x.id !== id); save(); render(); });
  },
  /* reminders */
  rAdd() {
    const title = $('#rTitle').value.trim();
    const at = $('#rDate').value + 'T' + $('#rTime').value;
    if (!title) { snack(t('Judul pengingat wajib diisi')); return; }
    const r = { id: L.uid(), title: title, at: at, active: true, done: false, fired: false, created: Date.now() };
    S.reminders.push(r); save(); render();
    pushReminders();
    if (notifOK()) scheduleNative(r);
  },
  rToggle(id) {
    const r = S.reminders.find(x => x.id === id);
    r.active = !r.active;
    if (!r.active) cancelNative(id);
    else scheduleNative(r);
    save(); render(); pushReminders();
  },
  rMenu(id) {
    const r = S.reminders.find(x => x.id === id);
    if (!r) return;
    const items = [];
    if (r.fired && !r.done) items.push({ label: t('Tunda 5 menit'), icon: 'clock', act: 'rSnooze', id });
    if (!r.done) items.push({ label: t('Tandai selesai'), icon: 'checkCircle', act: 'rDone', id });
    items.push({ label: t('Edit'), icon: 'edit', act: 'rEdit', id });
    items.push({ label: t('Hapus'), icon: 'del', act: 'rDel', id, danger: true });
    menuModal(esc(r.title), items);
  },
  rSnooze(id) {
    const r = S.reminders.find(x => x.id === id);
    const d = new Date(Date.now() + 5 * 60000);
    r.at = L.dateISO(d) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    r.fired = false; save(); render(); scheduleNative(r);
    pushReminders();
    snack(t('Ditunda 5 menit'));
  },
  rDone(id) {
    const r = S.reminders.find(x => x.id === id);
    r.done = true; r.fired = false; r.active = false;
    cancelNative(id); save(); render(); pushReminders();
  },
  rEdit(id) { reminderModal(S.reminders.find(x => x.id === id)); },
  rDel(id) {
    confirmModal(t('Hapus pengingat ini?'), () => {
      S.reminders = S.reminders.filter(x => x.id !== id);
      cancelNative(id); save(); render(); pushReminders();
    });
  },
  notifPerm() {
    Notification.requestPermission().then(p => { snack(p === 'granted' ? t('Notifikasi diizinkan 🔔') : t('Notifikasi ditolak')); render(); });
  },
  /* settings */
  setSeed(id, c) { S.theme.seed = c; save(); render(); },
  setMode(id, m) { S.theme.mode = m; save(); render(); },
  setDensity(id, d) { S.theme.density = d; save(); render(); },
  setLang(id, l) { S.lang = l; save(); render(); },
  exportData() {
    download('lifeos-backup-' + L.todayISO() + '.json', JSON.stringify(S, null, 1));
    snack(t('Backup diekspor'));
  },
  importData() { $('#importFile').click(); },
  resetData() {
    confirmModal(t('Hapus SEMUA data (catatan, tugas, keuangan, pengingat)? Tindakan ini permanen!'), () => {
      L.reset(); location.reload();
    });
  },
  installApp() { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; render(); } }
};

function download(name, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---------- global events ---------- */
document.addEventListener('click', e => {
  const t2 = e.target.closest('[data-act]');
  if (!t2) return;
  if (modalOpen()) closeModal();
  const fn = ACTIONS[t2.dataset.act];
  if (fn) fn(t2.dataset.id, t2.dataset.extra, t2, e);
});
document.addEventListener('input', e => {
  const t2 = e.target;
  const search = t2.dataset.search;
  if (search) {
    const q = t2.value.toLowerCase();
    document.querySelectorAll('.' + search + ' .search-item').forEach(r => r.classList.toggle('hide', q && !r.dataset.searchtext.toLowerCase().includes(q)));
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'seedInput') { S.theme.seed = e.target.value; save(); render(); }
  if (e.target.id === 'importFile') {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        if (!d || !Array.isArray(d.notes)) throw new Error('format salah');
        S = d; save(); location.hash = '#/notes'; render();
        snack(t('Backup berhasil diimpor'));
      } catch (err) { snack(t('File backup tidak valid')); }
    };
    rd.readAsText(f);
    e.target.value = '';
  }
});
window.addEventListener('hashchange', render);
window.addEventListener('pagehide', flushEditor);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; render(); });

/* ---------- boot ---------- */
(function init() {
  const b = BRIDGE();
  if (b) { try { const r = JSON.parse(b.getReminders()); if (Array.isArray(r)) S.reminders = r; } catch (e) {} }
  applyTheme();
  render();
  setInterval(checkReminders, 20000);
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.theme.mode === 'system') applyTheme(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  checkReminders();
})();
