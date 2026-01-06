import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import configStore from '../services/ConfigStore.js';
import { RANKS } from '../utils/ranks.js';

export default {
    data: new SlashCommandBuilder()
        .setName('add-custom-icon')
        .setDescription('إضافة أيقونة مخصصة لمستوى معين (بريميم فقط)')
        .addStringOption(option =>
            option
                .setName('level_name')
                .setDescription('اسم المستوى (bronze, silver, gold, diamond أو اسم مخصص)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('icon')
                .setDescription('الأيقونة (emoji أو text)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('اسم الأيقونة (اختياري)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const config = configStore.getGuildConfig(guildId);

        // Check premium
        if (!config.premium?.enabled) {
            return interaction.reply({
                content: '> هذه الميزة متاحة للسيرفرات البريميم فقط',
                ephemeral: true
            });
        }

        // Check premium expiration
        if (config.premium.expiresAt) {
            const expirationDate = new Date(config.premium.expiresAt);
            if (expirationDate < new Date()) {
                return interaction.reply({
                    content: '> لقد انتهت صلاحية البرميم لسيرفرك.',
                    ephemeral: true
                });
            }
        }

        const levelName = interaction.options.getString('level_name');
        const icon = interaction.options.getString('icon');
        const name = interaction.options.getString('name') || `custom_${Date.now()}`;

        try {
            // Check if level exists (default or custom)
            const defaultLevelNames = ['مبتدئ', 'برونز', 'سلفر', 'قولد', 'دايموند'];
            const customLevelNames = config.premium.customLevels?.map(l => l.name) || [];
            const allLevelNames = [...defaultLevelNames, ...customLevelNames];

            if (!allLevelNames.includes(levelName)) {
                return interaction.reply({
                    content: `❌ المستوى "${levelName}" غير موجود.\n\n**المستويات المتاحة:**\n${allLevelNames.join(', ')}\n\nيمكنك إضافة مستوى جديد باستخدام \`/add-custom-level\``,
                    ephemeral: true
                });
            }

            if (!config.premium.customIcons) {
                config.premium.customIcons = {};
            }

            if (!config.premium.customIcons[levelName]) {
                config.premium.customIcons[levelName] = [];
            }

            // Add custom icon
            config.premium.customIcons[levelName].push({
                name: name,
                icon: icon
            });

            configStore.updateGuildConfig(guildId, { premium: config.premium });

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ تمت إضافة الأيقونة المخصصة')
                .addFields(
                    { name: 'المستوى', value: levelName, inline: true },
                    { name: 'الأيقونة', value: icon, inline: true },
                    { name: 'الاسم', value: name, inline: true },
                    { name: 'إجمالي الأيقونات المخصصة', value: `${config.premium.customIcons[levelName].length}`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error adding custom icon:', error);
            await interaction.reply({
                content: '❌ حدث خطأ أثناء إضافة الأيقونة',
                ephemeral: true
            });
        }
    }
};
