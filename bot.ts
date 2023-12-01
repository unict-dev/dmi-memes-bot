/// <reference lib="deno.unstable" />

import { Bot } from "grammy";
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

// Export the bot so we can easily use bot webhook and polling mode.
export const bot = new Bot(bot_token);

/*
This command is automatically run when a user interacts with the bot for the first time,
meaning it should contain all the information to get started with the bot
*/
bot.command("start", (ctx) => {
  ctx.reply("Bot is running!");
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
