import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('delete-custom-icon')
        .setDescription('حذف أيقونة مخصصة (بريميم فقط)')
        .addStringOption(option =>
            option
                .setName('level_name')
                .setDescription('اسم المستوى')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('icon_index')
                .setDescription('رقم الأيقونة (استخدم /list-custom-icons لمعرفة الأرقام)')
                .setRequired(true)
                .setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const config = configStore.getGuildConfig(guildId);

        // Check premium
        if (!config.premium?.enabled) {
            return interaction.reply({
                content: '❌ هذه الميزة متاحة للسيرفرات البريميم فقط.',
                ephemeral: true
            });
        }

        // Check premium expiration
        if (config.premium.expiresAt) {
            const expirationDate = new Date(config.premium.expiresAt);
            if (expirationDate < new Date()) {
                return interaction.reply({
                    content: '⚠️ انتهت صلاحية البريميم للسيرفر.',
                    ephemeral: true
                });
            }
        }

        const levelName = interaction.options.getString('level_name');
        const iconIndex = interaction.options.getInteger('icon_index') - 1; // Convert to 0-based

        try {
            if (!config.premium.customIcons?.[levelName]) {
                return interaction.reply({
                    content: `❌ لا توجد أيقونات مخصصة للمستوى "${levelName}"`,
                    ephemeral: true
                });
            }

            const icons = config.premium.customIcons[levelName];
            
            if (iconIndex < 0 || iconIndex >= icons.length) {
                return interaction.reply({
                    content: `❌ رقم الأيقونة غير صحيح. الأيقونات المتاحة: 1-${icons.length}\n\nاستخدم \`/list-custom-icons level_name:${levelName}\` لعرض القائمة`,
                    ephemeral: true
                });
            }

            const deletedIcon = icons[iconIndex];
            icons.splice(iconIndex, 1);

            // If no icons left, remove the level key
            if (icons.length === 0) {
                delete config.premium.customIcons[levelName];
            }

            configStore.updateGuildConfig(guildId, { premium: config.premium });

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🗑️ تم حذف الأيقونة المخصصة')
                .addFields(
                    { name: 'المستوى', value: levelName, inline: true },
                    { name: 'الأيقونة المحذوفة', value: deletedIcon.icon, inline: true },
                    { name: 'الاسم', value: deletedIcon.name, inline: true },
                    { name: 'الأيقونات المتبقية', value: `${icons.length}`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error deleting custom icon:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء حذف الأيقونة',
                ephemeral: true
            });
        }
    }
};
