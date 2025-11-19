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
  const message = [
    'Мы бережно относимся к вашим данным 💚',
    'Подтвердите своё согласие на получение информационных и маркетинговых сообщений, а также на обработку персональных данных в соответствии с нашими документами:',
    '',
    '• <a href="https://zagorodom96.ru/privacy">Политика конфиденциальности</a>',
    '• <a href="https://zagorodom96.ru/soglasie">Согласие на получение информационных сообщений</a>',
    '• <a href="https://zagorodom96.ru/oferta">Договор оферты</a>'
  ].join('\n');

  ctx.reply(
    message,
    {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Соглашаюсь', callback_data: 'consent_accept' },
            { text: 'Не соглашаюсь', callback_data: 'consent_decline' }
          ]
        ]
      },
      reply_to_message_id: ctx.message?.message_id
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
