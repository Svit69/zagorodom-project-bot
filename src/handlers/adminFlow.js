import { USER_STATES } from '../constants.js';
import { ADMIN_IDS } from '../config.js';

export const callbacks = {
  GET_ID: 'getid:',
  GET_ID_NEXT: 'getid_next:',
  EDIT_SELECT: 'edit_select:',
  EDIT_ACTION: 'edit_action:'
};

export function isAdmin(ctx) {
  return ADMIN_IDS.includes(ctx.from?.id);
}

export function formatProjectsKeyboard(projects, prefix) {
  return {
    inline_keyboard: projects.map((project) => [
      {
        text: project.name,
        callback_data: `${prefix}${encodeURIComponent(project.name)}`
      }
    ])
  };
}

export function handleGetIdCommand(ctx, projectService) {
  const projects = projectService.listProjects();
  if (!projects.length) {
    ctx.reply('Проектов пока нет.');
    return;
  }
  ctx.reply('Выберите проект:', {
    reply_markup: formatProjectsKeyboard(projects, callbacks.GET_ID)
  });
}

export function handleGetIdSelection(ctx, projectService) {
  const name = decodeURIComponent(ctx.callbackQuery.data.replace(callbacks.GET_ID, ''));
  const project = projectService.getProjectByName(name);
  if (!project) {
    ctx.answerCbQuery('Проект не найден', { show_alert: true });
    return;
  }
  const firstId = project.ids[0];
  ctx.answerCbQuery();
  ctx.reply(firstId ? `Первый свободный ID: ${firstId}` : 'Свободных ID нет.', {
    reply_markup: firstId
      ? {
          inline_keyboard: [
            [
              {
                text: 'Списать и получить следующий',
                callback_data: `${callbacks.GET_ID_NEXT}${encodeURIComponent(project.name)}`
              }
            ]
          ]
        }
      : undefined
  });
}

export function handleGetIdNext(ctx, projectService) {
  const name = decodeURIComponent(ctx.callbackQuery.data.replace(callbacks.GET_ID_NEXT, ''));
  const result = projectService.consumeFirstId(name);
  if (!result) {
    ctx.answerCbQuery('ID не найден', { show_alert: true });
    return;
  }
  const { project, issued } = result;
  const nextId = project.ids[0];
  ctx.answerCbQuery();
  ctx.reply(
    [
      `Выдан ID: ${issued}`,
      nextId ? `Следующий свободный ID: ${nextId}` : 'Свободных ID больше нет.'
    ].join('\n'),
    {
      reply_markup: nextId
        ? {
            inline_keyboard: [
              [
                {
                  text: 'Списать и получить следующий',
                  callback_data: `${callbacks.GET_ID_NEXT}${encodeURIComponent(project.name)}`
                }
              ]
            ]
          }
        : undefined
    }
  );
}

export function handleUsersList(ctx, userService) {
  const users = userService.listUsers();
  if (!users.length) {
    ctx.reply('Пользователей пока нет.');
    return;
  }
  const lines = users.map((u) => {
    const date = new Date(u.registeredAt).toLocaleString('ru-RU');
    const purchases = u.purchases.length ? u.purchases.join(', ') : 'нет покупок';
    return `@${u.login} | ${u.name} | ${date} | ${purchases}`;
  });
  ctx.reply(lines.join('\n'));
}

export function handleProjectsList(ctx, projectService) {
  const projects = projectService.listProjects();
  if (!projects.length) {
    ctx.reply('Проектов пока нет.');
    return;
  }
  const lines = projects.map((p) => `• ${p.name} — ${p.link}`);
  ctx.reply(lines.join('\n'));
}

export function handleIssuedIds(ctx, projectService) {
  const projects = projectService.listProjects();
  if (!projects.length) {
    ctx.reply('Проектов пока нет.');
    return;
  }
  const lines = projects.map((p) => {
    if (!p.issued?.length) {
      return `• ${p.name}: выданных ID нет`;
    }
    const ids = p.issued
      .map((item) => `  - ${item.id} — ${item.activated ? 'активирован' : 'не активирован'}`)
      .join('\n');
    return `• ${p.name}:\n${ids}`;
  });
  ctx.reply(lines.join('\n'));
}

export function startCreateProject(ctx) {
  ctx.session.state = USER_STATES.ADMIN_CREATE_NAME;
  ctx.session.temp = {};
  ctx.reply('Введите название проекта или /cancel');
}

export function handleCreateName(ctx) {
  const name = (ctx.message?.text || '').trim();
  if (!name) return;
  ctx.session.temp = { name };
  ctx.session.state = USER_STATES.ADMIN_CREATE_LINK;
  ctx.reply('Введите ссылку на проект или /cancel');
}

export function handleCreateLink(ctx, projectService) {
  const link = (ctx.message?.text || '').trim();
  if (!link) return;
  const name = ctx.session.temp?.name;
  try {
    const project = projectService.createProject(name, link);
    ctx.reply(`Проект создан:\nНазвание: ${project.name}\nСсылка: ${project.link}`);
  } catch (error) {
    ctx.reply(`Ошибка: ${error.message}`);
  } finally {
    ctx.session.state = USER_STATES.NONE;
    ctx.session.temp = {};
  }
}

export function startEditProject(ctx, projectService) {
  const projects = projectService.listProjects();
  if (!projects.length) {
    ctx.reply('Проектов пока нет.');
    return;
  }
  ctx.reply('Выберите проект для редактирования:', {
    reply_markup: formatProjectsKeyboard(projects, callbacks.EDIT_SELECT)
  });
}

export function handleEditSelection(ctx) {
  const name = decodeURIComponent(ctx.callbackQuery.data.replace(callbacks.EDIT_SELECT, ''));
  ctx.session.temp = { projectName: name };
  ctx.session.state = USER_STATES.ADMIN_EDIT_CHOOSE;
  ctx.answerCbQuery();
  ctx.reply('Что редактировать?', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Целиком', callback_data: `${callbacks.EDIT_ACTION}full` },
          { text: 'Название', callback_data: `${callbacks.EDIT_ACTION}name` },
          { text: 'Ссылка', callback_data: `${callbacks.EDIT_ACTION}link` }
        ]
      ]
    }
  });
}

export function handleEditActionChoice(ctx) {
  const action = ctx.callbackQuery.data.replace(callbacks.EDIT_ACTION, '');
  ctx.answerCbQuery();
  switch (action) {
    case 'full':
      ctx.session.state = USER_STATES.ADMIN_EDIT_FULL_NAME;
      ctx.reply('Введите новое название или /cancel');
      break;
    case 'name':
      ctx.session.state = USER_STATES.ADMIN_EDIT_NAME;
      ctx.reply('Введите новое название или /cancel');
      break;
    case 'link':
      ctx.session.state = USER_STATES.ADMIN_EDIT_LINK;
      ctx.reply('Введите новую ссылку или /cancel');
      break;
    default:
      break;
  }
}

export function handleEditInput(ctx, projectService) {
  const text = (ctx.message?.text || '').trim();
  const projectName = ctx.session.temp?.projectName;
  if (!text || !projectName) return;

  try {
    if (ctx.session.state === USER_STATES.ADMIN_EDIT_NAME) {
      const updated = projectService.updateProject(projectName, { name: text });
      ctx.reply(`Название обновлено: ${updated.name}`);
      ctx.session.temp.projectName = text;
    } else if (ctx.session.state === USER_STATES.ADMIN_EDIT_LINK) {
      const updated = projectService.updateProject(projectName, { link: text });
      ctx.reply(`Ссылка обновлена: ${updated.link}`);
    } else if (ctx.session.state === USER_STATES.ADMIN_EDIT_FULL_NAME) {
      ctx.session.temp.newName = text;
      ctx.session.state = USER_STATES.ADMIN_EDIT_FULL_LINK;
      ctx.reply('Введите новую ссылку или /cancel');
      return;
    } else if (ctx.session.state === USER_STATES.ADMIN_EDIT_FULL_LINK) {
      const updated = projectService.updateProject(projectName, {
        name: ctx.session.temp.newName,
        link: text
      });
      ctx.reply(`Проект обновлён:\nНазвание: ${updated.name}\nСсылка: ${updated.link}`);
    }
  } catch (error) {
    ctx.reply(`Ошибка: ${error.message}`);
  } finally {
    ctx.session.state = USER_STATES.NONE;
    ctx.session.temp = {};
  }
}

export function startDeleteProject(ctx, projectService) {
  const projects = projectService.listProjects();
  if (!projects.length) {
    ctx.reply('Проектов пока нет.');
    return;
  }
  const names = projects.map((p) => `• ${p.name}`).join('\n');
  ctx.session.state = USER_STATES.ADMIN_DELETE_CONFIRM;
  ctx.reply(`Напишите название проекта для удаления или /cancel:\n${names}`);
}

export function handleDeleteFlow(ctx, projectService, bot) {
  const text = (ctx.message?.text || '').trim();
  if (!text) return;

  if (!ctx.session.temp?.deleteCandidate) {
    const project = projectService.getProjectByName(text);
    if (!project) {
      ctx.reply('Проект не найден. Попробуйте снова или /cancel');
      return;
    }
    ctx.session.temp = { deleteCandidate: text };
    ctx.reply(`Удалить проект «${text}»? Ответьте Да или Нет.`);
    return;
  }

  if (['да', 'yes', 'y'].includes(text.toLowerCase())) {
    try {
      const deleted = projectService.deleteProjectByName(ctx.session.temp.deleteCandidate);
      ctx.reply(`Проект «${deleted.name}» удалён.`);
      notifyAdmins(bot, ctx.from.id, deleted.name);
    } catch (error) {
      ctx.reply(`Ошибка: ${error.message}`);
    }
  } else {
    ctx.reply('Удаление отменено.');
  }

  ctx.session.state = USER_STATES.NONE;
  ctx.session.temp = {};
}

function notifyAdmins(bot, initiatorId, projectName) {
  ADMIN_IDS.forEach((adminId) => {
    bot.telegram
      .sendMessage(adminId, `Администратор ${initiatorId} удалил проект ${projectName}`)
      .catch(() => {});
  });
}

export function adminHelp(ctx) {
  ctx.reply(
    [
      'Доступные команды администратора:',
      '/get_id — показать первый свободный ID выбранного проекта;',
      '/users — список пользователей (логин, имя, дата, покупки);',
      '/projects — список проектов (название + ссылка);',
      '/issued_ids — список выданных ID (активирован/не активирован);',
      '/create_project — мастер создания проекта (название, ссылка, 30 ID);',
      '/edit_project — выбор проекта и редактирование названия/ссылки;',
      '/delete_project — удаление проекта с подтверждением;',
      '/set_reward_message — задать текст поздравительного сообщения;',
      '/cancel — прервать текущий шаг.',
      '/admin_panel — показать клавиатуру с командами.'
    ].join('\n')
  );
}

export const ADMIN_BUTTONS = {
  GET_ID: 'Получить ID',
  USERS: 'Пользователи',
  PROJECTS: 'Проекты',
  ISSUED: 'Выданные ID',
  CREATE: 'Создать проект',
  EDIT: 'Редактировать',
  DELETE: 'Удалить проект',
  REWARD_MESSAGE: 'Текст подарка',
  HELP: 'Справка',
  PANEL: 'Панель'
};

export function getAdminKeyboard() {
  return {
    keyboard: [
      [{ text: ADMIN_BUTTONS.GET_ID }, { text: ADMIN_BUTTONS.USERS }],
      [{ text: ADMIN_BUTTONS.PROJECTS }, { text: ADMIN_BUTTONS.ISSUED }],
      [{ text: ADMIN_BUTTONS.CREATE }, { text: ADMIN_BUTTONS.EDIT }],
      [{ text: ADMIN_BUTTONS.DELETE }, { text: ADMIN_BUTTONS.REWARD_MESSAGE }],
      [{ text: ADMIN_BUTTONS.HELP }, { text: ADMIN_BUTTONS.PANEL }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };
}

export function sendAdminPanel(ctx) {
  ctx.reply('Панель администратора:', {
    reply_markup: getAdminKeyboard()
  });
}

export function startSetRewardMessage(ctx) {
  ctx.session.state = USER_STATES.ADMIN_SET_REWARD_MESSAGE;
  ctx.reply('Введите новое поздравительное сообщение (можно использовать HTML) или /cancel');
}

export function handleSetRewardMessageInput(ctx, rewardService) {
  const text = (ctx.message?.text || '').trim();
  if (!text) return;
  rewardService.setRewardMessage(text);
  ctx.reply('Поздравительное сообщение сохранено.');
  ctx.session.state = USER_STATES.NONE;
  ctx.session.temp = {};
}
