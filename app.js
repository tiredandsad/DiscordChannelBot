import cron from 'node-cron';
import { DateTime } from 'luxon';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import 'dotenv/config';

import { 
    lizardUpdate,
    resetWeek,
    pullLizardWeekly,
    pullLizardAllTime,
    pullMergedWeekly,
    lizardData,
    updateNeonData
} from './crudUtil.js';

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

// Slash commands
const commands = [
    {
        name: 'lizardleaderboard',
        description: 'Pull the weekly lizard leaderboard',
    },
    {
        name: 'pushlizards',
        description: 'Force push lizard data to NeonDB',
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing app (/) commands.');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded app (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

// ----------------------------------
// Discord Client Setup
// ----------------------------------
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ],
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// ----------------------------------
// WEEKLY AUTO-POST (ONLY ON SUNDAY)
// ----------------------------------
cron.schedule('0 9 * * 0', async () => {
    const channelId = '1419462535278628914';
    const now = DateTime.now().setZone('America/Denver');

    if (now.weekday === 7 && now.hour === 9) {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        // Weekly leaderboard
        const weekly = await pullLizardWeekly();
        let msg = '🦎 **Weekly Lizard Leaderboard** 🦎\n';
        weekly.forEach((u, i) => msg += `${i + 1}. <@${u.userid}> - ${u.score}\n`);
        await channel.send(msg);

        // All time leaderboard
        const alltime = await pullLizardAllTime();
        let msg2 = '🌟 **All-Time Lizard Leaderboard** 🌟\n';
        alltime.forEach((u, i) => msg2 += `${i + 1}. <@${u.userid}> - ${u.score}\n`);
        await channel.send(msg2);
    }
});

// ----------------------------------
// Slash Commands
// ----------------------------------
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    // Manual push
    if (interaction.commandName === 'pushlizards') {
        await interaction.deferReply();
        try {
            await updateNeonData();
            await interaction.editReply('✅ Pushed local lizard data to NeonDB.');
        } catch (err) {
            console.error(err);
            await interaction.editReply('❌ Failed to push data.');
        }
    }

    // Leaderboard
    if (interaction.commandName === 'lizardleaderboard') {
        await interaction.deferReply({ ephemeral: true });

        let leaderboard;

        try {
            leaderboard = await pullMergedWeekly(); // merged Neon + local
        } catch (err) {
            console.error(err);
            leaderboard = [...lizardData].sort((a, b) => b.score - a.score);
        }

        if (!leaderboard || leaderboard.length === 0)
            return interaction.editReply('No lizard data available.');

        let msg = '🦎 **Weekly Lizard Leaderboard** 🦎\n';
        leaderboard.forEach((u, i) => {
            msg += `${i + 1}. <@${u.userid ?? u.id}> - ${u.score}\n`;
        });

        try {
            const channel = await client.channels.fetch('1419462535278628914');
            await channel.send(msg);
            await interaction.editReply('Leaderboard posted!');
        } catch (err) {
            console.error(err);
            await interaction.editReply('Failed to post leaderboard.');
        }
    }
});

// ----------------------------------
// MESSAGE MONITORING FOR LIZARDS
// ----------------------------------
const lastUserMap = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.id === client.user.id) return;

    // Lizard channel
    if (message.channel.id === '1402327076182167642') {
        const lastUserID = lastUserMap.get(message.channel.id);

        if (message.content === '🦎' && message.author.id !== lastUserID) {
            lastUserMap.set(message.channel.id, message.author.id);
            lizardUpdate(message.author.id);
            return;
        } else {
            try {
                await message.delete();
            } catch (err) {
                console.error(err);
            }
        }
    }

    // Image-only channel behavior unchanged
    if (
        message.channel.id === '1232486619165233212' ||
        message.channel.id === '1232486691399536661'
    ) {
        if (message.attachments.size <= 0) {
            const botMessage = await message.channel.send({
                content: 'This channel only allows image posts.',
            });
            await message.delete();

            setTimeout(async () => {
                try {
                    await botMessage.delete();
                } catch {}
            }, 9000);
        }
    }
});

const roleMapping = {
    '💜': '1219762750180429914',
    '🩷': '1219762832942563401',
    'heart_sky': '1219762802416160949',
    '💚': '1290815519175344211',
    'heart_yellow': '1307470449457889342',
    'heart_sage': '1307470382785101945'
};

client.on('messageReactionAdd', async (reaction, user) => {
    // When a reaction is received, check if the structure is partial
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    // Check if the reaction is from a bot and ignore it
    if (user.bot) return;

    // Log the message and reaction count
    console.log(`${reaction.message.author.tag}'s message "${reaction.message.content}" gained a reaction!`);
    console.log(`${reaction.count} user(s) have given the same reaction to this message! This is the emoji Used ${reaction.emoji.name}`);

    // Check if the reaction is for the specific message ID
    if (reaction.message.id === '1295740167826702368') {
        // Check if the reaction emoji is in the role mapping
        const emojiName = reaction.emoji.name; // Get the emoji name
        const roleId = roleMapping[emojiName]; // Get the role ID based on the emoji name
        if (roleId) {
            try {
                // Get the guild member for the user
                const member = await reaction.message.guild.members.fetch(user.id);
                if (member) {
                    // Assign the role to the user
                    const role = reaction.message.guild.roles.cache.get(roleId);
                    if (role) {
                        await member.roles.add(role);
                        await console.log(`${user.tag} has been given the role: ${role.name}`)
                    } else {
                        console.log(`Role with ID ${roleId} not found.`);
                    }
                } else {
                    console.log(`Member not found for user: ${user.tag}`);
                }
            } catch (error) {
                console.error(`Failed to assign role: ${error.message}`);
            }
        }
    }
});

// Event for when a reaction is removed
client.on('messageReactionRemove', async (reaction, user) => {
    // When a reaction is received, check if the structure is partial
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
        }
    }

    // Check if the reaction is from a bot and ignore it
    if (user.bot) return;

    // Check if the reaction is for the specific message ID
    if (reaction.message.id === '1295740167826702368') {
        // Check if the reaction emoji is in the role mapping
        const emojiName = reaction.emoji.name; // Get the emoji name
        const roleId = roleMapping[emojiName]; // Get the role ID based on the emoji name
        if (roleId) {
            try {
                // Get the guild member for the user
                const member = await reaction.message.guild.members.fetch(user.id);
                if (member) {
                    // Remove the role from the user
                    const role = reaction.message.guild.roles.cache.get(roleId);
                    if (role) {
                        await member.roles.remove(role);
                        await console.log(`${user.tag} has had the role removed: ${role.name}`)
                    } else {
                        console.log(`Role with ID ${roleId} not found.`);
                    }
                } else {
                    console.log(`Member not found for user: ${user.tag}`);
                }
            } catch (error) {
                console.error(`Failed to remove role: ${error.message}`);
            }
        }
    }
});
const fitnessSetup = () => {
    //needs to take, startDate, endDate, and current metric to create a new fitness goal
    //should remove old goal when new one is configured.
    //should generate a message and pin it with current metric
}

const fitnessUpdate = () => {
    //neeeds to keep a count of whatever the current metric

}
const fitnessLeaderboard = () => {
    //pull and list the users descending for the current metric
    //Should update at 05:00 each morning the event is active
}

client.login(process.env.DISCORD_TOKEN)