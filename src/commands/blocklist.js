import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import dataStore from '../services/DataStore.js';
import configStore from '../services/ConfigStore.js';

export default {
    name: 'blocklist',
    description: 'عرض قائمة المحظورين (للمشرفين فقط)',
    
    async execute(message, args, client) {
        const guildId = message.guild.id;
        const config = configStore.getGuildConfig(guildId);

        // Check if user is admin
        if (config.adminRoleId && !message.member.roles.cache.has(config.adminRoleId)) {
            const embed = new EmbedBuilder()
                .setDescription('> **هذا الأمر متاح للمسؤولين فقط**')
                .setColor('Red');
            return message.reply({ embeds: [embed] });
        }

        await handleBlockListPage(message, 1, message.author.id, guildId, client);
    }
};

async function handleBlockListPage(messageOrInteraction, page, userId, guildId, client) {
    const isMessage = !messageOrInteraction.isButton;
    const message = isMessage ? messageOrInteraction : messageOrInteraction.message;

    const blockedUserIds = dataStore.getBlockedUsers(guildId);

    if (blockedUserIds.length === 0) {
        const embed = new EmbedBuilder()
            .setDescription('> **لا يوجد مستخدمين محظورين حالياً**')
            .setColor('Red');
        
        if (isMessage) {
            return message.reply({ embeds: [embed] });
        } else {
            await messageOrInteraction.update({ embeds: [embed], components: [] });
        }
        return;
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(blockedUserIds.length / itemsPerPage);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageUsers = blockedUserIds.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('قائمة المحظورين <a:Khnfosh100:1412821083178139751>')
        .setFooter({ 
            text: `${currentPage} of ${totalPages} | Total blocked: ${blockedUserIds.length}`, 
            iconURL: message.guild?.iconURL({ dynamic: true }) 
        })
        .setTimestamp();

    let description = '';
    for (let i = 0; i < pageUsers.length; i++) {
        const blockedUserId = pageUsers[i];
        const user = await client.users.fetch(blockedUserId).catch(() => null);
        const globalPosition = startIndex + i + 1;
        
        const username = user ? (user.displayName || user.username) : 'مستخدم محذوف';
        description += `${globalPosition}. **<@${blockedUserId}>** (${user ? user.id : "Deleted"})\n`;
    }

    embed.setDescription(description || 'لا يوجد محظورين في هذه الصفحة');

    const components = [];
    if (totalPages > 1) {
        const row = new ActionRowBuilder();

        if (currentPage > 1) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`blocklist_${currentPage - 1}_${userId}`)
                    .setLabel('⬅️ السابق')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (currentPage > 2) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`blocklist_1_${userId}`)
                    .setLabel('1')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`blocklist_${currentPage}_${userId}`)
                .setLabel(`${currentPage}`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
        );

        if (currentPage < totalPages - 1) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`blocklist_${totalPages}_${userId}`)
                    .setLabel(`${totalPages}`)
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (currentPage < totalPages) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`blocklist_${currentPage + 1}_${userId}`)
                    .setLabel('التالي ➡️')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        components.push(row);
    }

    const replyOptions = { embeds: [embed], components };

    if (isMessage) {
        try {
            const reply = await message.reply(replyOptions);

            setTimeout(async () => {
                try {
                    const disabledComponents = components.map(row => {
                        const newRow = new ActionRowBuilder();
                        row.components.forEach(button => {
                            newRow.addComponents(
                                ButtonBuilder.from(button).setDisabled(true)
                            );
                        });
                        return newRow;
                    });

                    await reply.edit({ embeds: [embed], components: disabledComponents });
                } catch (error) {
                    console.log('Cannot disable buttons:', error.message);
                }
            }, 30000);
        } catch (error) {
            console.error('Error sending blocklist reply:', error);
        }
    } else {
        await messageOrInteraction.update(replyOptions);
    }
}

export { handleBlockListPage };
