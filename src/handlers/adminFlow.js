import { USER_STATES } from '../constants.js';
import { ADMIN_IDS } from '../config.js';

const callbackPrefixes = {
  GET_ID: 'getid:',
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
    reply_markup: formatProjectsKeyboard(projects, callbackPrefixes.GET_ID)
  });
}

export function handleGetIdSelection(ctx, projectService) {
  const name = decodeURIComponent(ctx.callbackQuery.data.replace(callbackPrefixes.GET_ID, ''));
  const project = projectService.getProjectByName(name);
  if (!project) {
    ctx.answerCbQuery('Проект не найден');
    return;
  }
  const firstId = project.ids[0];
  ctx.answerCbQuery();
  ctx.reply(firstId ? `Первый свободный ID: ${firstId}` : 'Свободных ID нет');
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
  ctx.reply('Введите ссылку на диск или /cancel');
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
    reply_markup: formatProjectsKeyboard(projects, callbackPrefixes.EDIT_SELECT)
  });
}

export function handleEditSelection(ctx) {
  const name = decodeURIComponent(ctx.callbackQuery.data.replace(callbackPrefixes.EDIT_SELECT, ''));
  ctx.session.temp = { projectName: name };
  ctx.session.state = USER_STATES.ADMIN_EDIT_CHOOSE;
  ctx.answerCbQuery();
  ctx.reply('Что редактировать?', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Целиком', callback_data: `${callbackPrefixes.EDIT_ACTION}full` },
          { text: 'Название', callback_data: `${callbackPrefixes.EDIT_ACTION}name` },
          { text: 'Ссылка', callback_data: `${callbackPrefixes.EDIT_ACTION}link` }
        ]
      ]
    }
  });
}

export function handleEditActionChoice(ctx) {
  const action = ctx.callbackQuery.data.replace(callbackPrefixes.EDIT_ACTION, '');
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
      const updates = { name: ctx.session.temp.newName, link: text };
      const updated = projectService.updateProject(projectName, updates);
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
    bot.telegram.sendMessage(
      adminId,
      `Администратор ${initiatorId} удалил проект ${projectName}`
    ).catch(() => {});
  });
}

export const callbacks = callbackPrefixes;

export function adminHelp(ctx) {
  ctx.reply(
    [
      'Доступные команды администратора:',
      '/get_id — показать первый свободный ID выбранного проекта;',
      '/users — список пользователей (логин, имя, дата, покупки);',
      '/create_project — мастер создания проекта (название, ссылка, 30 ID);',
      '/edit_project — выбор проекта и редактирование названия/ссылки;',
      '/delete_project — удаление проекта с подтверждением;',
      '/cancel — прервать текущий шаг.',
      '/admin_panel — показать клавиатуру с командами.'
    ].join('\n')
  );
}

export const ADMIN_BUTTONS = {
  GET_ID: 'Получить ID',
  USERS: 'Пользователи',
  PROJECTS: 'Проекты',
  CREATE: 'Создать проект',
  EDIT: 'Редактировать',
  DELETE: 'Удалить проект',
  HELP: 'Справка',
  PANEL: 'Панель'
};

export function getAdminKeyboard() {
  return {
    keyboard: [
      [{ text: ADMIN_BUTTONS.GET_ID }, { text: ADMIN_BUTTONS.USERS }],
      [{ text: ADMIN_BUTTONS.PROJECTS }, { text: ADMIN_BUTTONS.CREATE }],
      [{ text: ADMIN_BUTTONS.EDIT }, { text: ADMIN_BUTTONS.DELETE }],
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
