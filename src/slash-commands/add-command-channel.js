import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('add-command-channel')
        .setDescription('إضافة قناة للقنوات المسموحة للأوامر')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('القناة المراد إضافتها')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        try {
            const config = configStore.addCommandChannel(guildId, channel.id);

            await interaction.reply({
                content: `✅ تمت إضافة قناة <#${channel.id}> إلى القنوات المسموحة للأوامر\n\n**القنوات المسموحة حالياً:**\n${config.commandChannelIds.map(id => `<#${id}>`).join('\n') || 'جميع القنوات (لم يتم تحديد قنوات)'}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error adding command channel:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء إضافة القناة',
                ephemeral: true
            });
        }
    }
};
