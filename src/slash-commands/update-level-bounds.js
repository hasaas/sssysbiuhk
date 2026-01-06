import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import configStore from '../services/ConfigStore.js';

export default {
    data: new SlashCommandBuilder()
        .setName('update-level-bounds')
        .setDescription('تعديل حدود المستويات الأساسية (Bronze, Silver, Gold, Diamond)')
        .addStringOption(option =>
            option
                .setName('level_name')
                .setDescription('اسم المستوى')
                .setRequired(true)
                .addChoices(
                    { name: 'برونز (Bronze)', value: 'برونز' },
                    { name: 'سلفر (Silver)', value: 'سلفر' },
                    { name: 'قولد (Gold)', value: 'قولد' },
                    { name: 'دايموند (Diamond)', value: 'دايموند' }
                )
        )
        .addIntegerOption(option =>
            option
                .setName('min_streak')
                .setDescription('الحد الأدنى للستريك')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(option =>
            option
                .setName('max_streak')
                .setDescription('الحد الأقصى للستريك (اختياري - للمستوى الأخير اتركه فارغاً)')
                .setRequired(false)
                .setMinValue(1)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const config = configStore.getGuildConfig(guildId);

        // Check premium
        if (!config.premium?.enabled) {
            return interaction.reply({
                content: '❌ هذه الميزة متاحة للسيرفرات البريميم فقط.\n\nتواصل مع مالك البوت لتفعيل البريميم.',
                ephemeral: true
            });
        }

        // Check premium expiration
        if (config.premium.expiresAt) {
            const expirationDate = new Date(config.premium.expiresAt);
            if (expirationDate < new Date()) {
                return interaction.reply({
                    content: '⚠️ انتهت صلاحية البريميم للسيرفر.\n\nتواصل مع مالك البوت لتجديد الاشتراك.',
                    ephemeral: true
                });
            }
        }

        const levelName = interaction.options.getString('level_name');
        const minStreak = interaction.options.getInteger('min_streak');
        const maxStreak = interaction.options.getInteger('max_streak');

        // Validate min/max
        if (maxStreak && maxStreak < minStreak) {
            return interaction.reply({
                content: '❌ الحد الأقصى يجب أن يكون أكبر من أو يساوي الحد الأدنى',
                ephemeral: true
            });
        }

        try {
            if (!config.premium.levelBounds) {
                config.premium.levelBounds = {};
            }

            // Update level bounds
            config.premium.levelBounds[levelName] = {
                minStreak,
                maxStreak: maxStreak || null
            };

            configStore.updateGuildConfig(guildId, { premium: config.premium });

            const rangeText = maxStreak 
                ? `${minStreak}-${maxStreak}` 
                : `${minStreak}+`;

            // Get level color based on name
            const levelColors = {
                'برونز': '#CD7F32',
                'سلفر': '#C0C0C0',
                'قولد': '#FFD700',
                'دايموند': '#B9F2FF'
            };

            const embed = new EmbedBuilder()
                .setColor(levelColors[levelName] || '#5865F2')
                .setTitle('✅ تم تعديل حدود المستوى')
                .addFields(
                    { name: 'المستوى', value: levelName, inline: true },
                    { name: 'النطاق الجديد', value: rangeText, inline: true },
                    { name: 'الحد الأدنى', value: `${minStreak}`, inline: true },
                    { name: 'الحد الأقصى', value: maxStreak ? `${maxStreak}` : 'غير محدود', inline: true }
                )
                .setFooter({ text: 'سيتم تطبيق الحدود الجديدة على جميع المستخدمين فوراً' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error updating level bounds:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء تعديل حدود المستوى',
                ephemeral: true
            });
        }
    }
};
