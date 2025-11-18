import { USER_STATES } from '../constants.js';

export function startFlow(ctx) {
  ctx.session.state = USER_STATES.AWAITING_CONSENT;
  ctx.session.temp = {};
  ctx.reply(
    'Добро пожаловать! Нажмите «Старт», чтобы продолжить.',
    {
      reply_markup: {
        keyboard: [[{ text: 'Старт' }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    }
  );
}

export function consentStep(ctx) {
  ctx.session.state = USER_STATES.AWAITING_CONSENT;
  ctx.reply(
    'Для продолжения подтвердите согласие на обработку персональных данных.',
    {
      reply_markup: {
        keyboard: [
          [{ text: 'Соглашаюсь' }, { text: 'Не соглашаюсь' }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    }
  );
}

export function handleConsentYes(ctx, userService) {
  const user = userService.ensureUser(ctx.from);
  ctx.session.state = USER_STATES.AWAITING_PROJECT_ID;
  ctx.reply(
    `Спасибо, ${user.name}! Введите ID проекта, чтобы получить ссылку.`,
    {
      reply_markup: {
        remove_keyboard: true
      }
    }
  );
}

export function handleConsentNo(ctx) {
  ctx.session.state = USER_STATES.NONE;
  ctx.reply('Без согласия на обработку данных продолжить нельзя. Наберите /start, чтобы попробовать снова.', {
    reply_markup: { remove_keyboard: true }
  });
}

export function handleProjectIdInput(ctx, projectService, userService) {
  const id = (ctx.message?.text || '').trim().toUpperCase();
  if (!id) {
    return;
  }
  const result = projectService.consumeId(id);
  if (!result) {
    ctx.reply('ID не найден. Попробуйте ещё раз.');
    return;
  }
  const { project } = result;
  userService.addPurchase(ctx.from.id, project.name);
  ctx.reply(`Ссылка на проект «${project.name}»:\n${project.link}`);
}
