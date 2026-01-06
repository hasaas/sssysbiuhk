import { getRankWithSelectedIcon, RANK_ICONS } from '../utils/ranks.js';
import dataStore from '../services/DataStore.js';
import configStore from '../services/ConfigStore.js';
import { handleTopStreakPage } from '../commands/top.js';
import { handleBlockListPage } from '../commands/blocklist.js';
import { EmbedBuilder } from 'discord.js';

export default {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);
                
                const errorMessage = {
                    content: 'حدث خطأ أثناء تنفيذ هذا الأمر!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }
        
        // Handle button interactions
        else if (interaction.isButton()) {
            try {
                const customId = interaction.customId;

                // Top streak pagination
                if (customId.startsWith('topstreak_')) {
                    const [, page, originalUserId] = customId.split('_');

                    if (interaction.user.id !== originalUserId) {
                        await interaction.reply({
                            content: 'لا يمكنك استعمال هذا الزر',
                            ephemeral: true
                        });
                        return;
                    }

                    await handleTopStreakPage(interaction, parseInt(page), originalUserId, interaction.guild.id, client);
                }

                // Blocklist pagination
                else if (customId.startsWith('blocklist_')) {
                    const [, page, originalUserId] = customId.split('_');

                    if (interaction.user.id !== originalUserId) {
                        await interaction.reply({
                            content: 'لا يمكنك استعمال هذا الزر',
                            ephemeral: true
                        });
                        return;
                    }

                    await handleBlockListPage(interaction, parseInt(page), originalUserId, interaction.guild.id, client);
                }

                // Icon selection
                else if (customId.startsWith('select_icon_')) {
                    const [iconPart, userId] = customId.split(':');
                    const iconIndex = parseInt(iconPart.split('_')[2]);

                    if (interaction.user.id !== userId) {
                        await interaction.reply({
                            content: 'لا يمكنك استعمال هذا الزر',
                            ephemeral: true
                        });
                        return;
                    }

                    await handleIconChoice(interaction, userId, iconIndex, interaction.guild.id);
                }
            } catch (error) {
                console.error('Error handling button interaction:', error);
                
                try {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'حدث خطأ أثناء معالجة الأمر. يرجى المحاولة مرة أخرى.',
                            ephemeral: true
                        });
                    }
                } catch (replyError) {
                    console.error('Cannot reply to interaction:', replyError);
                }
            }
        }
    }
};

async function handleIconChoice(interaction, userId, iconIndex, guildId) {
    const userData = dataStore.getUserData(guildId, userId);
    const config = configStore.getGuildConfig(guildId);

    if (!userData || userData.streak < 10) {
        await interaction.reply({
            content: 'خطأ في البيانات!',
            ephemeral: true
        });
        return;
    }

    // Check premium status
    if (!config.premium?.enabled) {
        await interaction.reply({
            content: '❌ نظام الشعارات المخصصة متاح للسيرفرات البريميم فقط.\n\nتواصل مع إدارة السيرفر.',
            ephemeral: true
        });
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

    if (!availableIcons || !availableIcons[iconIndex]) {
        await interaction.reply({
            content: 'أيقونة غير صالحة!',
            ephemeral: true
        });
        return;
    }

    const selectedIconData = availableIcons[iconIndex];
    userData.selectedIcon = selectedIconData.icon;
    dataStore.updateUserData(guildId, userId, userData);

    const embed = new EmbedBuilder()
        .setColor(currentRank.color)
        .setTitle('تم تغيير الشعار <a:__:1412470891765305415>')
        .setDescription(`تم تغيير شعارك إلى: ${selectedIconData.icon} **${selectedIconData.name}**`)
        .setThumbnail(interaction.user.displayAvatarURL());

    await interaction.update({ embeds: [embed], components: [] });
}
