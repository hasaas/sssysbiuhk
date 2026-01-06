import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('set-message-count')
        .setDescription('تعيين عدد الرسائل المطلوبة يومياً للحصول على الستريك')
        .addIntegerOption(option =>
            option
                .setName('count')
                .setDescription('عدد الرسائل المطلوبة (1-20)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(20)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const count = interaction.options.getInteger('count');
        const guildId = interaction.guild.id;

        try {
            configStore.setMessageCount(guildId, count);

            await interaction.reply({
                content: `✅ تم تعيين عدد الرسائل المطلوبة إلى: **${count}** رسالة يومياً`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting message count:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تعيين عدد الرسائل',
                ephemeral: true
            });
        }
    }
};
