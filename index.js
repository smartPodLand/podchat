var Chat = require('./src/chat.js');

var params = {
  socketAddress: "ws://172.16.106.26:8003/ws", // {**REQUIRED**} Socket Address
  ssoHost: "172.16.110.76", // {**REQUIRED**} Socket Address
  ssoGrantDevicesAddress: "/oauth2/grants/devices", // {**REQUIRED**} Socket Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  token: "c0866c4cc5274ea7ada6b01575b19d24", // {**REQUIRED**} SSO Token Zamani
  // token: "afa51d8291dc4072a0831d3a18cb5030",  {**REQUIRED**} SSO Token Barzegar
  // token: "ed4be26a60c24ed594e266a2181424c5",   {**REQUIRED**} SSO Token Abedi
  // token: "e4f1d5da7b254d9381d0487387eabb0a",   {**REQUIRED**} SSO Token Felfeli
  // token: "bebc31c4ead6458c90b607496dae25c6",   {**REQUIRED**} SSO Token Alexi
  wsConnectionWaitTime: 500, // Time out to wait for socket to get ready after open
  connectionRetryInterval: 5000, // Time interval to retry registering device or registering server
  connectionCheckTimeout: 90000, // Socket connection live time on server
  connectionCheckTimeoutThreshold: 20000, // Socket Ping time threshold
  messageTtl: 5000, // Message time to live
  reconnectOnClose: true, // auto connect to socket after socket close
  asyncLogging: {
    onFunction: true, // log main actions on console
    onMessageReceive: true, // log received messages on console
    onMessageSend: true // log sent messaged on console
  }
};

var PID;

var chatAgent = new Chat(params);

/**
* Listen to Error Messages
*/
chatAgent.on("error", function(error) {
  console.log("Error: ");
  console.log(error.code, error.message);
});

chatAgent.on("chatReady", function() {
  /**
   *  Get User Info
   */
  // getUserInfo();

  /**
   * GET THREADS
   * @param count
   */
  // getThreads(10);

  /**
   * GET THREAD PARTICIPANTS
   */
  // getThreadParticipants(83);

  /**
   * GET THREAD HISTORY
   * @param threadId
   * @param count
   * @param offset
   */
  // getThreadHistory(83, 5, 0);

  /**
   * GET SINGLE MESSAGE
   * @param threadId
   * @param messageId
   */
  // getSingleMessage(83, 696);

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
   * @param invitees
   * @param threadType
   */
  // createThread([323, 443], "NORMAL");

  /**
   * CREATE THREAD (Creates P2P Chat with a specific user)
   */
  // createThread(443);

  /**
   * SEND MESSAGE IN THREAD
   */
  // sendMessage(83, "This is a Sample Message at " + new Date());

  /**
   * EDIT MESSAGE IN THREAD
   * @param messageId  325 editable: false
   * @param newMessage
   */
  // editMessage(696, "This message has been edited at " + new Date());

  /**
   * REPLY TO MESSAGE
   * @param threadId
   * @param messageId
   */
  // replyMessage(83, 413, "This is a reply to message #413 at " + new Date());

  /**
   * REPLY TO MESSAGE
   * @param destination
   * @param uniqueIds
   * @param messagesId
   */
  // forwardMessage(174, ["c1561f36-3b46-422c-a5b2-ec1f044d222e", "3276dbea-33b2-4753-e29e-f1fc4640e1ab"], [486, 485]);

  /**
   * Listen to Edit Message Emitter
   */
  chatAgent.on("editMessage", function(msg) {
    console.log("Message with ID : " + msg.id + " inside Thread with ID : " + msg.threadId + " has been edited!");
    console.log(msg);
  });

  /**
   * Listen to Receive Message Emitter
   */
  chatAgent.on("message", function(msg) {
    var params = {
      messageId: msg.id,
      owner: msg.ownerId
    };

    console.log(msg);

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

function getThreads(count) {
  var getThreadsParams = {
    count: 50,
    offset: 0
  };

  if (typeof count == "number") {
    getThreadsParams.count = count;
  }

  chatAgent.getThreads(getThreadsParams, function(threadsResult) {
    if (!threadsResult.hasError) {
      var threadsCount = threadsResult.result.contentCount;
      var threads = threadsResult.result.threads;
      console.log(threads);
    }
  });
}

function getThreadParticipants(threadId) {
  var getParticipantsParams = {
    count: 50,
    offset: 0,
    threadId: threadId
  };

  chatAgent.getThreadParticipants(getParticipantsParams, function(participantsResult) {
    if (!participantsResult.hasError) {
      var participantsCount = participantsResult.result.contentCount;
      var participants = participantsResult.result.participants;
      console.log(participants);
    }
  });
}

function getContacts() {
  var getContactsParams = {
    count: 50,
    offset: 0
  };

  chatAgent.getContacts(getContactsParams, function(contactsResult) {
    if (!contactsResult.hasError) {
      var contactsCount = contactsResult.result.contentCount;
      var contacts = contactsResult.result.contacts;
      console.log(contacts);
    }
  });
}

function getSingleMessage(threadId, messageId) {
  var getSingleMessageParams = {
    offset: 0,
    threadId: threadId,
    id: messageId
  };

  chatAgent.getThreadHistory(getSingleMessageParams, function(historyResult) {
    if (!historyResult.hasError) {
      console.log(historyResult.result.history);
    }
  });
}

function getThreadHistory(threadId, count, offset) {
  var getThreadHistoryParams = {
    offset: 0,
    threadId: threadId
  };

  if (typeof count == "number") {
    getThreadHistoryParams.count = count;
  }

  if (typeof offset == "number") {
    getThreadHistoryParams.offset = offset;
  }

  chatAgent.getThreadHistory(getThreadHistoryParams, function(historyResult) {
    if (!historyResult.hasError) {
      console.log(historyResult.result.history);
    }
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

  chatAgent.editMessage(editChatParams, function(result) {
    console.log(result);
  });
}

function replyMessage(threadId, messageId, message) {
  replyChatParams = {
    threadId: threadId,
    repliedTo: messageId,
    content: message
  };

  chatAgent.replyMessage(replyChatParams, {
    onSent: function(result) {
      console.log("\nYour reply message has been Sent!\n");
      console.log(result);
    },
    onDeliver: function(result) {
      console.log("\nYour reply message has been Delivered!\n");
      console.log(result);
    },
    onSeen: function(result) {
      console.log("\nYour reply message has been Seen!\n");
      console.log(result);
    }
  });
}

function forwardMessage(destination, uniqueIds, messagesId) {
  forwardChatParams = {
    subjectId: destination,
    uniqueId: JSON.stringify(uniqueIds),
    content: JSON.stringify(messagesId)
  };

  chatAgent.forwardMessage(forwardChatParams);
}

function createThread(invitees, threadType) {
  if (typeof threadType == "string") {
    threadTypeText = threadType;
  } else {
    threadTypeText = "NORMAL";
  }

  createThreadParams = {
    title: "Thread Title Sample",
    type: threadTypeText,
    invitees: []
  };

  if (Array.isArray(invitees)) {
    for (var i = 0; i < invitees.length; i++) {
      invitee = formatDataToMakeInvitee({id: invitees[i]});
      if (invitee) {
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
    if (!result.hasError)
      console.log("Threaded has been successfully muted!");
    console.log(result);
  });
}

function unMuteThread(threadId) {
  var data = {
    subjectId: threadId
  }
  chatAgent.unMuteThread(data, function(result) {
    if (!result.hasError)
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
