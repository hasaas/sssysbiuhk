import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import configStore from '../services/ConfigStore.js';
import logStore from '../services/LogStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('add-streak-role')
        .setDescription('إضافة رتبة للرتب المسموحة بالمشاركة في نظام الستريك')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('الرتبة المراد إضافتها')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const guildId = interaction.guild.id;

        try {
            const config = configStore.getGuildConfig(guildId);
            
            if (config.streakRoleIds.includes(role.id)) {
                await interaction.reply({
                    content: `⚠️ الرتبة <@&${role.id}> موجودة بالفعل في قائمة الرتب المسموحة`,
                    ephemeral: true
                });
                return;
            }

            config.streakRoleIds.push(role.id);
            configStore.updateGuildConfig(guildId, { streakRoleIds: config.streakRoleIds });

            await interaction.reply({
                content: `✅ تمت إضافة رتبة <@&${role.id}> إلى الرتب المسموحة\n\n**الرتب المسموحة حالياً:**\n${config.streakRoleIds.map(id => `<@&${id}>`).join('\n') || 'لا توجد رتب (الجميع مسموح)'}`,
                ephemeral: true
            });

            // Log role addition
            await logStore.logStreakRoleAdd(interaction.client, interaction.guild, interaction.user, role);
        } catch (error) {
            console.error('Error adding streak role:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء إضافة الرتبة',
                ephemeral: true
            });
        }
    }
};
