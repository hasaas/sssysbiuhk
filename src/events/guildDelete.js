import logStore from '../services/LogStore.js';

export default {
    name: 'guildDelete',
    async execute(guild, client) {
        console.log(`❌ Bot removed from: ${guild.name} (${guild.id})`);
        
        // Log bot removal to master logging channel
        await logStore.logBotRemoved(client, guild);
    }
};
