// Lightweight handlers module with dependency injection to keep bot.js thin
// CommonJS export to match bot.js require style

function createBotHandlers(ctx) {
  const {
    bot,
    __seen,
    makeTextCommandKey,
    makeCallbackKey,
    makeMessageKey,
    userSessions,
    userStates,
    checkUserRegistration,
    getRoleOrRegisterNotice,
    requireRole,
    showHelpByRole,
    startCreateOrder,
    showMyOrders,
    showProgressMenu,
    showEvidenceMenu,
    handleCallbackQuery,
    handleMediaGroup,
    handleOrderSearch,
    handleEvidenceUploadFlow,
    handleSessionInput,
    getUserRole
  } = ctx;

  async function handleStartCommand(msg) {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name || 'User';
    const telegramId = msg.from.id.toString();

    const key = makeTextCommandKey(chatId, msg.message_id, '/start');
    if (__seen(key)) {
      console.log('🔁 Duplicate /start detected, ignoring:', key);
      return;
    }

    console.log(`📨 Received /start from ${firstName} (${chatId})`);

    // Clear any existing session
    userSessions.delete(chatId);

    // Immediate ack so user sees bot is alive
    try {
      const ackMap = (globalThis.__lastStartAckByChat || (globalThis.__lastStartAckByChat = new Map()));
      const lastTs = ackMap.get(chatId) || 0;
      const now = Date.now();
      if (now - lastTs > 10000) {
        await bot.sendMessage(chatId, '👋 Bot aktif. Memproses /start...');
        ackMap.set(chatId, now);
        console.log(`✅ Sent /start ack to chat ${chatId}`);
      } else {
        console.log(`⏱️ Skipping duplicate /start ack for chat ${chatId}`);
      }
    } catch (e) {
      console.warn('Failed to send immediate /start ack from handler:', e);
    }

    await checkUserRegistration(chatId, telegramId, firstName, msg.from.last_name || '', true);
  }

  async function handleHelpCommand(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();

    const key = makeTextCommandKey(chatId, msg.message_id, '/help');
    if (__seen(key)) {
      console.log('🔁 Duplicate /help detected, ignoring:', key);
      return;
    }

    console.log(`📨 Received /help from ${msg.from.first_name} (${chatId})`);

    const role = await getRoleOrRegisterNotice(chatId, telegramId);
    if (role) {
      showHelpByRole(chatId, role);
    }
  }

  async function handleOrderCommand(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();

    const key = makeTextCommandKey(chatId, msg.message_id, '/order');
    if (__seen(key)) {
      console.log('🔁 Duplicate /order detected, ignoring:', key);
      return;
    }

    console.log(`📨 Received /order from ${msg.from.first_name} (${chatId})`);

    const allowed = await requireRole(chatId, telegramId, 'HD', '❌ Hanya Helpdesk yang dapat membuat order.');
    if (allowed) {
      startCreateOrder(chatId, telegramId);
    }
  }

  async function handleMyOrdersCommand(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();

    const key = makeTextCommandKey(chatId, msg.message_id, '/myorders');
    if (__seen(key)) {
      console.log('🔁 Duplicate /myorders detected, ignoring:', key);
      return;
    }

    console.log(`📨 Received /myorders from ${msg.from.first_name} (${chatId})`);

    const role = await getRoleOrRegisterNotice(chatId, telegramId);
    if (role) {
      showMyOrders(chatId, telegramId, role);
    }
  }

  async function handleProgressCommand(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();

    const key = makeTextCommandKey(chatId, msg.message_id, '/progress');
    if (__seen(key)) {
      console.log('🔁 Duplicate /progress detected, ignoring:', key);
      return;
    }

    console.log(`📨 Received /progress from ${msg.from.first_name} (${chatId})`);

    const allowed = await requireRole(chatId, telegramId, 'TEKNISI', '❌ Hanya Teknisi yang dapat update progress.');
    if (allowed) {
      showProgressMenu(chatId, telegramId);
    }
  }

  async function handleEvidenceCommand(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();

    const key = makeTextCommandKey(chatId, msg.message_id, '/evidence');
    if (__seen(key)) {
      console.log('🔁 Duplicate /evidence detected, ignoring:', key);
      return;
    }

    console.log(`📨 Received /evidence from ${msg.from.first_name} (${chatId})`);

    const allowed = await requireRole(chatId, telegramId, 'TEKNISI', '❌ Hanya Teknisi yang dapat upload evidence.');
    if (allowed) {
      showEvidenceMenu(chatId, telegramId);
    }
  }

  function handleCallbackEntry(callbackQuery) {
    const key = makeCallbackKey(callbackQuery.id);
    if (__seen(key)) {
      console.log('🔁 Duplicate callback detected, ignoring:', key);
      return;
    }

    console.log(`📨 Received callback: ${callbackQuery.data} from ${callbackQuery.from.first_name}`);
    handleCallbackQuery(callbackQuery);
  }

  function handlePhotoUpload(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    console.log(`📨 Received photo from ${msg.from.first_name} (${chatId})`);

    if (msg.media_group_id) {
      handleMediaGroup(msg, telegramId);
    } else {
      // Single photo
      // This relies on handleSinglePhoto in the main code; if needed, you can
      // expose it through context similarly. For now, re-use existing behavior via session flow.
      const session = userSessions.get(chatId);
      if (session && session.step === 'photos') {
        // For single photo path, we can defer to existing single-photo handler in bot.js
        // to avoid duplicating code here.
        // Note: Keep existing behavior by leaving single photo handling in bot.js.
      }
    }
  }

  async function handleIncomingMessage(msg) {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id.toString();
    const text = msg.text;

    const msgKey = makeMessageKey(chatId, msg.message_id);
    if (__seen(msgKey)) {
      console.log('🔁 Duplicate message detected, ignoring:', msgKey);
      return;
    }

    console.log(`📨 Received message: "${text}" from ${telegramId}`);
    console.log(`🔍 Current userStates for ${telegramId}:`, userStates[telegramId]);

    if (text && text.startsWith('/')) return;

    if (userStates[telegramId] && userStates[telegramId].state === 'waiting_order_id_search') {
      console.log(`🎯 Handling order search for: ${text}`);
      await handleOrderSearch(chatId, telegramId, text);
      return;
    }

    const session = userSessions.get(chatId);
    if (session) {
      if (session.type === 'evidence_upload') {
        await handleEvidenceUploadFlow(chatId, telegramId, text, msg, session);
        return;
      }
      await handleSessionInput(chatId, telegramId, text, msg, session);
      return;
    }

    if (text && !text.startsWith('/')) {
      const role = await getUserRole(telegramId);
      if (role) {
        await handleReplyKeyboardButtons(chatId, telegramId, text, role);
        return;
      } else {
        await checkUserRegistration(chatId, telegramId, msg.from.first_name || 'User', msg.from.last_name || '', false);
        return;
      }
    }
  }

  function handleBotError(error) {
    console.error('❌ Bot error:', error);
  }

  function handlePollingError(error) {
    console.error('❌ Polling error:', error);
  }

  return {
    handleStartCommand,
    handleHelpCommand,
    handleOrderCommand,
    handleMyOrdersCommand,
    handleProgressCommand,
    handleEvidenceCommand,
    handleCallbackEntry,
    handlePhotoUpload,
    handleIncomingMessage,
    handleBotError,
    handlePollingError
  };
}

module.exports = { createBotHandlers };