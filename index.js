import { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } from '@whiskeysockets/baileys';
import express from 'express';
import pino from 'pino';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

// Halaman Status
app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 20px;">
            <h1>Bot WA Vercel (Mode ESM)</h1>
            <p style="color: green;">Status: Online & Ready ✅</p>
            <form action="/pair" method="get">
                <input type="number" name="phone" placeholder="628xxx" required style="padding:10px;">
                <button type="submit" style="padding:10px;">Minta Kode Pairing</button>
            </form>
        </div>
    `);
});

// Proses Pairing
app.get('/pair', async (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.send("Nomor wajib diisi!");

    try {
        // Gunakan folder /tmp untuk sesi sementara di Vercel
        const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth_info_baileys');

        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: ["Ubuntu", "Chrome", "20.0.04"]
        });

        if (!sock.authState.creds.registered) {
            await delay(1500);
            
            // Request Kode
            const code = await sock.requestPairingCode(phone);
            
            res.send(`
                <div style="font-family: sans-serif; text-align: center;">
                    <h3>Kode Pairing Anda:</h3>
                    <h1 style="background: #eee; padding: 20px; border-radius: 10px;">${code}</h1>
                    <p>Salin kode ini ke WhatsApp > Perangkat Tertaut.</p>
                </div>
            `);
        } else {
            res.send("Sesi sudah aktif sebelumnya.");
        }

        sock.ev.on('creds.update', saveCreds);

    } catch (error) {
        console.error(error);
        res.send("Gagal: " + error.message);
    }
});

app.listen(port, () => {
    console.log(`Server berjalan di port ${port}`);
});

// Wajib untuk Vercel ESM
export default app;
