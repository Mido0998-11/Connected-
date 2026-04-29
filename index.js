const crypto = require('crypto');
if (!global.crypto) {
    global.crypto = crypto;
}

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 8000;

app.get('/', (req, res) => res.send('WhatsApp Online 24/7 is Active!'));
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

const phoneNumber = "12892446642"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        // تأخير 10 ثواني قبل طلب الكود لضمان استقرار السيرفر
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                console.log('\n=======================================');
                console.log(`👉 YOUR PAIRING CODE: ${code}`);
                console.log('=======================================\n');
            } catch (err) {
                console.log("خطأ في طلب الكود، انتظر قليلاً وسيحاول السيرفر مرة أخرى...");
            }
        }, 10000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Connected! Account is Online 24/7');
            setInterval(async () => {
                await sock.sendPresenceUpdate('available');
            }, 20000);
        }
    });
}

startBot();
