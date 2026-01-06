import { EmbedBuilder, WebhookClient } from 'discord.js';

/**
 * LogStore - Master logging service for bot activity tracking
 * Logs all bot events to specified channels in the bot owner's server
 */
class LogStore {
    constructor() {
        // Master log channels (from .env) - your personal server
        this.channels = {
            botActivity: process.env.LOG_CHANNEL_BOT_ACTIVITY || null,
            streakIncrement: process.env.LOG_CHANNEL_STREAK_INCREMENT || null,
            streakBreak: process.env.LOG_CHANNEL_STREAK_BREAK || null,
            blocks: process.env.LOG_CHANNEL_BLOCKS || null,
            roleChanges: process.env.LOG_CHANNEL_ROLE_CHANGES || null
        };
    }

    /**
     * Send log to specific channel
     */
    async sendLog(client, channelType, embed) {
        const channelId = this.channels[channelType];
        if (!channelId) return;

        try {
            const channel = await client.channels.fetch(channelId);
            if (channel && channel.isTextBased()) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error(`Error sending log to ${channelType}:`, error);
        }
    }

    /**
     * Log bot added to new server
     */
    async logBotAdded(client, guild) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Added to Server')
            .setColor('#00ff00')
            .addFields(
                { name: 'Server Name', value: guild.name, inline: true },
                { name: 'Server ID', value: guild.id, inline: true },
                { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
                { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
                { name: 'Added At', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setThumbnail(guild.iconURL() || null)
            .setTimestamp();

        await this.sendLog(client, 'botActivity', embed);
    }

    /**
     * Log bot removed from server
     */
    async logBotRemoved(client, guild) {
        const embed = new EmbedBuilder()
            .setTitle('❌ Bot Removed from Server')
            .setColor('#ff0000')
            .addFields(
                { name: 'Server Name', value: guild.name, inline: true },
                { name: 'Server ID', value: guild.id, inline: true },
                { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
                { name: 'Removed At', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setTimestamp();

        await this.sendLog(client, 'botActivity', embed);
    }

    /**
     * Log streak increment
     */
    async logStreakIncrement(client, guild, user, oldStreak, newStreak) {
        const embed = new EmbedBuilder()
            .setTitle('📈 Streak Increased')
            .setColor('#00ff00')
            .addFields(
                { name: 'Server', value: `${guild.name} (${guild.id})`, inline: false },
                { name: 'User', value: `${user.tag} (<@${user.id}>)`, inline: true },
                { name: 'Old Streak', value: `${oldStreak}`, inline: true },
                { name: 'New Streak', value: `${newStreak}`, inline: true },
                { name: 'Time', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        await this.sendLog(client, 'streakIncrement', embed);
    }

    /**
     * Log streak break
     */
    async logStreakBreak(client, guild, user, lostStreak, reason = 'Missed daily activity') {
        const embed = new EmbedBuilder()
            .setTitle('💔 Streak Broken')
            .setColor('#ff0000')
            .addFields(
                { name: 'Server', value: `${guild.name} (${guild.id})`, inline: false },
                { name: 'User', value: `${user.tag} (<@${user.id}>)`, inline: true },
                { name: 'Lost Streak', value: `${lostStreak}`, inline: true },
                { name: 'Reason', value: reason, inline: false },
                { name: 'Time', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setThumbnail(user.displayAvatarURL())
            .setTimestamp();

        await this.sendLog(client, 'streakBreak', embed);
    }

    /**
     * Log user block
     */
    async logUserBlock(client, guild, moderator, blockedUser) {
        const embed = new EmbedBuilder()
            .setTitle('🚫 User Blocked')
            .setColor('#ff0000')
            .addFields(
                { name: 'Server', value: `${guild.name} (${guild.id})`, inline: false },
                { name: 'Blocked User', value: `${blockedUser.tag} (<@${blockedUser.id}>)`, inline: true },
                { name: 'Blocked By', value: `${moderator.tag} (<@${moderator.id}>)`, inline: true },
                { name: 'Time', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setTimestamp();

        await this.sendLog(client, 'blocks', embed);
    }

    /**
     * Log user unblock
     */
    async logUserUnblock(client, guild, moderator, unblockedUser) {
        const embed = new EmbedBuilder()
            .setTitle('✅ User Unblocked')
            .setColor('#00ff00')
            .addFields(
                { name: 'Server', value: `${guild.name} (${guild.id})`, inline: false },
                { name: 'Unblocked User', value: `${unblockedUser.tag} (<@${unblockedUser.id}>)`, inline: true },
                { name: 'Unblocked By', value: `${moderator.tag} (<@${moderator.id}>)`, inline: true },
                { name: 'Time', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setTimestamp();

        await this.sendLog(client, 'blocks', embed);
    }

    /**
     * Log streak role addition
     */
    async logStreakRoleAdd(client, guild, moderator, role) {
        const embed = new EmbedBuilder()
            .setTitle('➕ Streak Role Added')
            .setColor('#00ff00')
            .addFields(
                { name: 'Server', value: `${guild.name} (${guild.id})`, inline: false },
                { name: 'Role', value: `${role.name} (<@&${role.id}>)`, inline: true },
                { name: 'Added By', value: `${moderator.tag} (<@${moderator.id}>)`, inline: true },
                { name: 'Time', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setTimestamp();

        await this.sendLog(client, 'roleChanges', embed);
    }

    /**
     * Log streak role removal
     */
    async logStreakRoleRemove(client, guild, moderator, role) {
        const embed = new EmbedBuilder()
            .setTitle('➖ Streak Role Removed')
            .setColor('#ff0000')
            .addFields(
                { name: 'Server', value: `${guild.name} (${guild.id})`, inline: false },
                { name: 'Role', value: `${role.name} (<@&${role.id}>)`, inline: true },
                { name: 'Removed By', value: `${moderator.tag} (<@${moderator.id}>)`, inline: true },
                { name: 'Time', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setTimestamp();

        await this.sendLog(client, 'roleChanges', embed);
    }

    /**
     * Log streak manual addition
     */
    async logStreakManualAdd(client, guild, moderator, targetUser, amount) {
        const embed = new EmbedBuilder()
            .setTitle('➕ Streak Manually Added')
            .setColor('#00ff00')
            .addFields(
                { name: 'Server', value: `${guild.name} (${guild.id})`, inline: false },
                { name: 'Target User', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                { name: 'Amount Added', value: `${amount}`, inline: true },
                { name: 'Added By', value: `${moderator.tag} (<@${moderator.id}>)`, inline: true },
                { name: 'Time', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setTimestamp();

        await this.sendLog(client, 'roleChanges', embed);
    }

    /**
     * Log streak manual removal
     */
    async logStreakManualRemove(client, guild, moderator, targetUser, amount) {
        const embed = new EmbedBuilder()
            .setTitle('➖ Streak Manually Removed')
            .setColor('#ff0000')
            .addFields(
                { name: 'Server', value: `${guild.name} (${guild.id})`, inline: false },
                { name: 'Target User', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                { name: 'Amount Removed', value: `${amount}`, inline: true },
                { name: 'Removed By', value: `${moderator.tag} (<@${moderator.id}>)`, inline: true },
                { name: 'Time', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setTimestamp();

        await this.sendLog(client, 'roleChanges', embed);
    }

    /**
     * Log streak reset
     */
    async logStreakReset(client, guild, moderator, targetUser, oldStreak) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 Streak Reset')
            .setColor('#ff9900')
            .addFields(
                { name: 'Server', value: `${guild.name} (${guild.id})`, inline: false },
                { name: 'Target User', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                { name: 'Old Streak', value: `${oldStreak}`, inline: true },
                { name: 'Reset By', value: `${moderator.tag} (<@${moderator.id}>)`, inline: true },
                { name: 'Time', value: new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }) }
            )
            .setTimestamp();

        await this.sendLog(client, 'roleChanges', embed);
    }
}

export default new LogStore();
