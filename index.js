import { makeWASocket, useMultiFileAuthState, delay } from '@whiskeysockets/baileys';
import express from 'express';
import pino from 'pino';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// Halaman Utama
app.get('/', (req, res) => {
    res.send('Server WhatsApp Vercel Aktif! Masuk ke /pair?phone=628xx untuk kode.');
});

// Halaman Pairing
app.get('/pair', async (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.send("Tambahkan nomor di URL! Contoh: /pair?phone=628123456");

    try {
        // Vercel hanya membolehkan tulis file di /tmp
        const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info_baileys');

        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"]
        });

        if (!sock.authState.creds.registered) {
            await delay(1500); // Tunggu sebentar

            const code = await sock.requestPairingCode(phone);

            res.send(`
                <html>
                    <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                        <h3>Kode Pairing Kamu:</h3>
                        <h1 style="background: #eee; padding: 20px; display: inline-block; letter-spacing: 5px;">${code}</h1>
                        <p>Masukkan kode ini di WhatsApp > Perangkat Tertaut.</p>
                    </body>
                </html>
            `);
        } else {
            res.send("Sesi sudah aktif di server ini.");
        }

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error(error);
        res.send("Gagal: " + error.message);
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

// Ini wajib untuk Vercel
export default app;
