import { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } from '@whiskeysockets/baileys';
import express from 'express';
import pino from 'pino';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// --- TAMPILAN UI (Tetap Keren) ---
const styleCSS = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
    body { background: #0f172a; color: white; font-family: 'Poppins', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    .container { background: #1e293b; padding: 30px; border-radius: 15px; text-align: center; border: 1px solid #334155; max-width: 400px; width: 90%; }
    input { width: 100%; padding: 12px; margin: 15px 0; background: #334155; border: 1px solid #475569; color: white; border-radius: 8px; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background: #22c55e; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
    .code { font-size: 28px; font-weight: bold; color: #4ade80; letter-spacing: 4px; margin: 20px 0; background: #000; padding: 15px; border-radius: 10px; }
</style>
`;

let sock; // Simpan sesi di luar agar tidak mati

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info_baileys');
    
    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        // PENTING: Supaya tidak gampang putus
        keepAliveIntervalMs: 10000, 
        syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp(); // Reconnect otomatis
        }
    });
}

// Jalankan fungsi koneksi saat server nyala
connectToWhatsApp();

app.get('/', (req, res) => {
    res.send(`
        <html><head>${styleCSS}</head><body>
            <div class="container">
                <h3>🤖 Pairing Bot Vercel</h3>
                <form action="/pair" method="get">
                    <input type="number" name="phone" placeholder="628xxxxx (Tanpa +)" required>
                    <button type="submit">Minta Kode</button>
                </form>
            </div>
        </body></html>
    `);
});

app.get('/pair', async (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.send("Nomor kosong");

    if (!sock) await connectToWhatsApp();

    try {
        // Tunggu socket siap dulu
        if (!sock.authState.creds.registered) {
            await delay(2000); 
            
            // Minta kode
            const code = await sock.requestPairingCode(phone);
            
            res.send(`
                <html><head>${styleCSS}</head><body>
                    <div class="container">
                        <h3>Kode Masuk! ⚡</h3>
                        <div class="code">${code}</div>
                        <p>Segera masukkan ke WA dalam 10 detik!</p>
                        <small>Jangan tutup halaman ini agar bot tetap nyala.</small>
                    </div>
                    <script>
                        // Trik: Ping server setiap 2 detik agar Vercel tidak tidur
                        setInterval(() => { fetch('/'); }, 2000);
                    </script>
                </body></html>
            `);
        } else {
            res.send("Bot sudah terhubung sebelumnya.");
        }
    } catch (e) {
        res.send("Gagal: " + e.message);
    }
});

app.listen(port, () => {
    console.log(`Server jalan di port ${port}`);
});

export default app;
