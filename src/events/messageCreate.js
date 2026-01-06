import configStore from '../services/ConfigStore.js';
import dataStore from '../services/DataStore.js';
import logStore from '../services/LogStore.js';
import { getTodayDate, getSaudiTime, getSaudiDateTimeString } from '../utils/helpers.js';
import { getRankWithSelectedIcon, findSimilarIconInNewRank } from '../utils/ranks.js';
import { EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default {
    name: 'messageCreate',
    async execute(message, client) {
        // Ignore bot messages
        if (message.author.bot) return;
        if (!message.guild) return;
        const userId = message.author.id;
        const guildId = message.guild.id;
        const config = configStore.getGuildConfig(guildId);
        // Handle prefix commands
        await handlePrefixCommands(message, client, config);
        // Check if this is the streak channel
        if (message.channel.id !== config.streakChannelId) return;
        // Check if user has required roles
        if (config.streakRoleIds.length > 0) {
            const hasRole = message.member.roles.cache.some(role =>
                config.streakRoleIds.includes(role.id)
            );
            if (!hasRole) return;
        }
        // Check if user is blocked
        if (dataStore.isBlocked(guildId, userId)) return;
        // Check time limit (if set)
        if (config.timeLimit) {
            const saudiTime = getSaudiTime();
            const hours = saudiTime.getHours();
            const minutes = saudiTime.getMinutes();
           
            // Skip during midnight reset window (00:00-00:05)
            if (hours === 0 && minutes >= 0 && minutes <= 5) {
                return;
            }
        }
        await updateStreak(message, guildId, config, client);
    }
};
async function handlePrefixCommands(message, client, config) {
    let content = message.content.trim();
   
    // Check if message starts with ! or is in allowed command channels
    const startsWithPrefix = content.startsWith('!');
    if (!startsWithPrefix) return;
    // Check if channel allows commands
    if (!configStore.isCommandChannel(message.guild.id, message.channel.id)) {
        return;
    }
    // Remove prefix
    content = content.slice(1).trim();
   
    const args = content.split(/\s+/);
    const commandName = args.shift().toLowerCase();
    // Load and execute command
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = await import(`file://${filePath}?update=${Date.now()}`);
       
        if (command.default.name === commandName ||
            (command.default.aliases && command.default.aliases.includes(commandName))) {
            try {
                await command.default.execute(message, args, client);
            } catch (error) {
                console.error(`Error executing command ${commandName}:`, error);
            }
            break;
        }
    }
}
async function updateStreak(message, guildId, config, client) {
    const user = message.author;
    const userId = user.id;
    const todayDate = getTodayDate();
    const userData = dataStore.getUserData(guildId, userId);
    const oldRank = getRankWithSelectedIcon(userData.streak, userData.selectedIcon, config);
    userData.lastMessageDate = getSaudiDateTimeString();
    if (!userData.lastActiveDate) {
        userData.lastActiveDate = todayDate;
        userData.dailyMessages = 1;
        userData.streak = 0;
    } else if (userData.lastActiveDate === todayDate) {
        userData.dailyMessages += 1;
        // Check if user earned streak for today
        if (userData.dailyMessages >= config.messageCountRequired && !userData.streakEarned) {
            const oldStreakValue = userData.streak;
            userData.streak += 1;
            userData.streakEarned = true;
            userData.streakEarnedAt = getSaudiDateTimeString();
            const newRank = getRankWithSelectedIcon(userData.streak, userData.selectedIcon, config);
            // Update icon if rank changed
            if (oldRank.name !== newRank.name && userData.selectedIcon) {
                const similarIcon = findSimilarIconInNewRank(userData.selectedIcon, newRank.name);
                if (similarIcon) {
                    userData.selectedIcon = similarIcon;
                }
            }
            dataStore.updateUserData(guildId, userId, userData);
            // Log streak increment
            await logStore.logStreakIncrement(client, message.guild, user, oldStreakValue, userData.streak);
            // Send streak update notification
            await sendStreakUpdate(message, user, userData.streak, oldRank, newRank);
            return;
        }
    } else {
        // New day
        userData.lastActiveDate = todayDate;
        userData.dailyMessages = 1;
        userData.streakEarned = false;
    }
    dataStore.updateUserData(guildId, userId, userData);
}
async function sendStreakUpdate(message, user, newStreak, oldRank, newRank) {
    try {
        const embed = new EmbedBuilder()
            .setColor(newRank.color)
            .setTitle('تم تحديث الستريك <a:__:1412470891765305415>')
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setDescription(`- **<@${user.id}>**\n- ${newStreak} • ${newRank.icon}`)
            .setFooter({ text: `${message.guild?.name} • ${newRank.name}`,
                        iconURL: message.guild?.iconURL({ dynamic: true }) 
 });
        await user.send({ embeds: [embed] });
    } catch (error) {
        console.log('Cannot DM user:', user.username);
    }
}