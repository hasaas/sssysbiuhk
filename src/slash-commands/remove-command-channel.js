import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('remove-command-channel')
        .setDescription('إزالة قناة من القنوات المسموحة للأوامر')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('القناة المراد إزالتها')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        try {
            const config = configStore.removeCommandChannel(guildId, channel.id);

            await interaction.reply({
                content: `✅ تمت إزالة قناة <#${channel.id}> من القنوات المسموحة للأوامر\n\n**القنوات المسموحة حالياً:**\n${config.commandChannelIds.map(id => `<#${id}>`).join('\n') || 'جميع القنوات (لم يتم تحديد قنوات)'}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error removing command channel:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء إزالة القناة',
                ephemeral: true
            });
        }
    }
};
