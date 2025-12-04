import { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } from '@whiskeysockets/baileys';
import express from 'express';
import pino from 'pino';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// --- CSS STYLE (Biar tetap keren) ---
const styleCSS = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
    body { background: #0f172a; color: white; font-family: 'Poppins', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    .container { background: #1e293b; padding: 30px; border-radius: 15px; text-align: center; border: 1px solid #334155; max-width: 400px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    input { width: 100%; padding: 12px; margin: 15px 0; background: #334155; border: 1px solid #475569; color: white; border-radius: 8px; outline: none; text-align: center; font-size: 16px; }
    button { width: 100%; padding: 12px; background: #22c55e; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; }
    button:hover { background: #16a34a; }
    .code { font-size: 32px; font-weight: bold; color: #4ade80; letter-spacing: 5px; margin: 20px 0; background: #000; padding: 15px; border-radius: 10px; border: 1px dashed #4ade80; }
    .status { font-size: 12px; color: #94a3b8; margin-top: 20px; }
</style>
`;

let sock;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info_baileys');
    
    sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } 
        
        // --- INI BAGIAN PENTING: KIRIM NOTIFIKASI ---
        else if (connection === 'open') {
            console.log("Koneksi Terbuka!");
            try {
                // Kirim pesan ke diri sendiri (Nomor Bot)
                const botNumber = sock.user.id.split(':')[0] + "@s.whatsapp.net";
                await sock.sendMessage(botNumber, { 
                    text: `✅ *BERHASIL TERHUBUNG!*\n\nHalo Bos, Bot Vercel kamu sudah aktif.\nID Sesi: ${sock.user.id}` 
                });
            } catch (err) {
                console.log("Gagal kirim pesan welcome:", err);
            }
        }
    });
}

connectToWhatsApp();

app.get('/', (req, res) => {
    res.send(`
        <html><head><title>Bot WA Dashboard</title>${styleCSS}</head><body>
            <div class="container">
                <h3>🤖 Dashboard Bot</h3>
                <p style="color:#cbd5e1;">Masukkan nomor HP untuk menghubungkan.</p>
                <form action="/pair" method="get">
                    <input type="number" name="phone" placeholder="628xxxxx" required>
                    <button type="submit">Minta Kode Pairing</button>
                </form>
                <div class="status">Server Status: 🟢 Online</div>
            </div>
        </body></html>
    `);
});

app.get('/pair', async (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.send("Nomor kosong");

    if (!sock) await connectToWhatsApp();

    try {
        if (!sock.authState.creds.registered) {
            await delay(1500); 
            const code = await sock.requestPairingCode(phone);
            
            res.send(`
                <html><head><title>Kode Pairing</title>${styleCSS}</head><body>
                    <div class="container">
                        <h3>Kode Diterima! ⚡</h3>
                        <p>Masukkan kode ini di HP kamu sekarang:</p>
                        <div class="code">${code}</div>
                        <p style="font-size:14px; color:yellow;">⚠️ Jangan tutup halaman ini sampai pesan masuk di WA!</p>
                        <a href="/" style="color:white; text-decoration:none;">&larr; Kembali</a>
                    </div>
                    <script>
                        // Jaga server tetap hidup selama pairing
                        setInterval(() => { fetch('/'); }, 5000);
                    </script>
                </body></html>
            `);
        } else {
            res.send(`
                <html><head>${styleCSS}</head><body>
                    <div class="container">
                        <h3 style="color:#4ade80">Sudah Terhubung!</h3>
                        <p>Cek chat WhatsApp kamu (Pesan ke diri sendiri).</p>
                        <a href="/" style="color:white">Kembali</a>
                    </div>
                </body></html>
            `);
        }
    } catch (e) {
        res.send("Gagal: " + e.message);
    }
});

app.listen(port, () => {
    console.log(`Server jalan di port ${port}`);
});

export default app;
