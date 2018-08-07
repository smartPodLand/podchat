var Chat = require('./src/chat.js');

var params = {
  socketAddress: "wss://chat-sandbox.pod.land/ws", // {**REQUIRED**} Socket Address
  ssoHost: "https://accounts.pod.land", // {**REQUIRED**} Socket Address
  platformHost: "https://sandbox.pod.land:8043/srv/basic-platform", // {**REQUIRED**} Platform Core Address
  fileServer: "http://sandbox.fanapium.com:8080", // {**REQUIRED**} File Server Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  token: "4f8de1e8caae438eb394328f891a597c", // {**REQUIRED**} SSO Token
  wsConnectionWaitTime: 500, // Time out to wait for socket to get ready after open
  connectionRetryInterval: 5000, // Time interval to retry registering device or registering server
  connectionCheckTimeout: 10000, // Socket connection live time on server
  messageTtl: 10000, // Message time to live
  reconnectOnClose: true, // auto connect to socket after socket close
  asyncLogging: {
    onFunction: true, // log main actions on console
    onMessageReceive: true, // log received messages on console
    onMessageSend: true, // log sent messaged on console
    actualTiming: true // log actual functions running time
  }
};

var chatAgent = new Chat(params),
  PID;

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
  //   offset: 0
  // });

  /**
   * CREATE THREAD (Creates Group)
   * @param invitees
   * @param threadType
   */
  // createThread([581, 582], "NORMAL");

  /**
   * CREATE THREAD (Creates P2P Chat with a specific user)
   * @param contactId
   */
  // createThread(563);

  /**
   * GET THREAD PARTICIPANTS
   * @param threadId
   */
  // getThreadParticipants(3);

  /**
   * ADD PARTICIPANTS
   * @param threadId
   * @param contacts {Array}  CONTACT ID
   */
  // addParticipants(3, [583]);

  /**
   * REMOVE PARTICIPANTS
   * @param threadId
   * @param participants {Array}  USER ID
   */
  // removeParticipants(3, [4]);

  /**
   * LEAVE THREAD
   * @param threadId
   */
  // leaveThread(3);

  /**
   * GET THREAD HISTORY
   * @param threadId
   * @param count
   * @param offset
   */
  // getHistory(3, 5, 0);

  /**
   * GET SINGLE MESSAGE
   * @param threadId
   * @param messageId
   */
  // getSingleMessage(1, 166);

  /**
   * MUTE THREAD
   * @param threadId
   */
  // muteThread(3);

  /**
   * UNMUTE THREAD
   * @param threadId
   */
  // unMuteThread(3);

  /**
   * RENAME THREAD
   * @param threadId
   */
  // renameThread(3, "دوستان");

  /*******************************************************
   *                   C O N T A C T S                   *
   *******************************************************/

  /**
   * GET CONTACTS
   */
  // getContacts();

  /**
   * ADD CONTACTS
   * @param firstName
   * @param lastName
   * @param cellphoneNumber
   * @param email
   */
  // chatAgent.addContacts({
  //   firstName: "Hamed",
  //   lastName: "Mehr Ara",
  //   cellphoneNumber: "09122900304",
  //   email: "hamed.mehr.ara@gmail.com"
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
  //   id: "581",
  //     firstName: "پوریا",
  //     lastName: "پهلوانی",
  //     cellphoneNumber: "09387181964",
  //     email: "pr.pahlevani@fanap.ir"
  // }, function(result) {
  //   console.log(result);
  // });

  /**
   * REMOVE CONTACTS
   * @param id
   */
  // chatAgent.removeContacts({
  //   id: "681"
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
   * @param metaData
   */
  // sendMessage(1, "This is a Sample Message at " + new Date(), {custom_date: new Date(), custom_code: "235fg43gw", custom_name: "John Doe"});

  /**
   * SEND FILE MESSAGE IN THREAD
   * @param threadId
   * @param file
   * @param caption
   * @param metaData
   */
  // sendFileMessage(3, __dirname + "/test/test.jpg", "Sample file description", {custom_name: "John Doe"});

  /**
   * EDIT MESSAGE IN THREAD
   * @param messageId  325 editable: false
   * @param newMessage
   */
  // editMessage(1, "This message has been edited at " + new Date());

  /**
   * DELETE MESSAGE IN THREAD
   * @param {int}      messageId
   * @param {boolean}  deleteForAll
   */
  // deleteMessage(167, false);

  /**
   * REPLY TO MESSAGE
   * @param threadId
   * @param messageId
   */
  // replyMessage(1, 1, "This is a reply to message #1 at " + new Date());

  /**
   * FORWARD MESSAGE
   * @param destination
   * @param messageIds
   */
  // forwardMessage(3, [1, 10]);

  /*******************************************************
   *               F I L E   U P L O A D S               *
   *******************************************************/

  /**
   * UPLOAD IMAGE
   * @param  {string}  image     Image path
   * @param  {int}     xC        Crop start x coordinates
   * @param  {int}     yC        Crop start y coordinates
   * @param  {int}     hC        Crop height
   * @param  {int}     wC        Crop width
   */
  // uploadImage(__dirname + "/test/test.jpg", 0, 0, 400, 400);

  /**
   * GET IMAGE
   * @param  {int}     imageId     Image ID
   * @param  {string}  hashCode    Hash Code
   */
  // getImage(2531, '1649d4e932a-0.8852815409984853');

  /**
   * UPLOAD FILE
   * @param  {string}  file     File path
   */
  // uploadFile(__dirname + "/test/test.txt");

  /**
   * GET FILE
   * @param  {int}     fileId          Image ID
   * @param  {string}  hashCode        Hash Code
   * @param  {boolean} downloadable    Downloadable link or not?
   */
  // getFile(344, '196CHI61NUROW8S1', true);

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
  console.log(event);

  switch (type) {
    case "THREAD_LAST_ACTIVITY_TIME":
      break;

    case "THREAD_NEW":
      break;

    case "THREAD_ADD_PARTICIPANTS":
      break;

    case "THREAD_REMOVE_PARTICIPANTS":
      break;

    case "THREAD_LEAVE_PARTICIPANT":
      break;

    case "THREAD_REMOVED_FROM":
      break;

    case "THREAD_RENAME":
      break;

    case "THREAD_MUTE":
      break;

    case "THREAD_UNMUTE":
      break;

    case "THREAD_INFO_UPDATED":
      break;

    case "THREAD_UNREAD_COUNT_UPDATED":
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

  console.log(event);

  switch (type) {
    case "MESSAGE_NEW":
      /**
         * Sending Message Seen to Sender after 5 secs
         */
      setTimeout(function() {
        chatAgent.seen({messageId: message.id, ownerId: message.ownerId});
      }, 5000);

      break;

    case "MESSAGE_EDIT":
      break;

    case "MESSAGE_DELIVERY":
      break;

    case "MESSAGE_SEEN":
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

function addParticipants(threadId, contacts) {
  chatAgent.addParticipants({
    threadId: threadId,
    contacts: contacts
  }, function(result) {
    console.log(result);
  });

}

function removeParticipants(threadId, participants) {
  chatAgent.removeParticipants({
    threadId: threadId,
    participants: participants
  }, function(result) {
    // console.log(result);
  });

}

function leaveThread(threadId) {
  chatAgent.leaveThread({
    threadId: threadId
  }, function(result) {
    // console.log(result);
  });
}

function getContacts(params) {
  var getContactsParams = {
    count: 50,
    offset: 0
  };

  if (params) {
    if (typeof params.name === "string") {
      getContactsParams.name = params.name;
    }
  }
  chatAgent.getContacts(getContactsParams, function(contactsResult) {
    if (!contactsResult.hasError) {
      var contactsCount = contactsResult.result.contentCount;
      var contacts = contactsResult.result.contacts;
      console.log(contacts);
    }
  });
}

function getSingleMessage(threadId, messageId) {
  chatAgent.getHistory({
    offset: 0,
    threadId: threadId,
    id: messageId
  }, function(historyResult) {
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

function sendMessage(threadId, message, metaData) {
  sendChatParams = {
    threadId: threadId,
    content: message,
    metaData: metaData
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

function sendFileMessage(threadId, file, caption, metaData) {
  chatAgent.sendFileMessage({
    threadId: threadId,
    file: file,
    content: caption,
    metaData: metaData
  }, {
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

function deleteMessage(messageId, deleteForAll) {
  if (typeof deleteForAll == "undefined") {
    deleteForAll = false;
  }

  chatAgent.deleteMessage({
    messageId: messageId,
    deleteForAll: deleteForAll
  }, function(result) {
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

function uploadImage(image, xC, yC, hC, wC) {
  chatAgent.uploadImage({
    image: image,
    xC: xC,
    yC: yC,
    hC: hC,
    wC: wC
  }, function(result) {
    if (!result.hasError) {
      var image = result.result;
      console.log("Image has been Successfully Uploaded => \n\n", image);
    }
  });
}

function getImage(imageId, hashCode) {
  chatAgent.getImage({
    imageId: imageId,
    hashCode: hashCode
  }, function(result) {
    if (!result.hasError) {
      console.log("Image has been successfully received => \n", result.result);
    }
  });
}

function uploadFile(file) {
  chatAgent.uploadFile({
    file: file
  }, function(result) {
    if (!result.hasError) {
      var file = result.result;
      console.log("File has been Successfully Uploaded => \n", file);
    }
  });
}

function getFile(fileId, hashCode, downloadable) {
  chatAgent.getFile({
    fileId: fileId,
    hashCode: hashCode,
    downloadable: downloadable
  }, function(result) {
    if (!result.hasError) {
      console.log("File has been successfully received => \n", result.result);
    }
  });
}
