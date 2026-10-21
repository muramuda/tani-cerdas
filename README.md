# Tani Cerdas Sumba Timur (versi online, Netlify)

Petani cukup membuka **satu link** di HP. Foto dikirim ke fungsi server kecil di Netlify, yang bertanya ke AI (Gemini gratis, atau Claude berbayar), lalu hasilnya ditampilkan. Pustaka, Cek gejala, dan Kalender tetap bisa dibuka tanpa internet setelah link dibuka sekali.

## Struktur

```
public/                    isi situs (index.html, css, js, sw.js, manifest.json)
public/js/data.js          DATA hama dan penyakit (edit di sini)
netlify/functions/diagnose.js   server: mengirim foto ke AI (kunci API dibaca di sini)
netlify.toml               pengaturan Netlify
.env.example               contoh isi kunci untuk uji di laptop
```

## Membuatnya online

1. **Kunci API gratis**: buka https://aistudio.google.com, masuk akun Google, buat API key (tanpa pembayaran, ada batas pemakaian; lihat batas aktif di AI Studio).
2. **GitHub**: buat repositori baru, unggah semua isi folder ini (jangan unggah `.env`).
3. **Netlify**: Add new site > Import an existing project > GitHub > pilih repositori. Pengaturan build dibaca otomatis dari `netlify.toml` (publish directory `public`, tanpa build command).
4. **Environment variables**: Site configuration > Environment variables > Add a variable. Tambahkan:
   - `GEMINI_API_KEY` = kunci dari langkah 1
   - `GEMINI_MODEL` = nama model Gemini yang tersedia di akun Anda (contoh `gemini-flash-latest`; cek daftar di AI Studio)
   Pastikan **scope** variabel mencakup **Functions**. Variabel yang ditulis di `netlify.toml` tidak terbaca oleh fungsi.
5. **Deploy ulang** (Deploys > Trigger deploy) agar variabel terbaca.
6. Buka link `xxx.netlify.app`, coba foto. Di HP: menu browser > Tambahkan ke layar utama.

Untuk memakai Claude: set `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, dan (opsional) `ANTHROPIC_MODEL`.

## Mencoba di laptop

- Tampilan saja: Live Server (sudah diatur membuka folder `public`). Tombol foto belum jalan tanpa server.
- Dengan diagnosa foto: pasang Node.js, salin `.env.example` menjadi `.env` dan isi kunci, lalu di terminal: `npx netlify-cli dev`.

## Batas waktu fungsi

Fungsi Netlify bawaannya dibatasi sekitar 10 detik. Fungsi ini membatalkan panggilan AI di 9 detik dan menampilkan "AI terlalu lama menjawab, coba foto lagi". Bila sering terjadi, ubah `AI_TIMEOUT_MS` hanya setelah batas fungsi di akun Anda dinaikkan (lihat dokumentasi Netlify), atau pilih model yang lebih cepat.

## Privasi dan batas

- Gemini gratis: ada batas permintaan; menurut halaman harga Google, permintaan di paket gratis dapat dipakai Google untuk meningkatkan produknya. Beri tahu petani.
- Claude: berbayar per foto. Atur batas pengeluaran.
- Pembatas 30 foto per IP per jam (sederhana). Tanpa internet, foto tidak bisa didiagnosa.

## Soal akurasi (penting)

- AI belum dilatih khusus dengan foto hama Sumba Timur. Hasil berupa perkiraan dan bisa salah. Aplikasi menampilkan persen keyakinan dan menyarankan bertanya ke POPT.
- Uji dengan puluhan foto yang jawabannya sudah diketahui POPT sebelum dipakai luas.
- Kalender waspada adalah hipotesis, dan isi penanganan adalah panduan umum tanpa dosis pestisida. Validasi ke POPT/BPTPH NTT.
