var Chat = require('./src/chat.js');

var params = {
  socketAddress: "ws://172.16.106.26:8003/ws", // {**REQUIRED**} Socket Address
  ssoHost: "172.16.110.76", // {**REQUIRED**} Socket Address
  ssoGrantDevicesAddress: "/oauth2/grants/devices", // {**REQUIRED**} Socket Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  // token: "7cba09ff83554fc98726430c30afcfc6", // {**REQUIRED**} SSO Token ZiZi
  token: "f53f39a1893e4c4da18e59822290a552", // {**REQUIRED**} SSO Token JiJi
  // token: "1fcecc269a8949d6b58312cab66a4926",  //{**REQUIRED**} SSO Token FiFi
  // token: "e4f1d5da7b254d9381d0487387eabb0a", //  {**REQUIRED**} SSO Token Felfeli
  // token: "bebc31c4ead6458c90b607496dae25c6",   {**REQUIRED**} SSO Token Alexi
  wsConnectionWaitTime: 500, // Time out to wait for socket to get ready after open
  connectionRetryInterval: 5000, // Time interval to retry registering device or registering server
  connectionCheckTimeout: 10000, // Socket connection live time on server
  connectionCheckTimeoutThreshold: 2000, // Socket Ping time threshold
  messageTtl: 10000, // Message time to live
  reconnectOnClose: true, // auto connect to socket after socket close
  asyncLogging: {
    onFunction: true, // log main actions on console
    onMessageReceive: true, // log received messages on console
    onMessageSend: true // log sent messaged on console
  },
  chatLogging: true,
  chatLogFile: "errors.log",
  chatLogLevel: 'verbose'
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
   * @param count
   */
  // getThreads(10);

  /**
   * GET THREAD PARTICIPANTS
   */
  // getThreadParticipants(312);

  /**
   * GET THREAD HISTORY
   * @param threadId
   * @param count
   * @param offset
   */
  // getHistory(293, 5, 0);

  /**
   * GET SINGLE MESSAGE
   * @param threadId
   * @param messageId
   */
  // getSingleMessage(293, 2551);

  /**
   * MUTE THREAD
   * @param threadId
   */
  // muteThread(293);

  /**
   * UNMUTE THREAD
   * @param threadId
   */
  // unMuteThread(293);

  /**
   * GET CONTACTS
   */
  // getContacts();

  /**
   * CREATE THREAD (Creates Group)
   * @param invitees
   * @param threadType
   */
  // createThread([568, 563], "NORMAL");

  /**
   * CREATE THREAD (Creates P2P Chat with a specific user)
   * @param contactId
   */
  // createThread(563);

  /**
   * RENAME THREAD
   * @param threadId
   */
  // renameThread(312, "New Thread Name");

  /**
   * SEND MESSAGE IN THREAD
   * @param threadId
   * @param newMessage
   */
  // sendMessage(351, "This is a Sample Message at " + new Date());

  /**
   * EDIT MESSAGE IN THREAD
   * @param messageId  325 editable: false
   * @param newMessage
   */
  // editMessage(2551, "This message has been edited at " + new Date());

  /**
   * REPLY TO MESSAGE
   * @param threadId
   * @param messageId
   */
  // replyMessage(293, 2551, "This is a reply to message #413 at " + new Date());

  /**
   * REPLY TO MESSAGE
   * @param destination
   * @param uniqueIds
   * @param messagesId
   */
  // forwardMessage(293, [
  //   "f4647fdf-3db4-40c8-a038-bd87fdb084d0", "3d7b3b61-67d7-4a80-c63c-a4b4f9c3411a", "e51949d5-e2fd-4072-9f37-0fee797b9083"
  // ], [2539, 2538, 2537]);
});

/**
* Listen to Error Messages
*/
chatAgent.on("error", function(error) {
  console.log("Error: ");
  console.log(error.code, error.message, error.error);
});

/**
* Listen to Chat State Changes
*/
chatAgent.on("chatState", function(chatState) {
  // console.log("Current Chat state is", chatState);
});

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
    ownerID: msg.ownerId
  };

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

/**
 * Listen to Thread Info Update
 */
chatAgent.on("threadInfoUpdated", function(threadInfo) {
  console.log("Some Thread has changed!");
  console.log(threadInfo);
});

/**
 * Listen to Thread Rename
 */
chatAgent.on("threadRename", function(threadInfo) {
  console.log("Some Thread has renamed!");
  console.log(threadInfo);
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

  chatAgent.getHistory(getSingleMessageParams, function(historyResult) {
    if (!historyResult.hasError) {
      console.log(historyResult.result.history);
    }
  });
}

function getHistory(threadId, count, offset) {
  var getHistoryParams = {
    offset: 0,
    threadId: threadId
  };

  if (typeof count == "number") {
    getHistoryParams.count = count;
  }

  if (typeof offset == "number") {
    getHistoryParams.offset = offset;
  }

  chatAgent.getHistory(getHistoryParams, function(historyResult) {
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

  chatAgent.sendTextMessage(sendChatParams, {
    onSent: function(result) {
      console.log(result.uniqueId + " \t has been Sent!");
    },
    onDeliver: function(result) {
      console.log(result.uniqueId + " \t has been Delivered!");
    },
    onSeen: function(result) {
      console.log(result.uniqueId + " \t has been Seen!");
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
      console.log(result.uniqueId + " \t has been Sent! (Reply)");
    },
    onDeliver: function(result) {
      console.log(result.uniqueId + " \t has been Delivered! (Reply)");
    },
    onSeen: function(result) {
      console.log(result.uniqueId + " \t has been Seen! (Reply)");
    }
  });
}

function forwardMessage(destination, uniqueIds, messagesId) {
  forwardChatParams = {
    subjectId: destination,
    uniqueId: JSON.stringify(uniqueIds),
    content: JSON.stringify(messagesId)
  };

  chatAgent.forwardMessage(forwardChatParams, {
    onSent: function(result) {
      console.log(result.uniqueId + " \t has been Sent! (FORWARD)");
    },
    onDeliver: function(result) {
      console.log(result.uniqueId + " \t has been Delivered! (FORWARD)");
    },
    onSeen: function(result) {
      console.log(result.uniqueId + " \t has been Seen! (FORWARD)");
    }
  });
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

function renameThread(threadId, newName) {
  renameThreadParams = {
    title: newName,
    threadId: threadId
  };

  chatAgent.renameThread(renameThreadParams, function(renameThreadResult) {
    console.log(renameThreadResult);
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
