/// <reference lib="deno.unstable" />

import { Bot, Context, InlineKeyboard, session } from "grammy";
import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from "grammy_conversations";
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

// Load enviroment variables from .env
await load({ export: true });

/*
There is no way to run the programm without this enviroment variables so we just exit.
This might seem bad but it's actually fine since this is meant to be deployed serverless,
meaning the envs will be set a secrets.
*/
const bot_token = Deno.env.get("BOT_TOKEN");
if (!bot_token) throw new Error("BOT_TOKEN is unset");

const channel_id = Deno.env.get("CHANNEL_ID");
if (!channel_id) throw new Error("CHANNEL_ID is unset");

const group_id = Deno.env.get("GROUP_ID");
if (!group_id) throw new Error("GROUP_ID is unset");

type BotContext = Context & ConversationFlavor;

// Export the bot so we can easily use bot webhook and polling mode.
export const bot = new Bot<BotContext>(bot_token);

bot.use(session({ initial: () => ({}) }));
bot.use(conversations());

/*
This command is automatically run when a user interacts with the bot for the first time,
meaning it should contain all the information to get started with the bot
*/
bot.command("start", (ctx) => {
  ctx.reply("Bot is running!");
});

const postInlineKeyboard = new InlineKeyboard()
  .text("Si", "yes").text("No", "no");

const voteInlineKeyboard = new InlineKeyboard()
  .text("Approva", "approve").text("Rifiuta", "reject");

async function post(conversation: Conversation<BotContext>, ctx: BotContext) {
  await ctx.reply("Manda il post che vuoi pubblicare.");

  const post = await conversation.waitFor(
    ["message:text", ":media"],
    (ctx) => {
      ctx.reply("Il tipo di messaggio inviato non è supportato");
    },
  );

  await ctx.reply("Sei sicur* di voler inviare questo post?", {
    reply_to_message_id: post.msg.message_id,
    reply_markup: postInlineKeyboard,
  });

  const response = await conversation.waitForCallbackQuery(
    ["yes", "no"],
    (ctx) =>
      ctx.reply(
        "E ancora in corso l'invio di un post. Puoi cancellare l'operazione con /cancel",
      ),
  );

  await response.answerCallbackQuery({
    text: "Domanda inviata con successo", // Sends a notification/toast thingy with the specified text
  });

  if (response.match === "yes") {
    const _copiedMessage = await post.copyMessage(group_id!, {
      reply_markup: voteInlineKeyboard,
    });

    await response.editMessageText("Il tuo post è in fase di revisione");
  } else if (response.match === "no") {
    await response.editMessageText("Post annullato");
  }
}

bot.command("cancel", async (ctx) => {
  await ctx.conversation.exit();
  await ctx.reply("Post annullato");
});

bot.use(createConversation(post));

bot.command("post", async (ctx) => {
  await ctx.conversation.enter("post");
});

bot.callbackQuery("approve", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.copyMessage(channel_id);
  await bot.api.editMessageReplyMarkup(group_id, ctx.msg!.message_id);
  await ctx.reply("Post approvato", {
    reply_to_message_id: ctx.msg!.message_id,
  });
});

bot.callbackQuery("reject", async (ctx) => {
  await ctx.answerCallbackQuery();

  await bot.api.editMessageReplyMarkup(group_id, ctx.msg!.message_id);
  await ctx.reply("Post Rifiutato", {
    reply_to_message_id: ctx.msg!.message_id,
  });
});

// Simple helpers to get the chat id and user_id
bot.command("chat_id", (ctx) => {
  ctx.reply(ctx.chat.id.toString());
});

bot.command("user_id", (ctx) => {
  // FIXME: null check
  ctx.reply(ctx.from!.id.toString());
});

if (import.meta.main) {
  await bot.start();
}
