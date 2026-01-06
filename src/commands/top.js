import { EmbedBuilder } from 'discord.js';
import dataStore from '../services/DataStore.js';
import configStore from '../services/ConfigStore.js';
import { getRankWithSelectedIcon, getAnimatedRank } from '../utils/ranks.js';
import { sendAsGuildWebhook } from '../utils/webhookHelper.js';

export default {
    name: 'top',
    aliases: ['توب'],
    description: 'عرض قائمة التوب ستريك - استخدام: !توب ستريك [رقم الصفحة]',
    
    async execute(message, args, client) {
        // Check if it's "top streak" or "top s" command
        if (args.length === 0) {
            return; // Just "top" without arguments
        }

        const subCommand = args[0].toLowerCase();
        if (!['س', 's', 'ستريك', 'streak'].includes(subCommand)) {
            return; // Not a streak top command
        }

        // Get page number from second argument (default to 1)
        const pageNum = args[1] ? parseInt(args[1]) : 1;
        if (isNaN(pageNum) || pageNum < 1) {
            return message.reply('❌ رقم الصفحة غير صحيح. استخدم: `!توب ستريك [رقم الصفحة]`');
        }

        const guildId = message.guild.id;
        await displayTopStreak(message, pageNum, guildId, client);
    }
};

async function displayTopStreak(message, page, guildId, client) {
    const sortedUsers = dataStore.getAllUsers(guildId);

    if (sortedUsers.length === 0) {
        const embed = new EmbedBuilder()
            .setDescription('> **لا يوجد مستخدمين في نظام الستريك حالياً**')
            .setColor('Red');
        
        return message.reply({ embeds: [embed] });
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    // If requested page is out of range, notify user
    if (page > totalPages) {
        return message.reply(`❌ الصفحة ${page} غير موجودة. آخر صفحة متاحة: ${totalPages}\n\nاستخدم: \`!توب ستريك ${totalPages}\``);
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageUsers = sortedUsers.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('Top Streakers <a:top:1414250898837864540>')
        .setFooter({ 
            text: ` ${currentPage} of ${totalPages} | Total participants: ${sortedUsers.length}`, 
            iconURL: message.guild?.iconURL({ dynamic: true }) 
        })
        .setTimestamp();

    let description = '';
    const LTR = "\u200E"; // Left-To-Right Mark

    const config = configStore.getGuildConfig(guildId);

    for (let i = 0; i < pageUsers.length; i++) {
        const [userId, userData] = pageUsers[i];
        const user = await client.users.fetch(userId).catch(() => null);
        const rank = getRankWithSelectedIcon(userData.streak, userData.selectedIcon, config);
        const rank2 = getAnimatedRank(userData.streak);

        const globalPosition = startIndex + i + 1;
        const positionIcon = globalPosition === 1 ? '<:23:1414255059369332868>' : 
                            globalPosition === 2 ? '<:24:1414255075764867162>' : 
                            globalPosition === 3 ? '<:25:1414255087685079101>' : 
                            `${globalPosition}.`;
        
        const username = user ? (user.displayName || user.username) : 'مستخدم محذوف';

        description += `${LTR}${positionIcon} ${rank2.icon} **<@${user?.id || userId}>** - ${userData.streak} • ${rank.icon}\n`;
    }

    embed.setDescription(description || '> لا توجد بيانات');

    // Add navigation hint
    let navigationHint = '\nللمزيد: `توب س (رقم الصفحة)`\n';
    if (currentPage > 1) {
        navigationHint += `⬅️ الصفحة السابقة: \`!توب ستريك ${currentPage - 1}\`\n`;
    }
    if (currentPage < totalPages) {
        navigationHint += `➡️ الصفحة التالية: \`!توب ستريك ${currentPage + 1}\`\n`;
    }

    embed.addFields({
        name: '\u200b',
        value: navigationHint
    });

    // Check premium and send via webhook if enabled
    if (config.premium?.enabled) {
        await sendAsGuildWebhook(message.channel, embed, message.guild);
    } else {
        await message.reply({ embeds: [embed] });
    }
}
 export  async function handleTopStreakPage(interaction, page, userId, guildId, client) {
    const message = interaction.message;
    const sortedUsers = dataStore.getAllUsers(guildId);

    if (sortedUsers.length === 0) {
        const embed = new EmbedBuilder()
            .setDescription('> **لا يوجد مستخدمين في نظام الستريك حالياً**')
            .setColor('Red');
        
        return interaction.update({ embeds: [embed], components: [] });
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageUsers = sortedUsers.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('Top Streakers <a:top:1414250898837864540>')
        .setFooter({
            text: `صفحة ${currentPage} من ${totalPages} | إجمالي المشاركين: ${sortedUsers.length}`,
            iconURL: interaction.guild?.iconURL({ dynamic: true })
        })
        .setTimestamp();

    const LTR = "\u200E";
    let description = '';

    for (let i = 0; i < pageUsers.length; i++) {
        const [userIdX, userData] = pageUsers[i];
        const user = await client.users.fetch(userIdX).catch(() => null);
        const rank = getRankWithSelectedIcon(userData.streak, userData.selectedIcon);
        const rank2 = getAnimatedRank(userData.streak);

        const globalPosition = startIndex + i + 1;
        const positionIcon =
            globalPosition === 1 ? '<:23:1414255059369332868>' :
            globalPosition === 2 ? '<:24:1414255075764867162>' :
            globalPosition === 3 ? '<:25:1414255087685079101>' :
            `${globalPosition}.`;

        const username = user ? (user.displayName || user.username) : 'مستخدم محذوف';

        description += `${LTR}${positionIcon} ${rank2.icon} **<@${user?.id || userIdX}>** - ${userData.streak} • ${rank.icon}\n`;
    }

    embed.setDescription(description || '> لا توجد بيانات');

    const navigationHint = [];
    if (currentPage > 1) navigationHint.push({ label: '⬅️ السابق', id: `topstreak_${currentPage - 1}_${userId}` });
    if (currentPage < totalPages) navigationHint.push({ label: 'التالي ➡️', id: `topstreak_${currentPage + 1}_${userId}` });

    const row = {
        type: 1,
        components: navigationHint.map(btn => ({
            type: 2,
            style: 1,
            label: btn.label,
            custom_id: btn.id
        }))
    };

    await interaction.update({ embeds: [embed], components: navigationHint.length ? [row] : [] });
}
