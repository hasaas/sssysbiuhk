import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import dataStore from '../services/DataStore.js';
import configStore from '../services/ConfigStore.js';
import { getRankWithSelectedIcon, getAnimatedRank, RANK_ICONS } from '../utils/ranks.js';
import { getTodayDate } from '../utils/helpers.js';
import { sendAsGuildWebhook } from '../utils/webhookHelper.js';

export default {
    name: 'streak',
    aliases: ['s', 'ستريك', 'س'],
    description: 'عرض ستريك المستخدم',
    
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const userId = message.author.id;
        const config = configStore.getGuildConfig(guildId);

        // Check if user is blocked
        if (dataStore.isBlocked(guildId, userId)) {
            const embedBlocked = new EmbedBuilder()
                .setDescription('> **انت محظور من نظام الستريك**')
                .setColor('Red');
            return message.reply({ embeds: [embedBlocked] });
        }

        // Check if user has required roles
        if (config.streakRoleIds.length > 0) {
            const hasRole = message.member.roles.cache.some(role => 
                config.streakRoleIds.includes(role.id)
            );
            if (!hasRole) {
                const embed = new EmbedBuilder()
                    .setDescription('> ** يجب أن تملك الرتبة المطلوبة للمشاركة في نظام الستريك**')
                    .setColor('Red');
                return message.reply({ embeds: [embed] });
            }
        }

        const userData = dataStore.getUserData(guildId, userId);
        const rank = getRankWithSelectedIcon(userData.streak, userData.selectedIcon, config);
        const rank2 = getAnimatedRank(userData.streak);

        const todayDate = getTodayDate();
        const isToday = userData.lastActiveDate === todayDate;
        const todayProgress = isToday ? userData.dailyMessages : 0;

        const embed = new EmbedBuilder()
            .setColor(rank.color)
            .setDescription(`- <@${message.author.id}>\n- ${userData.streak} • ${rank.icon}`)
            .addFields(
                { name: 'التصنيف الحالي', value: `${rank2.icon} ${rank.name}`, inline: true },
                { name: '📊 رسائل اليوم', value: `${Math.min(todayProgress, config.messageCountRequired)}/${config.messageCountRequired} رسائل`, inline: true },
            )
            .setFooter({ 
            text: message.guild?.name, 
            iconURL: message.guild?.iconURL({ dynamic: true }) 
        })
            .setThumbnail(message.author.displayAvatarURL())
            .setTimestamp();

        // FIXED: Always prepare the button row if streak >= 10
        let row = null;
        let buttonCustomId = null;
        if (userData.streak >= 10) {
            const ownerId = message.author.id;
            buttonCustomId = `change_icon:${ownerId}:${Date.now()}`;
            row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(buttonCustomId)
                    .setLabel('تغيير الشعار')
                    .setEmoji('🖼️')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        // FIXED: In premium, ALWAYS send via webhook (with components if row exists)
        // Non-premium: Use bot reply (with components if row exists)
        let sent;
        if (config.premium?.enabled) {
            // Pass row as components to webhook
            sent = await sendAsGuildWebhook(message.channel, embed, message.guild, row ? [row] : []);
            if (!sent) {
                // Fallback to bot reply if webhook fails
                sent = await message.reply({ embeds: [embed], components: row ? [row] : [] });
            }
        } else {
            // Non-premium: Bot reply
            sent = await message.reply({ embeds: [embed], components: row ? [row] : [] });
        }

        // FIXED: No early return for <10; handle collector only if row exists
        if (!row || userData.streak < 10) {
            return; // No button, done
        }

        // FIXED: Save channel and message ID for editing outside collector
        const channel = sent.channel;
        const messageId = sent.id;

        // Handle collector on the sent message (works for both webhook and bot messages)
        const collector = sent.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
            filter: (i) => i.customId === buttonCustomId && i.user.id === userId
        });

        // FIXED: Check premium for icon selection
        if (!config.premium?.enabled) {
            collector.on('collect', async (i) => {
                await i.reply({
                    content: 'نظام الشعارات ليس متاح لهذا السيرفر.',
                    ephemeral: true
                });
            });
            return;
        }

        collector.on('collect', async (interaction) => {
            try {
                const [, ownerId] = buttonCustomId.split(':');
                if (interaction.user.id !== ownerId) {
                    await interaction.reply({
                        content: 'لا يمكنك استعمال هذا الزر',
                        ephemeral: true
                    }).catch(() => {});
                    return;
                }

                await interaction.reply({
                    content: 'جارٍ تجهيز الشعار...',
                    ephemeral: true
                }).catch(() => {});

                collector.stop('used');

                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('change_icon_disabled')
                        .setLabel('تغيير الشعار')
                        .setEmoji('🖼️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );

                // FIXED: Edit the original message using channel and messageId (not interaction.editReply)
                await channel.messages.edit(messageId, { components: [disabledRow] }).catch(() => {});

                await handleIconSelection(interaction, userId, guildId);
            } catch (err) {
                console.error('Error in collector:', err);
            }
        });

        // FIXED: In 'end', use saved channel and messageId (no interaction needed)
        collector.on('end', async (collected, reason) => {
            try {
                if (reason !== 'used') { // Only disable if not already used
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('change_icon_disabled')
                            .setLabel('تغيير الشعار')
                            .setEmoji('🖼️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );
                    await channel.messages.edit(messageId, { components: [disabledRow] }).catch(() => {});
                }
            } catch (err) {
                console.error('Error disabling button:', err);
            }
        });
    }
};

const cooldowns = new Map();

// FIXED: Corrected regex for parseEmoji (optional 'a' only, then always :, name, :, id)
function parseEmoji(emojiString) {
    if (!emojiString || emojiString.trim() === '') return null;

    // If it's a unicode emoji (no < >), return as string
    if (!emojiString.startsWith('<')) {
        return emojiString;
    }

    // FIXED: Correct regex: <(a)?:name:id>  (optional 'a', then :, name, :, id, >)
    const match = emojiString.match(/<(a)?:([^:]+):(\d+)>/);
    if (match) {
        const animated = match[1] === 'a';
        const name = match[2];
        const id = match[3];
        return { name, id, animated };
    }

    return null; // Invalid format
}

async function handleIconSelection(interaction, userId, guildId) {
    const userData = dataStore.getUserData(guildId, userId);
    const config = configStore.getGuildConfig(guildId);

    if (!userData || userData.streak < 10) {
        await interaction.editReply({
            content: 'يجب أن يكون لديك ستريك 10+ لتغيير الشعار!'
        }).catch(() => {});
        return;
    }

    const lastUsed = cooldowns.get(userId) || 0;
    const now = Date.now();
    const cooldown = 5 * 60 * 1000;

    if (now - lastUsed < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastUsed)) / 1000);
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;

        await interaction.editReply({
            content: `يمكنك تغيير الشعار مرة أخرى بعد ${minutes > 0 ? `${minutes} دقيقة و ` : ''}${seconds} ثانية.`
        }).catch(() => {});
        return;
    }

    const currentRank = getRankWithSelectedIcon(userData.streak, userData.selectedIcon, config);
    
    // Merge default icons with custom icons (premium)
    let availableIcons = [];
    
    // Always include default icons first
    if (RANK_ICONS[currentRank.name]) {
        availableIcons = [...RANK_ICONS[currentRank.name]];
    }
    
    // Add custom icons if premium enabled
    if (config.premium?.enabled && config.premium?.customIcons?.[currentRank.name]) {
        availableIcons = [...availableIcons, ...config.premium.customIcons[currentRank.name]];
    }

    if (!availableIcons || availableIcons.length === 0) {
        await interaction.editReply({
            content: 'لا توجد أيقونات متاحة لرانكك الحالي!'
        }).catch(() => {});
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(currentRank.color)
        .setTitle(`🎨 اختر شعارك - ${currentRank.name}`)
        .setDescription('اختر الأيقونة التي تريدها لرانكك:')
        .setThumbnail(interaction.user.displayAvatarURL())
        .setImage('https://i.postimg.cc/8k6r3t5S/streakimg.png');

    const components = [];
    const iconsPerRow = 5;

    for (let i = 0; i < availableIcons.length; i += iconsPerRow) {
        const row = new ActionRowBuilder();
        const rowIcons = availableIcons.slice(i, i + iconsPerRow);

        rowIcons.forEach((iconData, index) => {
            const isSelected = userData.selectedIcon === iconData.icon;
            const button = new ButtonBuilder()
                .setCustomId(`select_icon_${i + index}:${userId}`)
                .setLabel(iconData.name)
                .setStyle(isSelected ? ButtonStyle.Success : ButtonStyle.Secondary);

            // FIXED: Parse and set emoji safely (unicode or custom object)
            const parsedEmoji = parseEmoji(iconData.icon);
            if (parsedEmoji) {
                try {
                    if (typeof parsedEmoji === 'string') {
                        button.setEmoji(parsedEmoji);
                    } else {
                        // For custom: { name, id, animated }
                        button.setEmoji({
                            name: parsedEmoji.name,
                            id: parsedEmoji.id,
                            animated: parsedEmoji.animated || false
                        });
                    }
                } catch (err) {
                    console.warn(`Failed to set emoji for ${iconData.name}:`, iconData.icon, err);
                    // Fallback: Set a default emoji
                    button.setEmoji('🎨');
                }
            } else {
                console.warn('Invalid emoji format:', iconData.icon);
                button.setEmoji('🎨'); // Fallback
            }

            row.addComponents(button);
        });

        components.push(row);
    }

    try {
        await interaction.editReply({ embeds: [embed], components });
        
        // Store cooldown
        cooldowns.set(userId, Date.now());
    } catch (error) {
        console.error('Error editing icon selection:', error);
    }
}