const EventEmitter = require('events');

class InboxEmitter extends EventEmitter {}

const inboxEvents = new InboxEmitter();
inboxEvents.setMaxListeners(100);

module.exports = inboxEvents;
