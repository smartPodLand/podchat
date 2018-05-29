var Chat = require('./src/chat.js');

var params = {
  socketAddress: "ws://172.16.106.26:8003/ws", // {**REQUIRED**} Socket Address
  ssoHost: "172.16.110.76", // {**REQUIRED**} Socket Address
  ssoGrantDevicesAddress: "/oauth2/grants/devices", // {**REQUIRED**} Socket Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  // token: "c0866c4cc5274ea7ada6b01575b19d24",  {**REQUIRED**} SSO Token Zamani
  token: "afa51d8291dc4072a0831d3a18cb5030", // {**REQUIRED**} SSO Token Barzegar
  // token: "ed4be26a60c24ed594e266a2181424c5",   {**REQUIRED**} SSO Token Abedi
  // token: "a11768091eac48f2a7b84ed6a241f9c3",   {**REQUIRED**} SSO Token FelFeli
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
  var getThreadsParams = {
    count: 50,
    offset: 0
  };
  var createThreadParams,
    sendChatParams;

  /**
   * GET THREADS
   */
  // getThreads(getThreadsParams);

  /**
   * GET CONTACTS
   */
  // getContacts(getThreadsParams);

  /**
   * CREATE THREAD
   */
  // createThread(getThreadsParams);

  /**
   * SEND MESSAGE IN THREAD
   */
  // sendMessage(getThreadsParams, 78, "This is a Sample Message at " + new Date());
});

chatAgent.on("message", function(msg) {
  var params = {
    messageId: msg.messageId
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

function getThreads(getThreadsParams) {
  chatAgent.getThreads(getThreadsParams, function(threadsResult) {
    var threads = threadsResult.result.threads;
    console.log(threads);
  });
}

function getContacts(getThreadsParams) {
  chatAgent.getContacts(getThreadsParams, function(contactsResult) {
    var contacts = contactsResult.result.contacts;
    console.log(contacts);
  });
}

function sendMessage(getThreadsParams, threadId, message) {
  var sendMessageThreadId;
  if (threadId === undefined) {
    chatAgent.getThreads(getThreadsParams, function(threads) {
      var thread = threads.result.threads[0];
      sendMessageThreadId = thread.threadId;
    });
  } else {
    sendMessageThreadId = threadId;
  }

  setTimeout(function() {
    sendChatParams = {
      threadId: sendMessageThreadId,
      content: message
    };

    chatAgent.send(sendChatParams, {
      onSent: function(result) {
        console.log("Your message has been Sent!");
        console.log(result);
      },
      onDeliver: function(result) {
        console.log("Your message has been Delivered!");
        console.log(result);
      },
      onSeen: function(result) {
        console.log("Your message has been Seen!");
        console.log(result);
      }
    });
  }, 5000);
}

function createThread(getThreadsParams) {
  chatAgent.getContacts(getThreadsParams, function(contactsResult) {
    var contacts = contactsResult.result.contacts;

    createThreadParams = {
      title: "Thread Title Sample",
      type: "NORMAL",
      invitees: []
    };

    for (var i = 0; i < contacts.length; i++) {
      if (contacts[i].hasUser) {
        invitee = formatDataToMakeInvitee(contacts[i]);
        if (invitee) {
          createThreadParams.invitees.push(invitee);
        }
      }
    }

    setTimeout(function() {
      chatAgent.createThread(createThreadParams, function(createThreadResult) {
        console.log(createThreadResult);
      });
    }, 5000);
  });
}

function formatDataToMakeInvitee(messageContent) {
  var inviteeData = {
    id: messageContent.id,
    idType: "TO_BE_USER_CONTACT_ID"
  };

  return inviteeData;
}
