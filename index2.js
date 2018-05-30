var Chat = require('./src/chat.js');

var params = {
  socketAddress: "ws://172.16.106.26:8003/ws", // {**REQUIRED**} Socket Address
  ssoHost: "172.16.110.76", // {**REQUIRED**} Socket Address
  ssoGrantDevicesAddress: "/oauth2/grants/devices", // {**REQUIRED**} Socket Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  // token: "c0866c4cc5274ea7ada6b01575b19d24",  {**REQUIRED**} SSO Token Zamani
  token: "afa51d8291dc4072a0831d3a18cb5030", // {**REQUIRED**} SSO Token Barzegar
  // token: "ed4be26a60c24ed594e266a2181424c5",    {**REQUIRED**} SSO Token Abedi
  // token: "e4f1d5da7b254d9381d0487387eabb0a",   {**REQUIRED**} SSO Token Felfeli
  // token: "bebc31c4ead6458c90b607496dae25c6",   {**REQUIRED**} SSO Token Alexi
  wsConnectionWaitTime: 500, // Time out to wait for socket to get ready after open
  connectionRetryInterval: 5000, // Time interval to retry registering device or registering server
  connectionCheckTimeout: 90000, // Socket connection live time on server
  connectionCheckTimeoutThreshold: 20000, // Socket Ping time threshold
  messageTtl: 5000, // Message time to live
  reconnectOnClose: true, // auto connect to socket after socket close
  consoleLogging: {
    onFunction: true, // log main actions on console
    onMessageReceive: true, // log received messages on console
    onMessageSend: true // log sent messaged on console
  }
};

var PID;

var chatAgent = new Chat(params);

chatAgent.on("chatReady", function() {
  /**
   *  Get User Info
   */
  // getUserInfo();

  /**
   * GET THREADS
   */
  // getThreads();

  /**
   * GET THREAD HISTORY
   */
  // getThreadHistory(83);

  /**
   * MUTE THREAD
   */
  // muteThread(83);

  /**
   * UNMUTE THREAD
   */
  // unMuteThread(83);

  /**
   * GET CONTACTS
   */
  // getContacts();

  /**
   * CREATE THREAD (Creates Group)
   */
  // createThread([401, 324]);

  /**
   * CREATE THREAD (Creates P2P Chat with a specific user)
   */
  // createThread(443);

  /**
   * SEND MESSAGE IN THREAD
   */
  // sendMessage(83, "This is a Sample Message at " + new Date());

  /**
   * SEND MESSAGE IN THREAD
   */
  // editMessage(308, "This message has been edited at " + new Date());

  /**
   * Listen to Edit Message Emitter
   */
  chatAgent.on("editMessage", function(msg) {
    console.log("Message with ID : " + msg.messageId + " inside Thread with ID : " + msg.threadId + " has been edited!");
    console.log(msg);
  });

  /**
   * Listen to Receive Message Emitter
   */
  chatAgent.on("message", function(msg) {
    var params = {
      messageId: msg.messageId,
      owner: msg.owner
    };

    /**
     * Sending Message Delivery to Sender
     */
    chatAgent.deliver(params);

    /**
     * Sending Message Seen to Sender after 5sec
     */
    setTimeout(function() {
      chatAgent.seen(params);
    }, 5000);
  });

  /**
   * Listen to New Thread Creation
   */
   chatAgent.on("newThread", function(threadInfo) {
     console.log("New Thread Has Been Created with You Taking Part in it!");
     console.log(threadInfo);
   });
});

function getUserInfo() {
  chatAgent.getUserInfo(function(userInfo) {
    console.log(userInfo);
  });
}

function getThreads() {
  var getThreadsParams = {
    count: 50,
    offset: 0
  };

  chatAgent.getThreads(getThreadsParams, function(threadsResult) {
    var threads = threadsResult.result.threads;
    console.log(threads);
  });
}

function getContacts() {
  var getContactsParams = {
    count: 50,
    offset: 0
  };

  chatAgent.getContacts(getContactsParams, function(contactsResult) {
    var contacts = contactsResult.result.contacts;
    console.log(contacts);
  });
}

function getThreadHistory(threadId) {
  var getThreadHistoryParams = {
    count: 50,
    offset: 0,
    threadId: threadId
  };
  chatAgent.getThreadHistory(getThreadHistoryParams, function(historyResult) {
    var history = historyResult.result.history;
    console.log(history);
  });
}

function sendMessage(threadId, message) {
  sendChatParams = {
    threadId: threadId,
    content: message
  };

  chatAgent.send(sendChatParams, {
    onSent: function(result) {
      console.log("\nYour message has been Sent!\n");
      console.log(result);
    },
    onDeliver: function(result) {
      console.log("\nYour message has been Delivered!\n");
      console.log(result);
    },
    onSeen: function(result) {
      console.log("\nYour message has been Seen!\n");
      console.log(result);
    }
  });
}

function editMessage(messageId, newMessage) {
  editChatParams = {
    messageId: messageId,
    content: newMessage
  };

  chatAgent.editMessage(editChatParams);
}

function createThread(invitees) {
  createThreadParams = {
    title: "Thread Title Sample",
    type: "NORMAL",
    invitees: []
  };

  if (Array.isArray(invitees)) {
    for (var i = 0; i < invitees.length; i++) {
      invitee = formatDataToMakeInvitee({id: invitees[i]});
      if (invitee) {
        console.log(invitee);
        createThreadParams.invitees.push(invitee);
      }
    }
  } else {
    invitee = formatDataToMakeInvitee({id: invitees});
    if (invitee) {
      createThreadParams.invitees.push(invitee);
    }
  }

  chatAgent.createThread(createThreadParams, function(createThreadResult) {
    console.log(createThreadResult);
  });
}

function muteThread(threadId) {
  var data = {
    subjectId: threadId
  }
  chatAgent.muteThread(data, function(result) {
    console.log("Threaded has been successfully muted!");
    console.log(result);
  });
}

function unMuteThread(threadId) {
  var data = {
    subjectId: threadId
  }
  chatAgent.unMuteThread(data, function(result) {
    console.log("Threaded has been successfully unMuted!");
    console.log(result);
  });
}

function formatDataToMakeInvitee(messageContent) {
  var inviteeData = {
    id: messageContent.id,
    idType: "TO_BE_USER_CONTACT_ID"
  };

  return inviteeData;
}
