import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import dataStore from '../services/DataStore.js';
import logStore from '../services/LogStore.js';
import { getRankWithSelectedIcon, findSimilarIconInNewRank } from '../utils/ranks.js';

export default {
    data: new SlashCommandBuilder()
        .setName('remove-streak')
        .setDescription('إزالة ستريك من مستخدم')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم المراد إزالة الستريك منه')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('عدد الستريكات المراد إزالتها')
                .setRequired(true)
                .setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;

        try {
            const userData = dataStore.getUserData(guildId, user.id);

            if (!userData || userData.streak === 0) {
                return interaction.reply({
                    content: '❌ هذا المستخدم لا يملك ستريك',
                    ephemeral: true
                });
            }

            const oldStreak = userData.streak;
            const newStreak = Math.max(0, oldStreak - amount);
            const oldRank = getRankWithSelectedIcon(userData.streak, userData.selectedIcon);

            userData.streak = newStreak;
            const newRank = getRankWithSelectedIcon(userData.streak, userData.selectedIcon);

            // Update or remove icon if rank changed
            if (oldRank.name !== newRank.name && userData.selectedIcon) {
                const similarIcon = findSimilarIconInNewRank(userData.selectedIcon, newRank.name);
                if (similarIcon) {
                    userData.selectedIcon = similarIcon;
                } else if (userData.streak < 10) {
                    userData.selectedIcon = null;
                }
            }

            dataStore.updateUserData(guildId, user.id, userData);

            const embed = new EmbedBuilder()
                .setColor('#FF6600')
                .setDescription(`> تم إزالة **${amount}** ستريك من **<@${user.id}>** بنجاح`)
                .addFields(
                    { name: 'الستريك السابق', value: `${oldStreak}`, inline: true },
                    { name: 'الستريك الحالي', value: `${userData.streak}`, inline: true },
                    { name: 'بواسطة', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Log manual removal
            await logStore.logStreakManualRemove(interaction.client, interaction.guild, interaction.user, user, amount);
        } catch (error) {
            console.error('Error removing strike:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء إزالة الستريك',
                ephemeral: true
            });
        }
    }
};
