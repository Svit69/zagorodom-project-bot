import { Telegraf, session } from 'telegraf';
import { BOT_TOKEN, DB_PATH, ADMIN_IDS } from './config.js';
import Database from './services/Database.js';
import UserService from './services/UserService.js';
import ProjectService from './services/ProjectService.js';
import { USER_STATES } from './constants.js';
import {
  callbacks,
  adminHelp,
  handleCreateLink,
  handleCreateName,
  handleDeleteFlow,
  handleEditActionChoice,
  handleEditInput,
  handleEditSelection,
  handleGetIdCommand,
  handleGetIdSelection,
  handleUsersList,
  handleProjectsList,
  isAdmin,
  sendAdminPanel,
  startCreateProject,
  startDeleteProject,
  startEditProject
} from './handlers/adminFlow.js';
import {
  consentStep,
  handleConsentNo,
  handleConsentYes,
  handleProjectIdInput,
  startFlow
} from './handlers/userFlow.js';

if (!BOT_TOKEN) {
  throw new Error('Не задан BOT_TOKEN. Укажите его в .env или переменной окружения.');
}

const bot = new Telegraf(BOT_TOKEN);
const db = new Database(DB_PATH);
const userService = new UserService(db);
const projectService = new ProjectService(db);

bot.use(
  session({
    defaultSession: () => ({ state: USER_STATES.NONE, temp: {} })
  })
);

bot.start((ctx) => {
  startFlow(ctx);
  if (isAdmin(ctx)) {
    sendAdminPanel(ctx);
  }
});

bot.command('cancel', (ctx) => {
  ctx.session.state = USER_STATES.NONE;
  ctx.session.temp = {};
  ctx.reply('Действие отменено.', { reply_markup: { remove_keyboard: true } });
});

bot.command('get_id', (ctx) => {
  if (!isAdmin(ctx)) return;
  handleGetIdCommand(ctx, projectService);
});

bot.command('users', (ctx) => {
  if (!isAdmin(ctx)) return;
  handleUsersList(ctx, userService);
});

bot.command('projects', (ctx) => {
  if (!isAdmin(ctx)) return;
  handleProjectsList(ctx, projectService);
});

bot.command('create_project', (ctx) => {
  if (!isAdmin(ctx)) return;
  startCreateProject(ctx);
});

bot.command('edit_project', (ctx) => {
  if (!isAdmin(ctx)) return;
  startEditProject(ctx, projectService);
});

bot.command('delete_project', (ctx) => {
  if (!isAdmin(ctx)) return;
  startDeleteProject(ctx, projectService);
});

bot.command('admin_help', (ctx) => {
  if (!isAdmin(ctx)) return;
  adminHelp(ctx);
  sendAdminPanel(ctx);
});

bot.command('admin_panel', (ctx) => {
  if (!isAdmin(ctx)) return;
  sendAdminPanel(ctx);
});

bot.on('callback_query', (ctx) => {
  const data = ctx.callbackQuery?.data || '';
  if (data === 'consent_accept') {
    ctx.answerCbQuery();
    handleConsentYes(ctx, userService);
  } else if (data === 'consent_decline') {
    ctx.answerCbQuery();
    handleConsentNo(ctx);
  } else if (data.startsWith(callbacks.GET_ID)) {
    handleGetIdSelection(ctx, projectService);
  } else if (data.startsWith(callbacks.EDIT_SELECT)) {
    handleEditSelection(ctx);
  } else if (data.startsWith(callbacks.EDIT_ACTION)) {
    handleEditActionChoice(ctx);
  }
});

bot.hears('Старт', (ctx) => {
  consentStep(ctx);
});

bot.on('text', (ctx) => {
  const state = ctx.session.state;
  // Admin flows
  if (isAdmin(ctx)) {
    switch (state) {
      case USER_STATES.ADMIN_CREATE_NAME:
        return handleCreateName(ctx);
      case USER_STATES.ADMIN_CREATE_LINK:
        return handleCreateLink(ctx, projectService);
      case USER_STATES.ADMIN_EDIT_NAME:
      case USER_STATES.ADMIN_EDIT_LINK:
      case USER_STATES.ADMIN_EDIT_FULL_NAME:
      case USER_STATES.ADMIN_EDIT_FULL_LINK:
        return handleEditInput(ctx, projectService);
      case USER_STATES.ADMIN_DELETE_CONFIRM:
        return handleDeleteFlow(ctx, projectService, bot);
      default:
        break;
    }
  }

  // User flow
  if (state === USER_STATES.AWAITING_PROJECT_ID) {
    handleProjectIdInput(ctx, projectService, userService);
  }
});

bot.launch().then(() => {
  console.log('Bot is running');
  console.log('Admins:', ADMIN_IDS.join(', '));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
