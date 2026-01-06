import dataStore from '../services/DataStore.js';
import logStore from '../services/LogStore.js';
import configStore from '../services/ConfigStore.js';
import { scheduleTask } from '../utils/helpers.js';
import { shouldStreakBreak } from '../utils/helpers.js';
import { EmbedBuilder } from 'discord.js';

export default {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`✅ Logged in as ${client.user.tag}`);
        console.log(`🎮 Serving ${client.guilds.cache.size} guilds`);
        
        client.user.setActivity('Streak System', { type: 'WATCHING' });

        // Setup scheduled tasks
        setupSchedules(client);
    }
};

function setupSchedules(client) {
    // Midnight task: Check expired streaks and premium expirations
    scheduleTask(0, 0, () => {
        console.log('🔍 Checking expired streaks and premium - 12:00 AM...');
        checkExpiredStreaks(client);
        checkExpiredPremium(client);
    });
    
    // 12:05 AM: Reset daily streak status
    scheduleTask(0, 5, () => {
        console.log('🔄 Resetting daily streak status - 12:05 AM...');
        resetDailyStreakStatus(client);
    });
    
    // Check premium expiration every 6 hours
    scheduleTask(0, 0, () => checkExpiredPremium(client));
    scheduleTask(6, 0, () => checkExpiredPremium(client));
    scheduleTask(12, 0, () => checkExpiredPremium(client));
    scheduleTask(18, 0, () => checkExpiredPremium(client));
}

function resetDailyStreakStatus(client) {
    console.log('🔄 Resetting daily streak status for all users...');
    
    let totalReset = 0;
    
    // Get all guild data and reset
    const allGuildIds = client.guilds.cache.map(guild => guild.id);
    
    allGuildIds.forEach(guildId => {
        const resetCount = dataStore.resetDailyStatus(guildId);
        totalReset += resetCount;
    });
    
    console.log(`✅ Reset streak status for ${totalReset} users across all guilds`);
}

async function checkExpiredStreaks(client) {
    console.log('🔍 Checking for expired streaks...');
    
    let totalExpired = 0;
    const allGuildIds = client.guilds.cache.map(guild => guild.id);

    for (const guildId of allGuildIds) {
        const guildData = dataStore.getGuildData(guildId);
        const expiredUsers = [];

        for (const [userId, userData] of Object.entries(guildData.users)) {
            if (dataStore.isBlocked(guildId, userId) || userData.streak === 0) continue;

            if (shouldStreakBreak(userData)) {
                expiredUsers.push({ userId, oldStreak: userData.streak });

                // Reset user data
                dataStore.updateUserData(guildId, userId, {
                    streak: 0,
                    dailyMessages: 0,
                    lastActiveDate: null,
                    streakEarned: false,
                    selectedIcon: null
                });
            }
        }

        totalExpired += expiredUsers.length;

        // Notify users and log
        const guild = client.guilds.cache.get(guildId);
        for (const { userId, oldStreak } of expiredUsers) {
            try {
                const user = await client.users.fetch(userId);
                
                // Log streak break
                if (guild) {
                    await logStore.logStreakBreak(client, guild, user, oldStreak);
                }

                const embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('انقطع الستريك • <a:Khnfosh100:1412821083178139751>')
                    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
                    .setDescription(`- <@${user.id}>\n> لقد انقطع الستريك لعدم ارسال الرسائل المطلوبة يومياً`)
                    .addFields(
                        { name: '📊 الستريك السابق', value: `${oldStreak} يوم`, inline: true }
                    )
                    .setTimestamp();

                await user.send({ embeds: [embed] });
            } catch (error) {
                console.log(`Cannot notify user ${userId} about streak expiration`);
            }
        }
    }

    console.log(`✅ Checked and reset ${totalExpired} expired streaks across all guilds`);
}

async function checkExpiredPremium(client) {
    console.log('🔍 Checking for expired premium subscriptions...');
    
    let totalExpired = 0;
    const allGuildIds = client.guilds.cache.map(guild => guild.id);
    const now = new Date();

    for (const guildId of allGuildIds) {
        const config = configStore.getGuildConfig(guildId);
        
        // Check if premium is enabled and has expiration date
        if (config.premium?.enabled && config.premium?.expiresAt) {
            const expirationDate = new Date(config.premium.expiresAt);
            
            // If expired, disable premium
            if (expirationDate <= now) {
                console.log(`⏰ Premium expired for guild ${guildId}`);
                
                config.premium = {
                    enabled: false,
                    expiresAt: null,
                    customIcons: {},
                    levelBounds: {}
                };
                
                configStore.updateGuildConfig(guildId, { premium: config.premium });
                totalExpired++;
                
                // Notify guild owner
                try {
                    const guild = client.guilds.cache.get(guildId);
                    if (guild) {
                        const owner = await guild.fetchOwner();
                        
                        const embed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('⏰ انتهت صلاحية البريميم')
                            .setDescription(`انتهت صلاحية البريميم في سيرفر **${guild.name}**\n\nتواصل مع مالك البوت لتجديد الاشتراك`)
                            .addFields(
                                { name: 'السيرفر', value: guild.name, inline: true },
                                { name: 'انتهى في', value: `<t:${Math.floor(expirationDate.getTime() / 1000)}:F>`, inline: true }
                            )
                            .setTimestamp();
                        
                        await owner.send({ embeds: [embed] }).catch(() => {
                            console.log(`Cannot notify owner of guild ${guildId}`);
                        });
                    }
                } catch (error) {
                    console.error(`Error notifying guild ${guildId} about premium expiration:`, error);
                }
            }
        }
    }
    
    if (totalExpired > 0) {
        console.log(`✅ Disabled premium for ${totalExpired} expired guilds`);
    } else {
        console.log('✅ No expired premium subscriptions found');
    }
}
