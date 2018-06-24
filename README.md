## Synopsis

**Fanap's POD** Chat service

## Code Example

Create an Javascript file e.x `index.js` and put following code in it:

```javascript
var Chat = require('podchat');

var params = {
  socketAddress: "ws://172.16.106.26:8003/ws", // {**REQUIRED**} Socket Address
  ssoHost: "172.16.110.76", // {**REQUIRED**} Socket Address
  ssoGrantDevicesAddress: "/oauth2/grants/devices", // {**REQUIRED**} Socket Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  token: "7cba09ff83554fc98726430c30afcfc6", // {**REQUIRED**} SSO Token
  consoleLogging: {
    onFunction: true, // log main actions on console
    onMessageReceive: true, // log received messages on console
    onMessageSend: true // log sent messaged on console
  }
};

var chatAgent = new Chat(params);

chatAgent.on("chatReady", function() {
  /**
   * Your code goes here
   */
});


/**
* Listen to Error Messages
*/
chatAgent.on("error", function(error) {
  console.log("Error: ", error.code, error.message);
});


/**
 * Listen to Receive Message Emitter
 */
chatAgent.on("message", function(msg) {
  var params = {
    messageId: msg.id,
    owner: msg.ownerId
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
 * Listen to Edit Message Emitter
 */
chatAgent.on("editMessage", function(msg) {
  console.log("Message with ID : " + msg.id + " inside Thread with ID : " + msg.threadId + " has been edited!");
  console.log(msg);
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

```

### getUserInfo

Returns current user's Profile Information

```javascript
chatAgent.getUserInfo(function(userInfo) {
  console.log(userInfo);
});
```

### createThread

```javascript
var createThreadTypes = {
  NORMAL: 0,
  OWNER_GROUP: 1,
  PUBLIC_GROUP: 2,
  CHANNEL_GROUP: 4,
  CHANNEL: 8
}

chatAgent.createThread({
    title: "Thread Title Sample",
    type: "NORMAL",
    invitees: []
  }, function(createThreadResult) {
    console.log(createThreadResult);
  }
);
```

### getThreads

```javascript
chatAgent.getThreads({
    count: 50,
    offset: 0
  }, function(threadsResult) {
    var threads = threadsResult.result.threads;
    console.log(threads);
  }
);
```

### getHistory

```javascript
chatAgent.getHistory({
    count: 50,
    offset: 0,
    threadId: threadId
  }, function(historyResult) {
    var history = historyResult.result.history;
    console.log(history);
  }
);
```

###getThreadParticipants

```javascript
chatAgent.getThreadParticipants({
    count: 50,
    offset: 0,
    threadId: threadId
  }, function(participantsResult) {
    var participants = participantsResult.result.participants;
    console.log(participants);
  }
);
```

### getContacts

```javascript
chatAgent.getContacts({
    count: 50,
    offset: 0
  }, function(contactsResult) {
  var contacts = contactsResult.result.contacts;
  console.log(contacts);
});
```

### sendMessage

```javascript
chatAgent.send({
    threadId: threadId,
    content: messageText
  }, {
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
```

### editMessage

```javascript
chatAgent.editMessage({
    messageId: messageId,
    content: newMessage
  }, {
  onSent: function(result) {
    console.log("Edited Message has been Sent!");
    console.log(result);
  },
  onDeliver: function(result) {
    console.log("Edited Message has been Delivered!");
    console.log(result);
  },
  onSeen: function(result) {
    console.log("Edited Message has been Seen!");
    console.log(result);
  }
});
```

### replyMessage

```javascript
chatAgent.replyMessage({
    threadId: threadId,
    repliedTo: messageId,
    content: message
  }, {
  onSent: function(result) {
    console.log("Your reply message has been Sent!");
    console.log(result);
  },
  onDeliver: function(result) {
    console.log("Your reply message has been Delivered!");
    console.log(result);
  },
  onSeen: function(result) {
    console.log("Your reply message has been Seen!");
    console.log(result);
  }
});
```

### forwardMessage

```javascript
var uniqueIds = ["f4647fdf-3db4-40c8-a038-bd87fdb084d0", "3d7b3b61-67d7-4a80-c63c-a4b4f9c3411a", "e51949d5-e2fd-4072-9f37-0fee797b9083"],
    messagesIds = [2539, 2538, 2537];

chatAgent.forwardMessage({
    subjectId: threadId,
    uniqueId: JSON.stringify(uniqueIds),
    content: JSON.stringify(messagesIds)
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
```

### muteThread

```javascript
chatAgent.muteThread({
    subjectId: threadId
  }, function(result) {
    console.log("Threaded has been successfully muted!");
  }
);
```

### unMuteThread

```javascript
chatAgent.unMuteThread({
    subjectId: threadId
  }, function(result) {
    console.log("Threaded has been successfully unMuted!");
  }
);
```

### renameThread

```javascript
chatAgent.renameThread({
    title: newName,
    threadId: threadId
  }, function(result) {
    console.log("Threaded has been successfully Renamed!");
  }
);
```

## Installation

```javascript
npm install podchat --save
```

## API Reference

[API Docs from POD](http://docs.pod.land/v1.0.0.0/Chat/javascript/783/Introduction)

## Tests

```javascript
npm test
```

## Contributors

You can send me your thoughts about making this repo great :)
[Email](masoudmanson@gmail.com)

## License

Under MIT License.


## Acknowledgments

A very special thanks to Ali Khanbabaei ([khanbabaeifanap](https://github.com/khanbabaeifanap)), who wrote the early version of chat service and helped me a lot with this repo.
