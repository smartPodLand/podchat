var Chat = require('./src/chat.js');

var params = {
  socketAddress: "ws://172.16.106.26:8003/ws", // {**REQUIRED**} Socket Address
  ssoHost: "http://172.16.110.76", // {**REQUIRED**} Socket Address
  ssoGrantDevicesAddress: "/oauth2/grants/devices", // {**REQUIRED**} Socket Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  token: "f53f39a1893e4c4da18e59822290a552", //  {**REQUIRED**} SSO Token JiJi
  wsConnectionWaitTime: 500, // Time out to wait for socket to get ready after open
  connectionRetryInterval: 5000, // Time interval to retry registering device or registering server
  connectionCheckTimeout: 10000, // Socket connection live time on server
  messageTtl: 10000, // Message time to live
  reconnectOnClose: true, // auto connect to socket after socket close
  asyncLogging: {
    onFunction: true, // log main actions on console
    onMessageReceive: true, // log received messages on console
    onMessageSend: true // log sent messaged on console
  }
};

var PID;

var chatAgent = new Chat(params);

chatAgent.on("chatReady", function() {

  /*******************************************************
   *                       U S E R                       *
   *******************************************************/

  /**
   *  Get User Info
   */
  // getUserInfo();


  /*******************************************************
   *                    T H R E A D S                    *
   *******************************************************/

  /**
   * GET THREADS
   * @param count
   * @param offset
   * @param threadIds
   * @param name
   */
  // getThreads({
  //   count: 50,
  //   offset: 0,
  //    threadIds: [312],
  //    name: "jiji"
  // });

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
   * GET THREAD PARTICIPANTS
   * @param threadId
   */
  // getThreadParticipants(312);

  /**
   * GET THREAD HISTORY
   * @param threadId
   * @param count
   * @param offset
   */
  // getHistory(293, 4, 0);

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
  // muteThread(392);

  /**
   * UNMUTE THREAD
   * @param threadId
   */
  // unMuteThread(392);

  /**
   * RENAME THREAD
   * @param threadId
   */
  // renameThread(392, "Thread Name Changed at " + new Date());


  /*******************************************************
   *                   C O N T A C T S                   *
   *******************************************************/

  /**
   * GET CONTACTS
   */
  getContacts();

  /**
   * ADD CONTACTS
   * @param firstName
   * @param lastName
   * @param cellphoneNumber
   * @param email
   */
  // chatAgent.addContacts({
  //   firstName: "Sina",
  //   lastName: "Rahimi",
  //   cellphoneNumber: "05954847458",
  //   email: "sinarahimi1@gmail.com"
  // }, function(result) {
  //   console.log(result.result);
  // });

  /**
   * UPDATE CONTACTS
   * @param id
   * @param firstName
   * @param lastName
   * @param cellphoneNumber
   * @param email
   */
  // chatAgent.updateContacts({
  //   id: "647",
  //     firstName: "Hamid",
  //     lastName: "Amouzegar",
  //     cellphoneNumber: "09000677868",
  //     email: "hamidam65000r77@gmail.com"
  // }, function(result) {
  //   console.log(result);
  // });

  /**
   * REMOVE CONTACTS
   * @param id
   */
  // chatAgent.removeContacts({
  //   id: "645865"
  // }, function(result) {
  //   console.log(result);
  // });

  /*******************************************************
   *                   M E S S A G E S                   *
   *******************************************************/

  /**
   * SEND MESSAGE IN THREAD
   * @param threadId
   * @param newMessage
   */
  // sendMessage(293, "This is a Sample Message at " + new Date());

  /**
   * EDIT MESSAGE IN THREAD
   * @param messageId  325 editable: false
   * @param newMessage
   */
  // editMessage(12397, "This message has been edited at " + new Date());

  /**
   * REPLY TO MESSAGE
   * @param threadId
   * @param messageId
   */
  // replyMessage(293, 12397, "This is a reply to message #413 at " + new Date());

  /**
   * FORWARD MESSAGE
   * @param destination
   * @param messageIds
   */
  // forwardMessage(293, [2539, 2538, 2537]);
});

/**
* Listen to Error Messages
*/
chatAgent.on("error", function(error) {
  console.log("ERROR \t", error.code, error.message, error.error);
});

/**
* Listen to Chat State Changes
*/
chatAgent.on("chatState", function(chatState) {});

/**
 * Listen to Thread Events
 */
chatAgent.on("threadEvents", function(event) {
   var type = event.type;

   switch (type) {
     case "NEW_THREAD":
       break;

     case "THREAD_RENAME":
       break;

     case "THREAD_MUTE":
       break;

     case "THREAD_UNMUTE":
       break;

     case "THREAD_INFO_UPDATED":
       break;

     case "LAST_SEEN_UPDATED":
       break;

     default:
       break;
   }
 });

/**
 * Listen to Message Events
 */
chatAgent.on("messageEvents", function(event) {
  var type = event.type,
    message = event.result.message;

  switch (type) {
    case "NEW_MESSAGE":
      /**
       * Sending Message Seen to Sender after 5 secs
       */
      setTimeout(function() {
        chatAgent.seen({messageId: message.id, owner: message.ownerId});
      }, 5000);

      break;

    default:
      break;
  }
});

/**
 * Local Functions
 */

function getUserInfo() {
  chatAgent.getUserInfo(function(userInfo) {
    console.log(userInfo);
  });
}

function getThreads(params) {
  chatAgent.getThreads(params, function(threadsResult) {
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

function forwardMessage(destination, messageIds) {
  chatAgent.forwardMessage({
    subjectId: destination,
    content: JSON.stringify(messageIds)
  }, {
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
