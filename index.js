require("dotenv").config();
const { Client, Events, GatewayIntentBits } = require('discord.js');
const token = process.env.BOT_TOKEN;
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const fs = require("fs");
// Load server data from file
if (!fs.existsSync("./servers.json")) {
	fs.writeFileSync("./servers.json", "{}");
}
let servers = JSON.parse(fs.readFileSync("./servers.json").toString());
/** 
 * Save server data to file
 */ 
function s() {
	fs.writeFileSync("./servers.json", JSON.stringify(servers));
}

client.once("ready", c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on("messageCreate", async message => {
	if (message.author.bot) return; // Ignore bots
	// Bind counting channel, init server data
	if (message.content === "bind counting to this channel" && message.member.permissions.has("ADMINISTRATOR")) {
		if (!servers[message.guild.id]) servers[message.guild.id] = {
			countingChannel: null,
			current: 0,
			lastCounter: null,
			lastCountMessage: null,
			highscore: 0,
			highscoreHolder: null
		};
		servers[message.guild.id].countingChannel = message.channel.id
		message.reply("Done")
		return s();
	}
	// Get highscore
	if (message.content === "highscore" && servers?.[message.guild.id]?.countingChannel === message.channel.id) {
		return message.reply(`The highscore is **${servers[message.guild.id].highscore}** by <@${servers[message.guild.id].highscoreHolder}>.`)
	} // Get current number
	if (message.content === "current" && servers?.[message.guild.id]?.countingChannel === message.channel.id) {
		return message.reply(`The current number is **${servers[message.guild.id].current}** by <@${servers[message.guild.id].lastCounter}>.`)
	}

	// If the message is not in the counting channel, return
	if (!servers[message.guild.id] || !servers[message.guild.id].countingChannel) return;
	if (message.channel.id !== servers[message.guild.id].countingChannel) return;
	
	let messageNumber = Number(message.content);
	if (isNaN(messageNumber)) return;
	// If the number isnt correct, reset the counter
	const wrong = () => {
		if (servers[message.guild.id].current === 0) return message.reply(`The current number is **0**. Did you even try?\nYou said: ${messageNumber}`)
		message.reply(`Wrong number! The current number is **0**.`)
		message.react("❌");
		servers[message.guild.id].current = 0;
		servers[message.guild.id].lastCounter = null;
		servers[message.guild.id].lastCountMessage = null;
		s();
		return;
	}
	// If the user tries to count twice in a row, reset the counter
	const repeat = () => {
		message.reply(`You can't count twice in a row! The current number is **0**.`)
		message.react("❌");
		servers[message.guild.id].current = 0;
		servers[message.guild.id].lastCounter = null;
		servers[message.guild.id].lastCountMessage = null;
		s();
		return;
	}
	// Check rules
	if (message.author.id === servers[message.guild.id].lastCounter) return repeat();
	if (messageNumber !== servers[message.guild.id].current + 1) return wrong();
	// React to the message with a tick, and update server data
	servers[message.guild.id].current = messageNumber;
	servers[message.guild.id].lastCounter = message.author.id;
	servers[message.guild.id].lastCountMessage = message.id;
	if (messageNumber > servers[message.guild.id].highscore) {
		servers[message.guild.id].highscore = messageNumber;
		servers[message.guild.id].highscoreHolder = message.author.id;
		message.react("☑️");
	} else {
		message.react("✅");
	}
	s();
})
// If the last message is deleted, send a message
client.on("messageDelete", async message => {
	if (!servers[message.guild.id] || !servers[message.guild.id].countingChannel) return;
	if (message.channel.id !== servers[message.guild.id].countingChannel) return;
	if (message.id !== servers[message.guild.id].lastCountMessage) return;
	message.channel.send(`The last message was deleted! The current number is **${servers[message.guild.id].current}**.`)
});

// Log in to Discord with your client's token
client.login(token);
