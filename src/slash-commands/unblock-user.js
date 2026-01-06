import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import dataStore from '../services/DataStore.js';
import logStore from '../services/LogStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unblock-user')
        .setDescription('إلغاء حظر مستخدم من نظام الستريك')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم المراد إلغاء حظره')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const guildId = interaction.guild.id;

        if (!dataStore.isBlocked(guildId, user.id)) {
            return interaction.reply({
                content: '❌ هذا المستخدم غير محظور',
                ephemeral: true
            });
        }

        try {
            dataStore.unblockUser(guildId, user.id);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setDescription(`> تم إلغاء حظر **<@${user.id}>** من نظام الستريك بنجاح`)
                .addFields(
                    { name: 'بواسطة', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Log unblock action
            await logStore.logUserUnblock(interaction.client, interaction.guild, interaction.user, user);

            // Try to DM user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription('**تم الغاء حظرك من نظام الستريك**\n> يمكنك الآن الانضمام مرة أخرى لنظام الستريك')
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log('Cannot DM user:', user.username);
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء إلغاء حظر المستخدم',
                ephemeral: true
            });
        }
    }
};
