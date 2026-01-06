import { REST, Routes } from 'discord.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandsPath = join(__dirname, 'slash-commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('📂 Loading slash commands for deployment...');
for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    // ✅ fix for Windows ESM path issue
    const command = await import(`file://${filePath.replace(/\\/g, '/')}`);
    
    if ('data' in command.default) {
        commands.push(command.default.data.toJSON());
        console.log(`  ✅ Loaded: ${command.default.data.name}`);
    } else {
        console.log(`  ⚠️  Skipped: ${file}`);
    }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`\n🚀 Registering ${commands.length} global slash commands...`);

        // ✅ global commands (takes up to 1h to show)
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`✅ Successfully registered ${data.length} global commands.`);
        console.log('⚠️ Note: It may take up to 1 hour for them to appear globally.\n');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
})();
