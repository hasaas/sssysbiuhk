import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import dataStore from '../services/DataStore.js';
import logStore from '../services/LogStore.js';
import { getRankWithSelectedIcon, findSimilarIconInNewRank } from '../utils/ranks.js';

export default {
    data: new SlashCommandBuilder()
        .setName('add-streak')
        .setDescription('إضافة ستريك لمستخدم')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم المراد إضافة الستريك له')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('عدد الستريكات المراد إضافتها')
                .setRequired(true)
                .setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const guildId = interaction.guild.id;

        if (dataStore.isBlocked(guildId, user.id)) {
            return interaction.reply({
                content: '❌ لا يمكن إضافة ستريك للمستخدمين المحظورين',
                ephemeral: true
            });
        }

        try {
            const userData = dataStore.getUserData(guildId, user.id);
            const oldStreak = userData.streak;
            const oldRank = getRankWithSelectedIcon(userData.streak, userData.selectedIcon);

            userData.streak += amount;
            const newRank = getRankWithSelectedIcon(userData.streak, userData.selectedIcon);

            // Update icon if rank changed
            if (oldRank.name !== newRank.name && userData.selectedIcon) {
                const similarIcon = findSimilarIconInNewRank(userData.selectedIcon, newRank.name);
                if (similarIcon) {
                    userData.selectedIcon = similarIcon;
                }
            }

            dataStore.updateUserData(guildId, user.id, userData);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setDescription(`> تم إضافة **${amount}** ستريك لـ **<@${user.id}>** بنجاح`)
                .addFields(
                    { name: 'الستريك السابق', value: `${oldStreak}`, inline: true },
                    { name: 'الستريك الحالي', value: `${userData.streak}`, inline: true },
                    { name: 'بواسطة', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Log manual addition
            await logStore.logStreakManualAdd(interaction.client, interaction.guild, interaction.user, user, amount);
        } catch (error) {
            console.error('Error adding strike:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء إضافة الستريك',
                ephemeral: true
            });
        }
    }
};
