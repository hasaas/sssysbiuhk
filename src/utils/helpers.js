/**
 * Helper utility functions
 */

export function getTodayDate() {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
}

export function getSaudiTime() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
}

export function getSaudiDateTimeString() {
    return new Date().toLocaleString("sv-SE", { timeZone: "Asia/Riyadh" }).replace(" ", "T");
}

export function shouldStreakBreak(userData) {
    return userData.streak > 0 && !userData.streakEarned;
}

/**
 * Safe interaction reply handler
 */
export async function safeInteractionReply(interaction, options, ephemeral = false) {
    if (!interaction) return;
    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(options);
        } else {
            await interaction.reply({
                ...options,
                ephemeral
            });
        }
    } catch (err) {
        console.error('Failed to reply to interaction:', err.message);
    }
}

/**
 * Safe interaction update handler
 */
export async function safeInteractionUpdate(interaction, content) {
    try {
        if (!interaction) return null;
        
        if (!isInteractionValid(interaction)) {
            console.log('Cannot update interaction - already handled or expired');
            return null;
        }
        
        return await interaction.update(content);
    } catch (error) {
        console.error('Error updating interaction:', error.message);
        return null;
    }
}

/**
 * Check if interaction is still valid
 */
export function isInteractionValid(interaction) {
    if (!interaction || typeof interaction.reply !== 'function') {
        return false;
    }
    
    if (interaction.replied || interaction.deferred) {
        return false;
    }
    
    const interactionAge = Date.now() - interaction.createdTimestamp;
    if (interactionAge > 900000) { // 15 minutes
        console.log(`Interaction expired: ${interactionAge}ms old`);
        return false;
    }
    
    return true;
}

/**
 * Schedule task at specific Saudi time
 */
export function scheduleTask(hour, minute, callback) {
    const saudiTime = getSaudiTime();
    
    const targetTime = new Date(saudiTime);
    targetTime.setHours(hour, minute, 0, 0);
    
    if (targetTime <= saudiTime) {
        targetTime.setDate(targetTime.getDate() + 1);
    }
    
    const msUntilTarget = targetTime.getTime() - saudiTime.getTime();
    
    setTimeout(() => {
        callback();
        setInterval(callback, 24 * 60 * 60 * 1000);
    }, msUntilTarget);
    
    const hoursUntilTarget = Math.floor(msUntilTarget / 1000 / 60 / 60);
    const minutesUntilTarget = Math.floor((msUntilTarget / 1000 / 60) % 60);
    console.log(`⏰ Scheduled task at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} in ${hoursUntilTarget}h ${minutesUntilTarget}m`);
}
