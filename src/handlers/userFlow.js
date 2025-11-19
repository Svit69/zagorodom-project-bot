import { USER_STATES } from '../constants.js';

export const USER_BUTTONS = {
  GET_PROJECT: 'Получить проект'
};

export function getUserCommandKeyboard() {
  return {
    keyboard: [[{ text: USER_BUTTONS.GET_PROJECT }]],
    resize_keyboard: true,
    is_persistent: true
  };
}

export function startFlow(ctx) {
  ctx.session.state = USER_STATES.AWAITING_CONSENT;
  ctx.session.temp = {};
  ctx.session.agreed = false;
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
  ctx.session.state = USER_STATES.NONE;
  ctx.session.agreed = true;
  ctx.reply(
    `Спасибо, ${user.name}! Нажмите кнопку «${USER_BUTTONS.GET_PROJECT}», чтобы ввести ID проекта.`,
    {
      reply_markup: getUserCommandKeyboard()
    }
  );
}

export function handleConsentNo(ctx) {
  ctx.session.state = USER_STATES.NONE;
  ctx.session.agreed = false;
  ctx.reply('Без согласия на обработку данных продолжить нельзя. Наберите /start, чтобы попробовать снова.', {
    reply_markup: { remove_keyboard: true }
  });
}

export function requestProjectId(ctx) {
  if (!ctx.session.agreed) {
    ctx.reply('Сначала примите согласие: нажмите /start и подтвердите обработку данных.');
    return;
  }
  ctx.session.state = USER_STATES.AWAITING_PROJECT_ID;
  ctx.reply('Введите ID проекта:', {
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
  ctx.session.state = USER_STATES.NONE;
  ctx.reply(`Ссылка на проект «${project.name}»:\n${project.link}`);
  const rewardMessage = [
    '<b>У нас есть для вас небольшой подарок</b> — набор проектов: гараж и баня',
    'Чтобы мы смогли его отправить, пожалуйста, оставьте отзыв на маркетплейсе и пришлите в этот чат скриншот, что вы его опубликовали.',
    'И мы пришлём ссылку на скачивание 💚'
  ].join('\n');
  ctx.reply(rewardMessage, { parse_mode: 'HTML' });
  ctx.reply('Нужен другой проект? Нажмите кнопку ниже.', {
    reply_markup: getUserCommandKeyboard()
  });
}
