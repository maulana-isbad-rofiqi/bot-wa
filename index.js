import { makeWASocket, useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import express from 'express';
import pino from 'pino';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// --- BAGIAN TAMPILAN (FRONTEND) ---
// Kita gunakan CSS langsung di sini agar tampilan jadi keren tanpa ribet bikin file baru

const styleCSS = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
    body {
        background: #0f172a;
        color: #e2e8f0;
        font-family: 'Poppins', sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
    }
    .container {
        background: #1e293b;
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        width: 100%;
        max-width: 400px;
        text-align: center;
        border: 1px solid #334155;
    }
    h1 { color: #22c55e; margin-bottom: 10px; font-weight: 600; }
    p { font-size: 14px; color: #94a3b8; margin-bottom: 30px; }
    input {
        width: 100%;
        padding: 15px;
        margin-bottom: 20px;
        background: #334155;
        border: 2px solid #475569;
        border-radius: 10px;
        color: white;
        font-size: 16px;
        box-sizing: border-box;
        outline: none;
        transition: 0.3s;
    }
    input:focus { border-color: #22c55e; }
    button {
        width: 100%;
        padding: 15px;
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: 0.3s;
    }
    button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(34, 197, 94, 0.4); }
    .code-box {
        background: #0f172a;
        padding: 20px;
        border-radius: 10px;
        border: 1px dashed #22c55e;
        margin-top: 20px;
        letter-spacing: 5px;
        font-size: 24px;
        font-weight: bold;
        color: #22c55e;
    }
</style>
`;

// Halaman Utama (Form Input)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>WhatsApp Bot Pairing</title>${styleCSS}</head>
        <body>
            <div class="container">
                <h1>⚡ Bot Pairing</h1>
                <p>Masukkan nomor WhatsApp kamu (awalan 62) untuk menghubungkan bot.</p>
                <form action="/pair" method="get">
                    <input type="number" name="phone" placeholder="Contoh: 628123456789" required autocomplete="off">
                    <button type="submit">Dapatkan Kode</button>
                </form>
            </div>
        </body>
        </html>
    `);
});

// Halaman Hasil (Menampilkan Kode)
app.get('/pair', async (req, res) => {
    const phone = req.query.phone;

    if (!phone) {
        return res.send(`<script>alert('Nomor tidak boleh kosong!'); window.location='/';</script>`);
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info_baileys');
        
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"]
        });

        if (!sock.authState.creds.registered) {
            // Delay sedikit biar aman
            await delay(1500);

            // Minta kode pairing
            const code = await sock.requestPairingCode(phone);
            
            // Tampilkan UI Kode
            res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>Kode Pairing</title>${styleCSS}</head>
                <body>
                    <div class="container">
                        <h1>Berhasil! 🎉</h1>
                        <p>Silakan masukkan kode di bawah ini ke WhatsApp > Perangkat Tertaut.</p>
                        <div class="code-box">${code?.match(/.{1,4}/g)?.join("-") || code}</div>
                        <br>
                        <a href="/" style="color:#94a3b8; text-decoration:none;">&larr; Kembali</a>
                    </div>
                </body>
                </html>
            `);
        } else {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>Error</title>${styleCSS}</head>
                <body>
                    <div class="container">
                        <h1 style="color:red">Sudah Terhubung</h1>
                        <p>Sesi bot sudah aktif di server ini.</p>
                        <a href="/" style="color:white">Kembali</a>
                    </div>
                </body>
                </html>
            `);
        }

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Error</title>${styleCSS}</head>
            <body>
                <div class="container">
                    <h1 style="color:red">Gagal 😢</h1>
                    <p>${error.message}</p>
                    <a href="/" style="color:white">Coba Lagi</a>
                </div>
            </body>
            </html>
        `);
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

export default app;
