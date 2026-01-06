import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('set-admin-role')
        .setDescription('تعيين رتبة المشرفين للبوت')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('الرتبة المخصصة للمشرفين')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const guildId = interaction.guild.id;

        try {
            configStore.updateGuildConfig(guildId, { adminRoleId: role.id });

            await interaction.reply({
                content: `✅ تم تعيين رتبة المشرفين إلى: <@&${role.id}>`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting admin role:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تعيين رتبة المشرفين',
                ephemeral: true
            });
        }
    }
};
