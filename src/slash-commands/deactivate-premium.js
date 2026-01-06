import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('deactivate-premium')
        .setDescription('إلغاء تفعيل البريميم لسيرفر (مالك البوت فقط)')
        .addStringOption(option =>
            option
                .setName('server_id')
                .setDescription('معرف السيرفر (Server ID)')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check if user is bot owner
        const BOT_OWNER_ID = process.env.BOT_OWNER_ID;
        if (interaction.user.id !== BOT_OWNER_ID) {
            return interaction.reply({
                content: '❌ هذا الأمر متاح لمالك البوت فقط',
                ephemeral: true
            });
        }

        const serverId = interaction.options.getString('server_id');

        try {
            // Verify guild exists
            const guild = await interaction.client.guilds.fetch(serverId).catch(() => null);
            
            if (!guild) {
                return interaction.reply({
                    content: `❌ لم يتم العثور على سيرفر بالمعرف: \`${serverId}\``,
                    ephemeral: true
                });
            }

            const config = configStore.getGuildConfig(serverId);

            config.premium = {
                enabled: false,
                expiresAt: null,
                customIcons: {},
                levelBounds: {}
            };

            configStore.updateGuildConfig(serverId, { premium: config.premium });

            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ تم إلغاء تفعيل البريميم')
                .addFields(
                    { name: 'السيرفر', value: guild.name, inline: true },
                    { name: 'معرف السيرفر', value: serverId, inline: true }
                )
                .setDescription('تم إلغاء تفعيل البريميم وإزالة جميع المميزات المخصصة')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error deactivating premium:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء إلغاء تفعيل البريميم',
                ephemeral: true
            });
        }
    }
};
