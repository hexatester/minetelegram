function inject (bot, { token, user, echo, ignoreMessages }, VERSION) {
  const { Telegraf, Telegram } = require('telegraf')
  const telegram = new Telegraf(token)
  const telegramClient = new Telegram(token)
  let listen = true
  if (user) {
    telegram.use(async (ctx, next) => {
      try {
        if (ctx.chat.id === user) {
          await next()
        }
      } catch (error) {
        console.error(JSON.stringify(error))
      }
    })
  }

  // Ignored messages
  let ignores = [
    '/start',
    '/listen',
    '/ignore',
    '/inventory',
    '/version'
  ].concat(ignoreMessages)
  const ignore = msg => ignores.includes(msg)

  // /start command
  telegram.start(ctx =>
    ctx.replyWithHTML(`
      Hi!
      Usage :
      <code>/listen</code> - To toggle listen mode
      <code>/ignore <text></code> - Prevent message to be sent into bot.chat on listen mode, eg <code>/ignore /start</code>
      `)
  )

  // /ignore command - ignore message
  telegram.command('ignore', ctx => {
    const message = ctx.message.text || ''
    const text = message.split(' ')[-1]
    if (ignores.includes(text)) {
      return ctx.reply(`${text} already in ignore list`)
    }
    try {
      ignores.push(text)
    } catch (error) {
      return ctx.reply(`Failed to ignore, reason : ${error.message}`)
    }
    return ctx.reply(`Successfuly added ${text} into ignore list`)
  })

  // /listen command
  telegram.command('listen', ({ reply }) => {
    if (listen) {
      listen = false
      reply('Listen mode disabled')
    } else {
      listen = true
      reply('Listen mode enabled')
    }
  })

  // /inventory
  telegram.command('inventory', ({ reply }) => reply(bot.inventorySayItems()))

  // /version command
  telegram.command('version', ({ reply }) => reply(VERSION))

  // Telegram -> bot.chat if listen === true
  telegram.on('text', ctx => {
    if (
      listen &&
      ctx.message &&
      ctx.message.text &&
      !ignore(ctx.message.text)
    ) {
      bot.chat(ctx.message.text)
    }
    if (echo) console.log(`<- ${ctx.message.text}`)
  })

  // Minecraft chat -> telegram
  bot.on('message', message => {
    let length = message && message.length ? message.length() : 0
    if (listen && message && length > 0) {
      telegramClient.sendMessage(user, message.toString())
    }
    if (echo) console.log(`-> ${message.toString() || message}`)
  })

  // Inject into bot object
  bot.telegraf = telegram
  bot.telegram = telegramClient
  bot.sendMessage = text => telegramClient.sendMessage(user, text)
  bot.addToIgnore = text => ignores.push(text)
  bot.once('login', () => telegram.launch())
}

module.exports = inject
