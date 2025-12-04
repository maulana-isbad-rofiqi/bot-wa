const express = require('express');
const { makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
// Vercel menggunakan port dinamis, atau default 3000
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// Tampilan Halaman Depan
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; padding: 20px; text-align: center;">
            <h1>WhatsApp Bot Vercel</h1>
            <p>Masukkan nomor kamu untuk mendapatkan Kode Pairing.</p>
            <form action="/pair" method="get">
                <input type="number" name="phone" placeholder="628xxx" required style="padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
                <br><br>
                <button type="submit" style="padding: 10px 20px; background: green; color: white; border: none; border-radius: 5px;">Dapatkan Kode</button>
            </form>
        </div>
    `);
});

// Proses Minta Kode
app.get('/pair', async (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.send("Nomor wajib diisi!");

    // PENTING: Di Vercel hanya boleh nulis di folder /tmp
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info_baileys');

    try {
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false, // Kita pakai Pairing Code
            browser: ["Ubuntu", "Chrome", "20.0.04"]
        });

        if (!sock.authState.creds.registered) {
            await delay(1500); // Tunggu socket siap

            // Minta kode pairing ke server WA
            const code = await sock.requestPairingCode(phone);

            // Tampilkan kode ke layar HP
            res.send(`
                <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                    <h2>Kode Pairing Kamu:</h2>
                    <h1 style="background: #f0f0f0; padding: 10px; letter-spacing: 5px;">${code?.match(/.{1,4}/g)?.join("-") || code}</h1>
                    <p>1. Buka WhatsApp di HP target<br>2. Ke "Perangkat Tertaut" > "Tautkan"<br>3. Pilih "Tautkan dengan Nomor Telepon"<br>4. Masukkan kode di atas.</p>
                </div>
            `);
        } else {
            res.send("Sesi sudah aktif sebelumnya (di /tmp).");
        }

        // Simpan kredensial saat ada update
        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        res.send("Gagal: " + error.message);
    }
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server jalan di port ${port}`);
});

module.exports = app;
