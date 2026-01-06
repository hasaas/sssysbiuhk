import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('set-streak-chat')
        .setDescription('تعيين قناة الستريك للسيرفر')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('القناة المخصصة لنظام الستريك')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        try {
            configStore.setStreakChannel(guildId, channel.id);

            await interaction.reply({
                content: `✅ تم تعيين قناة الستريك إلى: <#${channel.id}>`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting streak channel:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تعيين قناة الستريك',
                ephemeral: true
            });
        }
    }
};
