// حل مشكلة التشفير في بيئة Render
const crypto = require('crypto');
if (!global.crypto) {
    global.crypto = crypto;
}

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason 
} = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 8000;

// سيرفر ويب بسيط لاستقبال طلبات UptimeRobot
app.get('/', (req, res) => res.send('WhatsApp Online Service is Running!'));
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// الرقم الذي سيتم ربطه
const phoneNumber = process.env.PHONE || "12892446642"; 

async function connectToWhatsApp() {
    // إنشاء مجلد auth_info لحفظ الجلسة
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Beko-Online", "Chrome", "1.0.0"]
    });

    // طلب كود الربط في حالة عدم وجود جلسة نشطة
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                console.log('---------------------------------------');
                console.log(`👉 PAIRING CODE: ${code}`);
                console.log('---------------------------------------');
            } catch (error) {
                console.error("Error requesting pairing code:", error);
            }
        }, 5000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('✅ Connected! Account is now 24/7 Online.');
            
            // إرسال إشارة "متصل" كل 25 ثانية
            setInterval(async () => {
                await sock.sendPresenceUpdate('available');
            }, 25000);
        }
    });
}

connectToWhatsApp();
