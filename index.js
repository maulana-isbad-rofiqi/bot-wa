const express = require('express');
const { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

let sock;

// Fungsi untuk menghidupkan Bot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true, // Ubah ke true jika ingin lihat log di console render
        browser: ["Render", "Chrome", "1.0.0"] 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi mati, mencoba reconnect...', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('Bot Berhasil Terhubung!');
        }
    });

    // Fitur Auto Reply (Contoh)
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        const msgText = m.message.conversation || m.message.extendedTextMessage?.text;

        if (msgText == ".ping") {
            await sock.sendMessage(m.key.remoteJid, { text: "Pong! Bot aktif di Render." });
        }
    });
}

// Jalankan bot pertama kali
startBot();

// --- BAGIAN WEBSITE ---

app.get('/', (req, res) => {
    res.send(`
        <style>body{font-family:sans-serif; padding:20px; max-width:600px; margin:auto; background:#f0f2f5;}</style>
        <div style="background:white; padding:20px; border-radius:10px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color:#075e54;">Panel Pairing Bot</h2>
            <p>Status: <b>Server Online</b></p>
            <hr>
            <form action="/code" method="get">
                <label>Masukkan Nomor HP (Awalan 62):</label><br>
                <input type="number" name="phone" placeholder="628xxxxx" required style="width:100%; padding:10px; margin:10px 0; border:1px solid #ddd; border-radius:5px;">
                <button type="submit" style="width:100%; padding:10px; background:#25D366; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">Minta Kode Pairing</button>
            </form>
        </div>
    `);
});

app.get('/code', async (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.send("Nomor wajib diisi!");

    if (sock && !sock.authState.creds.registered) {
        try {
            await delay(2000); // Tunggu socket siap
            const code = await sock.requestPairingCode(phone);
            res.send(`
                <div style="font-family:sans-serif; text-align:center; margin-top:50px;">
                    <h3>Kode Pairing Anda:</h3>
                    <h1 style="background:#eee; padding:20px; letter-spacing:5px; border-radius:10px;">${code?.match(/.{1,4}/g)?.join("-") || code}</h1>
                    <p>Silakan masukkan kode ini di WhatsApp > Perangkat Tertaut.</p>
                    <a href="/">Kembali</a>
                </div>
            `);
        } catch (e) {
            res.send("Gagal: " + e.message + ". Coba refresh bot.");
        }
    } else {
        res.send("Bot sudah terhubung atau belum siap. Cek Logs.");
    }
});

app.listen(port, () => {
    console.log(`Web berjalan di port ${port}`);
});
