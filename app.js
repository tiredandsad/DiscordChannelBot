const { Client, GatewayIntentBits, Partials } = require('discord.js');


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

client.on('messageCreate', async (message) => {
    if (message.author.id === '1295725261043798088') {
        // Bot message, skip processing
        return;
    }

    if (message.channel.id === '1232486619165233212' || 
        message.channel.id === '1232486691399536661') {

        console.log(message);

        if (message.attachments.size <= 0) {
            try {
                const botMessage = await message.channel.send({
                    content: 'This channel only allows image posts. Please start a thread on the image if you want to discuss it.',
                });

                // Delete the user's message
                await message.delete();
                console.log('Message without image deleted');

                // Delete the bot's message after 2 minutes (120000 ms)
                setTimeout(async () => {
                    try {
                        await botMessage.delete();
                        console.log('Bot message deleted after timeout');
                    } catch (error) {
                        console.error('Bot message could not be deleted: ', error);
                    }
                }, 9000); // 2 minutes
            } catch (error) {
                console.error('Message could not be deleted: ', error);
            }
        }
    }
});


const roleMapping = {
    '💜': '1219762750180429914', // Custom emoji name for purple heart
    '🩷': '1219762832942563401',   // Custom emoji name for pink heart
    'heart_sky': '1219762802416160949',    // Custom emoji name for sky heart
    '💚': '1290815519175344211'    // Custom emoji name for green heart
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


//Check this message for reacts 1295740167826702368

client.login(process.env.DISCORD_TOKEN)