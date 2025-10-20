// api/proxy.js
// Proksi tanpa server untuk Moralis (berfungsi untuk proyek statis di Vercel)
// Simpan berkas ini ke repo root di: /api/proxy.js
// JANGAN hardcode kunci MORALIS Anda di sini. Atur MORALIS_KEY di Variabel Lingkungan Vercel.

modul.ekspor = fungsi asinkron (permintaan, res) {
  // Pra-penerbangan CORS dasar
  res.setHeader('Akses-Kontrol-Izinkan-Asal', '*');
  res.setHeader('Akses-Kontrol-Izinkan-Metode', 'DAPATKAN,POSTING,OPSI');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  jika (req.metode === 'PILIHAN') {
    res.statusCode = 204;
    res.akhir();
    kembali;
  }

  const MORALIS_KEY = proses.env.MORALIS_KEY;
  jika (!MORALIS_KEY) {
    res.statusCode = 500;
    res.setHeader('Jenis Konten', 'aplikasi/json');
    res.end(JSON.stringify({ error: 'MORALIS_KEY hilang di lingkungan server' }));
    kembali;
  }

  mencoba {
    // req.url mencakup seluruh jalur dan kueri, misalnya /api/proxy/token/mainnet/...?limit=2
    const rawUrl = req.url || '';
    const upstreamPath = rawUrl.replace(/^\/api\/proxy/, '') || '/';
    const upstreamUrl = 'https://solana-gateway.moralis.io' + upstreamPath;

    // membangun header untuk hulu
    konstanta upstreamHeaders = {
      'Kunci-API-X': KUNCI_MORALIS,
      'terima': 'aplikasi/json'
    };
    jika (req.headers['tipe-konten']) upstreamHeaders['tipe-konten'] = req.headers['tipe-konten'];

    const opts = {
      metode: req.metode,
      header: upstreamHeaders
    };

    // badan penerusan untuk permintaan non-GET/HEAD
    jika (req.metode !== 'GET' dan req.metode !== 'HEAD') {
      // Req Node mungkin memiliki body yang sudah diurai oleh Vercel; coba baca raw jika ada
      jika (req.body dan (jenis req.body === 'string' || Buffer.isBuffer(req.body))) {
        opts.body = req.body;
      } jika tidak (req.body dan Object.keys(req.body).length) {
        opts.body = JSON.stringify(req.body);
      } kalau tidak {
        // fallback: coba kumpulkan aliran mentah (jarang)
        mencoba {
          opts.body = tunggu new Promise((resolve) => {
            biarkan data = '';
            req.on && req.on('data', (c) => (data += c));
            req.on && req.on('akhir', () => selesaikan(data || tidak terdefinisi));
            // jika acara tidak tersedia, selesaikan dengan cepat
            setTimeout(() => selesaikan(tidak terdefinisi), 5);
          });
        } tangkap (e) { /* abaikan */ }
      }
    }

    // gunakan global fetch (tersedia di Vercel Node 18+)
    const upstreamRes = tunggu fetch(upstreamUrl, opts);
    const teks = tunggu upstreamRes.teks();

    // menyebarkan tipe konten dan status
    res.setHeader('Jenis-Konten', upstreamRes.headers.get('jenis-konten') || 'aplikasi/json');
    // hindari caching (sesuaikan jika Anda menginginkan caching)
    res.setHeader('Cache-Control', 'tidak-disimpan');
    res.statusCode = upstreamRes.status;
    res.end(teks);
  } tangkap (salah) {
    console.error('kesalahan proksi', err && (err.tumpukan || err.pesan || err));
    res.setHeader('Jenis Konten', 'aplikasi/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Kesalahan internal proksi' }));
  }
};
