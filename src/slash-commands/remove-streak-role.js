import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import configStore from '../services/ConfigStore.js';
import logStore from '../services/LogStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('remove-streak-role')
        .setDescription('إزالة رتبة من الرتب المسموحة بالمشاركة في نظام الستريك')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('الرتبة المراد إزالتها')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const guildId = interaction.guild.id;

        try {
            const config = configStore.getGuildConfig(guildId);
            
            if (!config.streakRoleIds.includes(role.id)) {
                await interaction.reply({
                    content: `⚠️ الرتبة <@&${role.id}> غير موجودة في قائمة الرتب المسموحة`,
                    ephemeral: true
                });
                return;
            }

            config.streakRoleIds = config.streakRoleIds.filter(id => id !== role.id);
            configStore.updateGuildConfig(guildId, { streakRoleIds: config.streakRoleIds });

            await interaction.reply({
                content: `✅ تمت إزالة رتبة <@&${role.id}> من الرتب المسموحة\n\n**الرتب المسموحة حالياً:**\n${config.streakRoleIds.map(id => `<@&${id}>`).join('\n') || 'لا توجد رتب (الجميع مسموح)'}`,
                ephemeral: true
            });

            // Log role removal
            await logStore.logStreakRoleRemove(interaction.client, interaction.guild, interaction.user, role);
        } catch (error) {
            console.error('Error removing streak role:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء إزالة الرتبة',
                ephemeral: true
            });
        }
    }
};
