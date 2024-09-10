const express = require("express");
const app = express();
const pino = require("pino");
let { toBuffer } = require("qrcode");
const path = require('path');
const fs = require("fs-extra");
const { Boom } = require("@hapi/boom");
const { default: SuhailWASocket, useMultiFileAuthState, Browsers, delay, DisconnectReason, makeInMemoryStore } = require("@whiskeysockets/baileys");

const PORT = process.env.PORT || 5000;
const MESSAGE = process.env.MESSAGE || "*𝐁𝐇𝐀𝐒𝐇𝐈-𝐌𝐃 𝐒𝐄𝐒𝐒𝐈𝐎𝐍-𝐈𝐃*\n\n_🪄 ᴅᴏɴ'ᴛ ꜱʜᴀʀᴇ ʏᴏᴜʀ ꜱᴇꜱꜱɪᴏɴ ɪᴅ ᴡɪᴛʜ ᴀɴʏᴏɴᴇ_";

if (fs.existsSync('./auth_info_baileys')) {
  fs.emptyDirSync(__dirname + '/auth_info_baileys');
}

// Serve HTML
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BHASHI-MD SESSION-ID Generator</title>
    <style>
        body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f0f0f0;
            margin: 0;
            font-family: Arial, sans-serif;
        }
        .container {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        #qrCode {
            max-width: 100%;
            height: auto;
            border: 2px solid #333;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        #sessionId {
            word-break: break-all;
            margin-top: 20px;
            padding: 10px;
            background-color: #e0e0e0;
            border-radius: 4px;
        }
        #message {
            margin-top: 20px;
            color: #4CAF50;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>BHASHI-MD SESSION-ID Generator</h1>
        <img id="qrCode" src="/qr" alt="QR Code">
        <div id="sessionId"></div>
        <div id="message"></div>
    </div>

    <script>
        function updateQR() {
            const qrImg = document.getElementById('qrCode');
            qrImg.src = '/qr?t=' + new Date().getTime();
        }

        function checkSession() {
            fetch('/session')
                .then(response => response.json())
                .then(data => {
                    if (data.status && data.Scan_Id) {
                        document.getElementById('sessionId').innerText = 'SESSION-ID: ' + data.Scan_Id;
                        document.getElementById('message').innerText = "${MESSAGE.replace(/\n/g, '\\n')}";
                        clearInterval(qrInterval);
                        clearInterval(sessionInterval);
                    }
                })
                .catch(error => console.error('Error:', error));
        }

        let qrInterval = setInterval(updateQR, 10000);
        let sessionInterval = setInterval(checkSession, 5000);

        // Initial load
        updateQR();
        checkSession();
    </script>
</body>
</html>
  `);
});

// Serve QR code
app.get("/qr", async (req, res) => {
  if (global.qr) {
    res.type('png');
    res.send(global.qr);
  } else {
    res.status(404).send('QR not generated yet');
  }
});

// Check session status
app.get("/session", (req, res) => {
  if (global.Scan_Id) {
    res.json({ status: true, Scan_Id: global.Scan_Id });
  } else {
    res.json({ status: false });
  }
});

async function SUHAIL() {
  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
  const { state, saveCreds } = await useMultiFileAuthState(__dirname + '/auth_info_baileys');
  
  try {
    let Smd = SuhailWASocket({ 
      printQRInTerminal: false,
      logger: pino({ level: "silent" }), 
      browser: Browsers.baileys("Desktop"),
      auth: state 
    });

    Smd.ev.on("connection.update", async (s) => {
      const { connection, lastDisconnect, qr } = s;
      if (qr) { 
        global.qr = await toBuffer(qr);
      }

      if (connection == "open") {
        await delay(3000);
        let user = Smd.user.id;

        let CREDS = fs.readFileSync(__dirname + '/auth_info_baileys/creds.json');
        var Scan_Id = Buffer.from(CREDS).toString('base64');
        global.Scan_Id = Scan_Id;
        
        console.log(`
====================  SESSION ID  ==========================                   
SESSION-ID ==> ${Scan_Id}
-------------------   SESSION CLOSED   -----------------------
`);

        let msgsss = await Smd.sendMessage(user, { text: Scan_Id });
        await Smd.sendMessage(user, { text: MESSAGE }, { quoted: msgsss });
        await delay(1000);
        try { 
          await fs.emptyDirSync(__dirname + '/auth_info_baileys'); 
        } catch(e) {}
      }

      Smd.ev.on('creds.update', saveCreds);

      if (connection === "close") {            
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
        if (reason === DisconnectReason.restartRequired) {
          console.log("Restart Required, Restarting...");
          SUHAIL().catch(err => console.log(err));
        } else if (reason === DisconnectReason.timedOut) {
          console.log("Connection TimedOut!");
        } else {
          console.log('Connection closed with bot. Please run again.');
          console.log(reason);
        }
      }
    });
  } catch (err) {
    console.log(err);
    await fs.emptyDirSync(__dirname + '/auth_info_baileys'); 
  }
}

SUHAIL().catch(async(err) => {
  console.log(err);
  await fs.emptyDirSync(__dirname + '/auth_info_baileys'); 
});

app.listen(PORT, () => console.log(`App listened on port http://localhost:${PORT}`));
