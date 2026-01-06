import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * ConfigStore - Manages per-guild configurations
 * Stores settings like streak channel, message count, allowed command channels, etc.
 */
class ConfigStore {
    constructor() {
        this.configPath = path.join(__dirname, '../../data/guild-configs.json');
        this.configs = this.loadConfigs();
    }

    loadConfigs() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading guild configs:', error);
        }
        return {};
    }

    saveConfigs() {
        try {
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify(this.configs, null, 2));
        } catch (error) {
            console.error('Error saving guild configs:', error);
        }
    }

    /**
     * Get configuration for a specific guild
     * @param {string} guildId 
     * @returns {object} Guild configuration
     */
    getGuildConfig(guildId) {
        if (!this.configs[guildId]) {
            this.configs[guildId] = this.getDefaultConfig();
            this.saveConfigs();
        }
        return this.configs[guildId];
    }

    /**
     * Get default configuration for new guilds
     */
    getDefaultConfig() {
        return {
            streakChannelId: null,
            commandChannelIds: [],
            adminRoleId: process.env.DEFAULT_ADMIN_ROLE_ID || null,
            streakRoleIds: process.env.DEFAULT_STREAK_ROLE_IDS 
                ? process.env.DEFAULT_STREAK_ROLE_IDS.split(',') 
                : [],
            logsChannelId: process.env.DEFAULT_LOGS_CHANNEL_ID || null,
            messageCountRequired: 5,
            timeLimit: null, // Time limit in hours (null = no limit)
            enabled: true,
            premium: {
                enabled: false,
                expiresAt: null,
                customIcons: {}, // { level: [icon1, icon2, ...] }
                customLevels: [] // [ { minStreak, maxStreak, name, color, icon } ]
            }
        };
    }

    /**
     * Update guild configuration
     * @param {string} guildId 
     * @param {object} updates 
     */
    updateGuildConfig(guildId, updates) {
        const config = this.getGuildConfig(guildId);
        this.configs[guildId] = { ...config, ...updates };
        this.saveConfigs();
        return this.configs[guildId];
    }

    /**
     * Set streak channel for a guild
     */
    setStreakChannel(guildId, channelId) {
        return this.updateGuildConfig(guildId, { streakChannelId: channelId });
    }

    /**
     * Add command channel
     */
    addCommandChannel(guildId, channelId) {
        const config = this.getGuildConfig(guildId);
        if (!config.commandChannelIds.includes(channelId)) {
            config.commandChannelIds.push(channelId);
            this.configs[guildId] = config;
            this.saveConfigs();
        }
        return config;
    }

    /**
     * Remove command channel
     */
    removeCommandChannel(guildId, channelId) {
        const config = this.getGuildConfig(guildId);
        config.commandChannelIds = config.commandChannelIds.filter(id => id !== channelId);
        this.configs[guildId] = config;
        this.saveConfigs();
        return config;
    }

    /**
     * Set message count required for streak
     */
    setMessageCount(guildId, count) {
        return this.updateGuildConfig(guildId, { messageCountRequired: count });
    }

    /**
     * Set time limit in hours
     */
    setTimeLimit(guildId, hours) {
        return this.updateGuildConfig(guildId, { timeLimit: hours });
    }

    /**
     * Check if a channel allows commands
     */
    isCommandChannel(guildId, channelId) {
        const config = this.getGuildConfig(guildId);
        return config.commandChannelIds.length === 0 || 
               config.commandChannelIds.includes(channelId);
    }
}

export default new ConfigStore();
