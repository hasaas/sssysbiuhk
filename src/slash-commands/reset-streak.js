import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import dataStore from '../services/DataStore.js';
import configStore from '../services/ConfigStore.js';
import logStore from '../services/LogStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('reset-streak')
        .setDescription('إعادة تعيين الستريك (للمشرفين فقط)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('إعادة تعيين ستريك مستخدم واحد')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('المستخدم المراد إعادة تعيين ستريكه')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('all')
                .setDescription('إعادة تعيين جميع بيانات الستريك في السيرفر (خطير!)')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // FIXED: Defer reply immediately to avoid 3s timeout
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild.id;
        const config = configStore.getGuildConfig(guildId);

        // FIXED: Check permissions after defer
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({
                content: '❌ هذا الأمر متاح للمسؤولين فقط',
                // FIXED: Use flags instead of ephemeral (deprecated warning fix)
                flags: [MessageFlags.Ephemeral]
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'user') {
            await handleResetUser(interaction, guildId);
        } else if (subcommand === 'all') {
            await handleResetAll(interaction, guildId);
        }
    }
};

async function handleResetUser(interaction, guildId) {
    const user = interaction.options.getUser('user');
    
    try {
        const userData = dataStore.getUserData(guildId, user.id);
        const oldStreak = userData.streak;

        if (oldStreak === 0) {
            return interaction.editReply({
                content: `⚠️ المستخدم <@${user.id}> لا يملك ستريك`,
                flags: [MessageFlags.Ephemeral]
            });
        }

        // Reset user streak
        dataStore.updateUserData(guildId, user.id, {
            streak: 0,
            dailyMessages: 0,
            lastActiveDate: null,
            streakEarned: false,
            streakEarnedAt: null,
            selectedIcon: null
        });

        const embed = new EmbedBuilder()
            .setColor('#FF6600')
            .setDescription(`> تم إعادة تعيين ستريك **<@${user.id}>** بنجاح`)
            .addFields(
                { name: 'الستريك السابق', value: `${oldStreak}`, inline: true },
                { name: 'بواسطة', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();

        // FIXED: Use editReply (since deferred)
        await interaction.editReply({ embeds: [embed] });

        // Log reset
        await logStore.logStreakReset(interaction.client, interaction.guild, interaction.user, user, oldStreak);

        // Try to DM user
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#FF6600')
                .setTitle('تم إعادة تعيين الستريك')
                .setDescription(`تم إعادة تعيين ستريكك في **${interaction.guild.name}** من قبل المشرفين\n\nالستريك السابق: **${oldStreak}**`)
                .setTimestamp();

            await user.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log('Cannot DM user:', user.username);
        }
    } catch (error) {
        console.error('Error resetting user streak:', error);
        await interaction.editReply({
            content: '❌ حدث خطأ أثناء إعادة تعيين الستريك',
            flags: [MessageFlags.Ephemeral]
        });
    }
}

async function handleResetAll(interaction, guildId) {
    const confirmEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚠️ تحذير')
        .setDescription('> هل أنت متأكد أنك تريد إعادة تعيين **جميع** بيانات الستريك في هذا السيرفر؟\n\n**هذا الإجراء لا يمكن التراجع عنه!**');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_reset_all')
                .setLabel('نعم، إعادة تعيين الكل')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_reset_all')
                .setLabel('إلغاء')
                .setStyle(ButtonStyle.Secondary)
        );

    // FIXED: Use editReply after defer (instead of reply)
    await interaction.editReply({ embeds: [confirmEmbed], components: [row] });

    const filter = i => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ 
        filter, 
        time: 15000 
    });

    collector.on('collect', async i => {
        if (i.customId === 'confirm_reset_all') {
            try {
                const guildData = dataStore.getGuildData(guildId);
                const userCount = Object.keys(guildData.users).length;

                // Reset all data
                guildData.users = {};
                guildData.blocked = new Set();
                dataStore.data[guildId] = guildData;
                dataStore.saveData();

                const successEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`✅ تم إعادة تعيين جميع بيانات الستريك بنجاح\n\n**عدد المستخدمين المحذوفين:** ${userCount}`)
                    .setTimestamp();

                await i.update({ embeds: [successEmbed], components: [] });
            } catch (error) {
                console.error('Error resetting all streaks:', error);
                await i.update({ 
                    content: '❌ حدث خطأ أثناء إعادة التعيين',
                    embeds: [],
                    components: [] 
                });
            }
        } else if (i.customId === 'cancel_reset_all') {
            await i.update({ 
                content: '✅ تم إلغاء عملية إعادة التعيين',
                embeds: [],
                components: [] 
            });
        }
    });

    // FIXED: Remove interaction.editReply in 'end' - use a flag or let collector handle; since deferred, no need for edit here
    // If timeout, the message stays as confirmation (safe)
    collector.on('end', collected => {
        if (collected.size === 0) {
            // FIXED: Use i from collected or just log; no edit needed as it's already replied
            console.log('Reset all timeout - operation cancelled');
        }
    });
}