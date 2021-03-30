//Webex Bot Starter - featuring the webex-node-bot-framework - https://www.npmjs.com/package/webex-node-bot-framework

var framework = require('webex-node-bot-framework');
var webhook = require('webex-node-bot-framework/webhook');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
// app.use(express.static('images'));

const axios = require('axios')

require('dotenv').config()
const config = {
  "webhookUrl": process.env.WEBHOOK,
  "token": process.env.BOT_TOKEN,
  "port": process.env.PORT
}

if (process.env.GUIDE_EMAILS) {
  config.guideEmails = process.env.GUIDE_EMAILS;
}
if (!((process.env.ALLOWED_DOMAINS) || (process.env.GUIDE_EMAILS))) {
  console.error(`This demo requires at least one of ALLOWED_DOMAINS and/or GUIDE_EMAIL environment variables to be set.`);
  process.exit(0);
}

// init framework
var framework = new framework(config);
framework.start();
console.log("Starting 1 framework, please wait...");
framework.on("initialized", function () {
  console.log("framework is all fired up! [Press CTRL-C to quit]");
});

// A spawn event is generated when the framework finds a space with your bot in it
// If actorId is set, it means that user has just added your bot to a new space
// If not, the framework has discovered your bot in an existing space
framework.on('spawn', (bot, id, actorId) => {
  if (!actorId) {
    // don't say anything here or your bot's spaces will get
    // spammed every time your server is restarted
    console.log(`While starting up, the framework found our bot in a space called: ${bot.room.title}`);
  } else {
    // When actorId is present it means someone added your bot to a new space
    // Lets find out more about them..
    var msg = 'You can say `help` to get the list of words I am able to respond to.';
    bot.webex.people.get(actorId).then((user) => {
      msg = `Hey there ${user.displayName}. ${msg}`; 
    }).catch((e) => {
      console.error(`Failed to lookup user details in framwork.on("spawn"): ${e.message}`);
      msg = `Hello there. ${msg}`;  
    }).finally(() => {
      // Say hello, and tell users what you do!
      if (bot.isDirect) {
        bot.say('markdown', msg);
      } else {
        let botName = bot.person.displayName;
        msg += `\n\nDon't forget, in order for me to see your messages in this group space, be sure to *@mention* ${botName}.`;
        bot.say('markdown', msg);
      }
    });
  }
});


//Process incoming messages

let responded = false;
/* On mention with command
ex User enters @botname help, the bot will write back in markdown
*/
framework.hears(/help|what can i (do|say)|what (can|do) you do/i, function (bot, trigger) {
  console.log(`someone needs help! They asked ${trigger.text}`);
  responded = true;
  bot.say(`Hey ${trigger.person.displayName}.`)
    .then(() => sendHelp(bot))
    .catch((e) => console.error(`Problem in help handler: ${e.message}`));
});

/* On mention with command
ex User enters @botname authorize, the bot will supply a link to start the oauth grant flow
*/
framework.hears('authorize', function (bot) {
  console.log("authorize command received");
  responded = true;
  bot.say("markdown", `[Authorize Me!](${process.env.INT_AUTH_URL}banana)`);
});

/* On mention with command
ex User enters @botname framework, the bot will write back in markdown
*/
framework.hears('framework', function (bot) {
  console.log("framework command received");
  responded = true;
  bot.say("markdown", "The primary purpose for the [webex-node-bot-framework](https://github.com/jpjpjp/webex-node-bot-framework) was to create a framework based on the [webex-jssdk](https://webex.github.io/webex-js-sdk) which continues to be supported as new features and functionality are added to Webex. This version of the project was designed with two themes in mind: \n\n\n * Mimimize Webex API Calls. The original flint could be quite slow as it attempted to provide bot developers rich details about the space, membership, message and message author. This version eliminates some of that data in the interests of efficiency, (but provides convenience methods to enable bot developers to get this information if it is required)\n * Leverage native Webex data types. The original flint would copy details from the webex objects such as message and person into various flint objects. This version simply attaches the native Webex objects. This increases the framework's efficiency and makes it future proof as new attributes are added to the various webex DTOs ");
});

/* On mention with command, using other trigger data, can use lite markdown formatting
ex User enters @botname 'info' phrase, the bot will provide personal details
*/
framework.hears('info', function (bot, trigger) {
  console.log("info command received");
  responded = true;
  //the "trigger" parameter gives you access to data about the user who entered the command
  let personAvatar = trigger.person.avatar;
  let personEmail = trigger.person.emails[0];
  let personDisplayName = trigger.person.displayName;
  let outputString = `Here is your personal information: \n\n\n **Name:** ${personDisplayName}  \n\n\n **Email:** ${personEmail} \n\n\n **Avatar URL:** ${personAvatar}`;
  bot.say("markdown", outputString);
});

/* On mention with bot data 
ex User enters @botname 'space' phrase, the bot will provide details about that particular space
*/
framework.hears('space', function (bot) {
  console.log("space. the final frontier");
  responded = true;
  let roomTitle = bot.room.title;
  let spaceID = bot.room.id;
  let roomType = bot.room.type;

  let outputString = `The title of this space: ${roomTitle} \n\n The roomID of this space: ${spaceID} \n\n The type of this space: ${roomType}`;

  console.log(outputString);
  bot.say("markdown", outputString)
    .catch((e) => console.error(`bot.say failed: ${e.message}`));

});

// Buttons & Cards data
let cardJSON =
{
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  type: 'AdaptiveCard',
  version: '1.0',
  body:
    [{
      type: 'ColumnSet',
      columns:
        [{
          type: 'Column',
          width: '5',
          items:
            [{
              type: 'Image',
              url: 'Your avatar appears here!',
              size: 'large',
              horizontalAlignment: "Center",
              style: 'person'
            },
            {
              type: 'TextBlock',
              text: 'Your name will be here!',
              size: 'medium',
              horizontalAlignment: "Center",
              weight: 'Bolder'
            },
            {
              type: 'TextBlock',
              text: 'And your email goes here!',
              size: 'small',
              horizontalAlignment: "Center",
              isSubtle: true,
              wrap: false
            }]
        }]
    }]
};

/* On mention with card example
ex User enters @botname 'card me' phrase, the bot will produce a personalized card - https://developer.webex.com/docs/api/guides/cards
*/
framework.hears('card me', function (bot, trigger) {
  console.log("someone asked for a card");
  responded = true;
  let avatar = trigger.person.avatar;

  cardJSON.body[0].columns[0].items[0].url = (avatar) ? avatar : `${config.webhookUrl}/missing-avatar.jpg`;
  cardJSON.body[0].columns[0].items[1].text = trigger.person.displayName;
  cardJSON.body[0].columns[0].items[2].text = trigger.person.emails[0];
  bot.sendCard(cardJSON, 'This is customizable fallback text for clients that do not support buttons & cards');
});

/* On mention reply example
ex User enters @botname 'reply' phrase, the bot will post a threaded reply
*/
framework.hears('reply', function (bot, trigger) {
  console.log("someone asked for a reply.  We will give them two.");
  responded = true;
  bot.reply(trigger.message, 
    'This is threaded reply sent using the `bot.reply()` method.',
    'markdown');
  var msg_attach = {
    text: "This is also threaded reply with an attachment sent via bot.reply(): ",
    file: 'https://media2.giphy.com/media/dTJd5ygpxkzWo/giphy-downsized-medium.gif'
  };
  bot.reply(trigger.message, msg_attach);
});

/* On mention with unexpected bot command
   Its a good practice is to gracefully handle unexpected input
*/
framework.hears(/.*/, function (bot, trigger) {
  // This will fire for any input so only respond if we haven't already
  if (!responded) {
    console.log(`catch-all handler fired for user input: ${trigger.text}`);
    bot.say(`Sorry, I don't know how to respond to "${trigger.text}"`)
      .then(() => sendHelp(bot))
      .catch((e) => console.error(`Problem in the unexepected command hander: ${e.message}`));
  }
  responded = false;
});

function sendHelp(bot) {
  bot.say("markdown", 'These are the commands I can respond to:', '\n\n ' +
    '1. **user** - Get info on a user by supplying a piece of info about them. I.e., name, email, phone number.\n' +
    '2. **workspace** - Get info on a workspace by supplying a piece of info about it.  I.e., name, phone number, calendar address.\n' +
    '3. **device** - Get info on a device by supplying a piece of info about it.  I.e., MAC address, belongs to, or tag.\n' +
    '4. **number** - Get info on a number by supplying the number.  E.g., 2001 or +16125551212\n' +
    '5. **location** - Get info on a location by supplying a piece of info about it.  I.e., name, routing prefix, or phone number\n' +
    '6. **service settings** - List services settings\n' +
    '7. **client settings** - List client settings\n' +
    '8. **help** - what you are reading now');
}

app.get('/authorize', function (req, res) {
  // From Python + Flask
  // data = {
  //   "grant_type": "authorization_code",
  //   "client_id": "Cbd0696ec5be29c8bf30c854a0b986e524baa98a714a0cac96305b8e7b0cc5ede",
  //   "client_secret": "0ae05e2a292d5ef3738f8c6a53ec4e57f37b258f4d2531ac98fcf7ba41879404",
  //   "code": request.args.get("code"),
  //   "redirect_uri": "http://127.0.0.1:5000/oauth"
  // }
  // resp = requests.post("https://webexapis.com/v1/access_token", data=data)
  // resp.raise_for_status()
  // access_token = resp.json()["access_token"]
  // session['access_token'] = access_token
  // return redirect(url_for("home"))
  axios
  .post('https://webexapis.com/v1/access_token', {
    "grant_type": "authorization_code",
    "client_id": process.env.INT_CLIENT_ID,
    "client_secret": process.env.INT_CLIENT_SECRET,
    "code": req.query.code,
    "redirect_uri": process.env.INT_REDIR_URL
  })
  .then(res => {
    console.log(`statusCode: ${res.statusCode}`);
    console.log(res);
    console.log(res.data.access_token);
    res.send(`You're all set!  You can close this window now.`);
  })
  .catch(error => {
    console.error(error);
    res.send(`Hmmm. Something didn't work out like I expected.`);
  });
});

//Server config & housekeeping
// Health Check
app.get('/', function (req, res) {
  res.send(`Hi.  I'm the Webex Calling Admin Bot.  You can add me to Webex and send me a message.`);
});

app.post('/', webhook(framework));

var server = app.listen(config.port, function () {
  framework.debug('framework listening on port %s', config.port);
});

// gracefully shutdown (ctrl-c)
process.on('SIGINT', function () {
  framework.debug('stoppping...');
  server.close();
  framework.stop().then(function () {
    process.exit();
  });
});
