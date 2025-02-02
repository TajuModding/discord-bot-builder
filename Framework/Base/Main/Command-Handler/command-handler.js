const config = require("../../../config/config.json");
const cmdCooldown = new Set();

module.exports = {
    handleCommand(msg, command) {
        const defaultSettings = {
            prefix: config.prefix,
            logs: "disabled"
        };

        const customPrefix = client.settings.ensure(msg.guild.id, defaultSettings).prefix; //Get the server's custom prefix if available

        const prefixes = [customPrefix, config.prefix]; //Define a list of available prefixes

        this.prefix = config.prefix;

        for (const thisPrefix of prefixes) { //If the message doesn't start with a valid prefix, ignore it 
            if (msg.content.startsWith(thisPrefix)) {
                this.prefix = thisPrefix;
            };
        };

        if (!this.prefix.length) {
            this.prefix = config.prefix;
        };

        if (!msg.content.startsWith(this.prefix)) {
            return;
        };

        const args = msg.content.split(" ").slice(1); //Split the arguments

        const cmdName = msg.content.slice(this.prefix.length).split(/ +/).shift().toLowerCase(); //Get the command name

        const cmd = client.commands.get(cmdName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(cmdName)); //Get a list of commands and aliases

        if (!cmd) { //Ignore the message if it doesn't include a valid command
            return;
        };

        if (cmd.category === "Administration" && !config.owners.includes(msg.author.id)) { //If the command is in the Administration category and the author isn't an owner, ignore it
            return;
        };

        client.disabledCommands.ensure(msg.guild.id, []); //Make sure that the enmap won't kill itself lol

        if (client.disabledCommands.includes(msg.guild.id, cmdName)) { // If the command is disabled, ignore 
            return msg.channel.send(`**${cmdName}** is disabled`);
        };

        if (!msg.guild.me.hasPermission('SEND_MESSAGES')) { //Send an error if the bot doesn't have permissions
            return msg.author.send(`I can't send messages in **${msg.guild.name}**! Make sure I have the correct permissions and try again`).catch(e => {
                return;
            });
        };

        if (cmd.cooldown) { //Check if the command has a cooldown
            if (!cmdCooldown.has(`${msg.author.id} | ${msg.guild.id}`)) {
                cmdCooldown.add(`${msg.author.id} | ${msg.guild.id}`); //Add the user/guild pair to the cooldown

                setTimeout(() => { //Remove them from the cooldown after the specified time
                    cmdCooldown.delete(`${msg.author.id} | ${msg.guild.id}`);
                }, cmd.cooldown);
            } else {
                return msg.channel.send(`**${cmd.name}** has a ${cmd.cooldown / 1000} second cooldown! Please wait a bit before using it again`);
            };
        };

        cmd.execute(msg, args).catch(e => { //Execute the command
            msg.channel.send(`There was an error running that command! The information below has been sent to the developer \n\`\`\`js\n${e}\`\`\``); //Send an error if needed

            if (client.channels.cache.get(config.errorChannel)) {
                client.channels.cache.get(config.errorChannel).send(`There was an error in ${msg.guild} (${msg.guild.id}) while running the command **${cmd.name}** \n\`\`\`js\n${e}\`\`\``); //Send an error to the log channel
            };
        });
    }
};