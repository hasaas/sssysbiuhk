import { WebhookClient } from 'discord.js';

/**
 * Send message via webhook with guild identity
 * Creates a temporary webhook to send messages as the guild
 */
export async function sendAsGuildWebhook(channel, embed, guild, components = []) {
    try {
        const webhook = await channel.createWebhook({
            name: guild.name,
            avatar: guild.iconURL({ dynamic: true }) || undefined,
            reason: 'Streak system display'
        });

        const sentMessage = await webhook.send({
            embeds: [embed],
            components: components.length ? components : undefined
        });

        await webhook.delete('Temporary webhook cleanup');
        return sentMessage;
    } catch (error) {
        console.error('Error sending webhook message:', error);
        try {
            return await channel.send({ embeds: [embed], components });
        } catch (fallbackError) {
            console.error('Fallback send also failed:', fallbackError);
            return null;
        }
    }
}


/**
 * Send DM with guild webhook style (simulated)
 * Since DMs don't support webhooks, we simulate the style in embed
 */
export function createGuildStyledEmbed(embed, guild) {
    return embed
        .setAuthor({
            name: guild.name,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setFooter({
            text: guild.name,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
        });
}
