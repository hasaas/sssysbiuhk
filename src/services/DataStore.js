import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * DataStore - Manages user streak data across all guilds
 * Format: { guildId: { userId: userData } }
 */
class DataStore {
    constructor() {
        this.dataPath = path.join(__dirname, '../../data/streaks.json');
        this.data = this.loadData();
    }

    loadData() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const fileData = fs.readFileSync(this.dataPath, 'utf8');
                const parsed = JSON.parse(fileData);
                
                // Convert arrays back to Sets for blocked users
                for (const guildId in parsed) {
                    if (parsed[guildId].blocked && Array.isArray(parsed[guildId].blocked)) {
                        parsed[guildId].blocked = new Set(parsed[guildId].blocked);
                    }
                }
                
                return parsed;
            }
        } catch (error) {
            console.error('Error loading streak data:', error);
        }
        return {};
    }

    saveData() {
        try {
            const dir = path.dirname(this.dataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Convert Sets to Arrays for JSON serialization
            const dataToSave = {};
            for (const guildId in this.data) {
                dataToSave[guildId] = {
                    ...this.data[guildId],
                    blocked: Array.from(this.data[guildId].blocked || new Set())
                };
            }

            fs.writeFileSync(this.dataPath, JSON.stringify(dataToSave, null, 2));
        } catch (error) {
            console.error('Error saving streak data:', error);
        }
    }

    /**
     * Get guild data (users and blocked list)
     */
    getGuildData(guildId) {
        if (!this.data[guildId]) {
            this.data[guildId] = {
                users: {},
                blocked: new Set()
            };
        }
        return this.data[guildId];
    }

    /**
     * Get user data for a specific guild
     */
    getUserData(guildId, userId) {
        const guildData = this.getGuildData(guildId);
        
        if (!guildData.users[userId]) {
            guildData.users[userId] = {
                streak: 0,
                lastActiveDate: null,
                dailyMessages: 0,
                lastMessageDate: null,
                streakEarned: false,
                streakEarnedAt: null,
                selectedIcon: null
            };
        }
        
        return guildData.users[userId];
    }

    /**
     * Update user data
     */
    updateUserData(guildId, userId, updates) {
        const userData = this.getUserData(guildId, userId);
        const guildData = this.getGuildData(guildId);
        guildData.users[userId] = { ...userData, ...updates };
        this.saveData();
        return guildData.users[userId];
    }

    /**
     * Check if user is blocked
     */
    isBlocked(guildId, userId) {
        const guildData = this.getGuildData(guildId);
        return guildData.blocked.has(userId);
    }

    /**
     * Block a user
     */
    blockUser(guildId, userId) {
        const guildData = this.getGuildData(guildId);
        guildData.blocked.add(userId);
        
        // Remove user data when blocked
        if (guildData.users[userId]) {
            delete guildData.users[userId];
        }
        
        this.saveData();
    }

    /**
     * Unblock a user
     */
    unblockUser(guildId, userId) {
        const guildData = this.getGuildData(guildId);
        guildData.blocked.delete(userId);
        this.saveData();
    }

    /**
     * Get all users in a guild (sorted by streak)
     */
    getAllUsers(guildId) {
        const guildData = this.getGuildData(guildId);
        return Object.entries(guildData.users)
            .filter(([userId]) => !guildData.blocked.has(userId))
            .sort(([, a], [, b]) => {
                if (b.streak !== a.streak) {
                    return b.streak - a.streak;
                }
                const aTime = new Date(a.streakEarnedAt || 0);
                const bTime = new Date(b.streakEarnedAt || 0);
                return aTime - bTime;
            });
    }

    /**
     * Get blocked users list
     */
    getBlockedUsers(guildId) {
        const guildData = this.getGuildData(guildId);
        return Array.from(guildData.blocked);
    }

    /**
     * Add streak to user
     */
    addStreak(guildId, userId, amount) {
        const userData = this.getUserData(guildId, userId);
        userData.streak += amount;
        this.saveData();
        return userData;
    }

    /**
     * Remove streak from user
     */
    removeStreak(guildId, userId, amount) {
        const userData = this.getUserData(guildId, userId);
        userData.streak = Math.max(0, userData.streak - amount);
        this.saveData();
        return userData;
    }

    /**
     * Reset daily streak status for all users in a guild
     */
    resetDailyStatus(guildId) {
        const guildData = this.getGuildData(guildId);
        let resetCount = 0;
        
        for (const userId in guildData.users) {
            if (guildData.users[userId].streakEarned) {
                guildData.users[userId].streakEarned = false;
                resetCount++;
            }
            guildData.users[userId].dailyMessages = 0;
        }
        
        this.saveData();
        return resetCount;
    }
}

export default new DataStore();
