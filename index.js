const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Kita bungkus import library dalam try-catch untuk cek error
let makeWASocket, useMultiFileAuthState, delay, pino;
try {
    const baileys = require('@whiskeysockets/baileys');
    makeWASocket = baileys.makeWASocket;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    delay = baileys.delay;
    pino = require('pino');
} catch (e) {
    console.error("Gagal load library:", e);
}

app.use(express.urlencoded({ extended: true }));

// Halaman Depan (Cek Status)
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h1>Status: Server Nyala ✅</h1>
            <p>Jika kamu melihat halaman ini, berarti Vercel tidak error.</p>
            <hr>
            <h3>Pairing Bot</h3>
            <form action="/pair" method="get">
                <input type="number" name="phone" placeholder="628xxx" required style="padding:10px;">
                <button type="submit" style="padding:10px;">Minta Kode</button>
            </form>
        </div>
    `);
});

// Halaman Pairing
app.get('/pair', async (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.send("Nomor kosong!");

    // Cek apakah library berhasil di-load
    if (!makeWASocket || !useMultiFileAuthState) {
        return res.send("Error: Library Baileys belum terinstall dengan benar di package.json");
    }

    try {
        // PENTING: Gunakan folder /tmp karena Vercel Read-Only
        const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info');

        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"]
        });

        if (!sock.authState.creds.registered) {
            await delay(1000);
            
            // Coba minta kode
            const code = await sock.requestPairingCode(phone);
            
            res.send(`
                <h2>Kode Pairing:</h2>
                <h1 style="background:#eee; display:inline-block; padding:10px;">${code}</h1>
                <p>Salin dan masukkan ke WhatsApp di HP kamu.</p>
            `);
        } else {
            res.send("Sesi sudah aktif di server sementara.");
        }

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        // Tampilkan error ke layar agar kita tahu salahnya dimana
        console.error(error);
        res.send(`<h1>Terjadi Error!</h1><pre>${error.message}</pre>`);
    }
});

app.listen(port, () => {
    console.log(`Server jalan di port ${port}`);
});

module.exports = app;
