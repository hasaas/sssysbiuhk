import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('activate-premium')
        .setDescription('تفعيل البريميم لسيرفر باستخدام معرف السيرفر (مالك البوت فقط)')
        .addStringOption(option =>
            option
                .setName('server_id')
                .setDescription('معرف السيرفر (Server ID)')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('days')
                .setDescription('عدد الأيام')
                .setRequired(true)
                .setMinValue(1)
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
        const days = interaction.options.getInteger('days');

        try {
            // Verify guild exists
            const guild = await interaction.client.guilds.fetch(serverId).catch(() => null);
            
            if (!guild) {
                return interaction.reply({
                    content: `❌ لم يتم العثور على سيرفر بالمعرف: \`${serverId}\`\n\nتأكد من أن البوت موجود في السيرفر وأن المعرف صحيح`,
                    ephemeral: true
                });
            }

            const config = configStore.getGuildConfig(serverId);

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);

            config.premium = {
                ...config.premium,
                enabled: true,
                expiresAt: expiresAt.toISOString(),
                customIcons: config.premium?.customIcons || {},
                levelBounds: config.premium?.levelBounds || {}
            };

            configStore.updateGuildConfig(serverId, { premium: config.premium });

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('✨ تم تفعيل البريميم')
                .addFields(
                    { name: 'السيرفر', value: guild.name, inline: true },
                    { name: 'معرف السيرفر', value: serverId, inline: true },
                    { name: 'المدة', value: `${days} يوم`, inline: true },
                    { name: 'ينتهي في', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: false }
                )
                .setDescription('**المميزات المفعلة:**\n✅ نظام الشعارات المخصصة\n✅ إضافة شعارات لكل لفل\n✅ تعديل حدود المستويات الأساسية\n✅ ويب هوك باسم وأفاتار السيرفر')
                .setFooter({ text: 'سيتم إيقاف البريميم تلقائياً عند انتهاء المدة' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error activating premium:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تفعيل البريميم',
                ephemeral: true
            });
        }
    }
};
