import { ADMIN_IDS } from '../config.js';

const REWARD_CALLBACK_PREFIX = 'reward_send:';

export function getRewardCallbackId(requestId) {
  return `${REWARD_CALLBACK_PREFIX}${requestId}`;
}

export function isRewardCallback(data) {
  return data.startsWith(REWARD_CALLBACK_PREFIX);
}

export function extractRewardId(data) {
  return data.replace(REWARD_CALLBACK_PREFIX, '');
}

export async function handleUserRewardMedia(ctx, rewardService, bot) {
  if (!ctx.session?.agreed) {
    return;
  }
  if (!ctx.message) {
    return;
  }

  const fileInfo = extractFileInfo(ctx.message);
  if (!fileInfo) {
    return;
  }

  const request = rewardService.createRequest({
    userId: ctx.from.id,
    username: ctx.from.username || '',
    name: [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' '),
    mediaType: fileInfo.type,
    fileId: fileInfo.fileId,
    caption: ctx.message.caption || ''
  });

  await ctx.reply('Спасибо! Мы передали отзыв администраторам и скоро пришлём подарок.');
  notifyAdminsAboutReward(bot, ctx, request);
}

function notifyAdminsAboutReward(bot, ctx, request) {
  ADMIN_IDS.forEach(async (adminId) => {
    const text = [
      'Получен отзыв от пользователя:',
      `Имя: ${request.name || 'без имени'}`,
      request.username ? `Логин: @${request.username}` : null,
      `ID: ${request.userId}`,
      '',
      'Нажмите кнопку, чтобы отправить подарок.'
    ]
      .filter(Boolean)
      .join('\n');

    await bot.telegram.sendMessage(adminId, text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Отправить подарок?', callback_data: getRewardCallbackId(request.id) }
          ]
        ]
      }
    });

    sendMedia(bot, adminId, request);
  });
}

function sendMedia(bot, chatId, request) {
  if (request.mediaType === 'photo') {
    bot.telegram.sendPhoto(chatId, request.fileId, {
      caption: request.caption || undefined
    });
  } else if (request.mediaType === 'document') {
    bot.telegram.sendDocument(chatId, request.fileId, {
      caption: request.caption || undefined
    });
  }
}

function extractFileInfo(message) {
  if (message.photo && message.photo.length) {
    return {
      type: 'photo',
      fileId: message.photo[message.photo.length - 1].file_id
    };
  }
  if (message.document) {
    return {
      type: 'document',
      fileId: message.document.file_id
    };
  }
  return null;
}

export async function handleRewardCallback(ctx, rewardService, bot) {
  const id = extractRewardId(ctx.callbackQuery.data);
  const request = rewardService.getRequestById(id);
  if (!request) {
    await ctx.answerCbQuery('Заявка не найдена', { show_alert: true });
    return;
  }
  if (request.handled) {
    await ctx.answerCbQuery('Подарок уже отправлен', { show_alert: true });
    return;
  }

  const rewardMessage = rewardService.getRewardMessage();
  if (!rewardMessage) {
    await ctx.answerCbQuery('Нет поздравительного сообщения', { show_alert: true });
    return;
  }

  await bot.telegram.sendMessage(request.userId, rewardMessage, { parse_mode: 'HTML' }).catch(() => {});
  rewardService.markHandled(request.id);
  await ctx.answerCbQuery('Подарок отправлен');
  await ctx.reply('Поздравительное сообщение отправлено пользователю.');
}

export { REWARD_CALLBACK_PREFIX };
