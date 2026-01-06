// src/index.js
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// إنشاء العميل
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// تجهيز كولكشن للأوامر
client.commands = new Collection();

// تحميل أوامر السلاش
const commandsPath = join(__dirname, 'slash-commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('📂 Loading slash commands...');
for (const file of commandFiles) {
    const filePath = join(commandsPath, file);

    // نحوله إلى URL صالح لويندوز
    const commandModule = await import(pathToFileURL(filePath));
    const command = commandModule.default;

    if (command && command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`  ✅ Loaded: ${command.data.name}`);
    } else {
        console.log(`  ⚠️ Skipped: ${file} (missing data or execute)`);
    }
}

// تحميل الأحداث
const eventsPath = join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

console.log('📂 Loading events...');
for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const eventModule = await import(pathToFileURL(filePath));
    const event = eventModule.default;

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
        console.log(`  ✅ Loaded (once): ${event.name}`);
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
        console.log(`  ✅ Loaded: ${event.name}`);
    }
}

// التعامل مع الأخطاء
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection:', reason);
});

client.on('error', error => {
    console.error('⚠️ Discord client error:', error);
});

// تسجيل الدخول
client.login(process.env.DISCORD_TOKEN);
