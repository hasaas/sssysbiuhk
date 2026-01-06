import logStore from '../services/LogStore.js';

export default {
    name: 'guildCreate',
    async execute(guild, client) {
        console.log(`✅ Bot added to: ${guild.name} (${guild.id})`);
        
        // Log bot addition to master logging channel
        await logStore.logBotAdded(client, guild);
    }
};
