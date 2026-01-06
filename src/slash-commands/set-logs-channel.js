import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('set-logs-channel')
        .setDescription('تعيين قناة السجلات (Logs)')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('القناة المخصصة لسجلات البوت')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        try {
            configStore.updateGuildConfig(guildId, { logsChannelId: channel.id });

            await interaction.reply({
                content: `✅ تم تعيين قناة السجلات إلى: <#${channel.id}>`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting logs channel:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تعيين قناة السجلات',
                ephemeral: true
            });
        }
    }
};
