import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('list-custom-icons')
        .setDescription('عرض قائمة الأيقونات المخصصة (بريميم فقط)')
        .addStringOption(option =>
            option
                .setName('level_name')
                .setDescription('اسم المستوى (اختياري - لعرض مستوى معين)')
                .setRequired(false)
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

        const levelName = interaction.options.getString('level_name');

        try {
            if (!config.premium.customIcons || Object.keys(config.premium.customIcons).length === 0) {
                return interaction.reply({
                    content: '📋 لا توجد أيقونات مخصصة في هذا السيرفر\n\nاستخدم `/add-custom-icon` لإضافة أيقونات',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#00BFFF')
                .setTitle('📋 قائمة الأيقونات المخصصة')
                .setTimestamp();

            if (levelName) {
                // Show icons for specific level
                if (!config.premium.customIcons[levelName]) {
                    return interaction.reply({
                        content: `❌ لا توجد أيقونات مخصصة للمستوى "${levelName}"`,
                        ephemeral: true
                    });
                }

                const icons = config.premium.customIcons[levelName];
                let description = `**المستوى:** ${levelName}\n**عدد الأيقونات:** ${icons.length}\n\n`;
                
                icons.forEach((icon, index) => {
                    description += `**${index + 1}.** ${icon.icon} - ${icon.name}\n`;
                });

                embed.setDescription(description);
            } else {
                // Show all levels
                let description = '';
                let totalIcons = 0;

                for (const [level, icons] of Object.entries(config.premium.customIcons)) {
                    if (icons.length > 0) {
                        description += `\n**${level}** (${icons.length} أيقونة):\n`;
                        icons.forEach((icon, index) => {
                            description += `${index + 1}. ${icon.icon} - ${icon.name}\n`;
                        });
                        totalIcons += icons.length;
                    }
                }

                embed.setDescription(description || 'لا توجد أيقونات')
                    .setFooter({ text: `إجمالي: ${totalIcons} أيقونة مخصصة` });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error listing custom icons:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء عرض القائمة',
                ephemeral: true
            });
        }
    }
};
