import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import dataStore from '../services/DataStore.js';
import logStore from '../services/LogStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('block-user')
        .setDescription('حظر مستخدم من نظام الستريك')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('المستخدم المراد حظره')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const user = interaction.options.getUser('user');
        const guildId = interaction.guild.id;

        if (dataStore.isBlocked(guildId, user.id)) {
            return interaction.reply({
                content: '❌ هذا المستخدم محظور بالفعل',
                ephemeral: true
            });
        }

        try {
            const userData = dataStore.getUserData(guildId, user.id);
            const oldStreak = userData.streak || 0;

            dataStore.blockUser(guildId, user.id);

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setDescription(`> تم حظر **<@${user.id}>** من نظام الستريك بنجاح`)
                .addFields(
                    { name: 'الستريك السابق', value: `${oldStreak}`, inline: true },
                    { name: 'بواسطة', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Log block action
            await logStore.logUserBlock(interaction.client, interaction.guild, interaction.user, user);

            // Try to DM user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription('**تم حظرك من نظام الستريك**\n> لقد تم حظرك من نظام الستريك من قبل المسؤولين')
                    .setTimestamp();

                await user.send({ embeds: [dmEmbed] });
            } catch (dmError) {
                console.log('Cannot DM user:', user.username);
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء حظر المستخدم',
                ephemeral: true
            });
        }
    }
};
