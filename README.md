## Synopsis

**Fanap's POD** Chat service

# Changelog

All notable changes to this project will be documented here.

## [Unreleased]

-   Search in Contacts & History
-   Block / Unblock an user
-   Delete Messages / Threads

## [0.5.1] - 2018-07-08

### Added

-   uploadImage
-   uploadFile
-   getImage
-   getFile
-   sendFileMessage

### Changes

-   npm version rescaled to 0.5.1 (Release . Sprint . Feature/Patch/BugFix)
-   MESSAGE_SEEN fires at Sender's side when he sends a SEEN type to server

<details><summary>[3.9.8] - 2018-07-04</summary>
+ Added

-   Add extra data on Message's metaData field and you will get your data back in metaData:{sdk: {}, user: { /_Your Custom Data Here_/ }}


+   Changes


-   THREAD_LAST_ACTIVITY_TIME fires on sending message at Sender's side too

</details>

<details><summary>[3.9.7] - 2018-07-04</summary>
+ Added

-   threadEvents has 1 new type (Whatever happens in a thread, thread's time attribute changes. You can sort your list by listening to this event)
        \-   THREAD_LAST_ACTIVITY_TIME
    </details>

<details><summary>[3.9.6] - 2018-07-04</summary>
+ Added

-   threadEvents has 1 new type (In case of someone remove you from an thread, you will get an event with this type containing the ThreadId you've been removed from)
        \-   THREAD_REMOVED_FROM
    </details>

<details><summary>[3.9.4] - 2018-07-04</summary>
+ Added

-   You can Add Participants to an existing thread by addParticipants({threadId : Thread's ID, content : An Array of Contact IDs}, () => {});
-   To Remove participants from an thread use removeParticipants({threadId: Thread's ID, content: An Array of Participant IDs});
-   If you want to Leave a thread use leaveThread({threadId: Thread's Id}, () => {});
-   threadEvents now has 3 new types
    -   THREAD_ADD_PARTICIPANTS
    -   THREAD_REMOVE_PARTICIPANTS
    -   THREAD_LEAVE_PARTICIPANT

</details>

<details><summary>[3.9.3] - 2018-07-04</summary>
+ Added

-   messageEvents now has 2 new types
    -   MESSAGE_SEEN
    -   MESSAGE_DELIVERY


+   Changed


-   messageEvents types get **MESSAGE\_** namespace and are as below:

    -   MESSAGE_NEW
    -   MESSAGE_EDIT
    -   MESSAGE_DELIVERY
    -   MESSAGE_SEEN

-   threadEvents types start with **THREAD\_**:
    -   THREAD_NEW
    -   THREAD_RENAME
    -   THREAD_MUTE
    -   THREAD_UNMUTE
    -   THREAD_INFO_UPDATED
    -   THREAD_UNREAD_COUNT_UPDATED

</details>

<details><summary>[3.9.2] - 2018-07-03</summary>
+ Added

-   2 main event listeners group (threadEvents, messageEvents)

    -   messageEvents has 2 types

        -   NEW_MESSAGE
        -   EDIT_MESSAGE

    -   threadEvents has 6 types
        -   NEW_THREAD
        -   THREAD_RENAME
        -   THREAD_MUTE
        -   THREAD_UNMUTE
        -   THREAD_INFO_UPDATED
        -   LAST_SEEN_UPDATED


+   Removed


-   Below event listeners are no longer available :
    -   chatAgent.on("message", () => {});
    -   chatAgent.on("editMessage", () => {});
    -   chatAgent.on("newThread", () => {});
    -   chatAgent.on("threadInfoUpdated", () => {});
    -   chatAgent.on("threadRename", () => {});
    -   chatAgent.on("lastSeenUpdated", () => {});
    -   chatAgent.on("muteThread", () => {});
    -   chatAgent.on("unMuteThread", () => {});

</details>

<details><summary>[3.9.1] - 2018-07-02</summary>

+   Added


-   Contact Management (addContacts, updateContacts, removeContacts)
-   Search in Threads
-   Http Request Handler


+   Changed


-   Received Seen & Delivery Messages now have {messageId, participantId} in response content

</details>

## Code Example

Create an Javascript file e.x `index.js` and put following code there:

```javascript
var Chat = require('podchat');

var params = {
  socketAddress: "ws://172.16.106.26:8003/ws", // {**REQUIRED**} Socket Address
  ssoHost: "http://172.16.110.76", // {**REQUIRED**} Socket Address
  ssoGrantDevicesAddress: "/oauth2/grants/devices", // {**REQUIRED**} Socket Address
  serverName: "chat-server", // {**REQUIRED**} Server to to register on
  token: "7cba09ff83554fc98726430c30afcfc6", // {**REQUIRED**} SSO Token
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
  }
};

var chatAgent = new Chat(params);
```

## Event Listeners

Listen on these events to get updated data on your client

### chatReady

This is the main Event which fires when your SDK has connected to ASYNC server and gets ready to chat.
**Write your code in chatReady's callback function**

```javascript
chatAgent.on("chatReady", function() {
  /**
   * Your code goes here
   */
});
```

### error

You can get all the Errors here

```javascript
/**
* Listen to Error Messages
*/
chatAgent.on("error", function(error) {
  console.log("Error: ", error.code, error.message);
});
```

### messageEvents

You'll get all the Message Events here

```javascript
/**
 * Listen to Message Emitter
 */
chatAgent.on("messageEvents", function(event) {
  var type = event.type,
    message = event.result.message;

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
```

### threadEvents

You'll get all the Events which are related to Threads in threadEvents listener

```javascript
/**
 * Listen to Thread Events
 */
chatAgent.on("threadEvents", function(event) {
  var type = event.type;

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
```

## User Functions

### getUserInfo

Returns current user's Profile Information

```javascript
chatAgent.getUserInfo(function(userInfo) {
  console.log(userInfo);
});
```

## Thread Functions

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
    offset: 0,
    name: "A String to search in thread titles and return result",
    threadIds: [] // Array of threadIds to get
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

### getThreadParticipants

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

### addParticipants

```javascript
chatAgent.addParticipants({
  threadId: threadId,
  contacts: [contactId1, contactId2, ...]
}, function(result) {
  console.log(result);
});
```

### removeParticipants

```javascript
chatAgent.removeParticipants({
  threadId: threadId,
  participants: [participantId1, participantId2, ...]
}, function(result) {
  console.log(result);
});
```

### leaveThread

```javascript
chatAgent.leaveThread({
  threadId: threadId
}, function(result) {
  console.log(result);
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

## Contact Functions

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

### addContacts

```javascript
chatAgent.addContacts({
  firstName: "Firstname",
  lastName: "Lastname",
  cellphoneNumber: "0999999999",
  email: "mail@gmail.com"
}, function(result) {
  console.log(result);
});
```

### updateContacts

```javascript
chatAgent.updateContacts({
    id: 66, //contact's id
    firstName: "Firstname", // new firstname
    lastName: "Lastname",// new lastname
    cellphoneNumber: "0999999999", // new cellphone number
    email: "mail@gmail.com" //new email
}, function(result) {
  console.log(result);
});
```

### removeContacts

```javascript
chatAgent.removeContacts({
  id: 234 // contact's id
}, function(result) {
  console.log(result);
});
```

## Message Functions

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
var messagesIds = [2539, 2538, 2537];

chatAgent.forwardMessage({
    subjectId: threadId,
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

## File functions

### sendFileMessage

```html
<form>
  <fieldset>
    <legend>Send File Message</legend>
    <input type="file" name="sendFileInput" id="sendFileInput">
    <br>
    <label for="sendFileDescription">Description: </label>
    <input type="text" name="sendFileDescription" id="sendFileDescription">
    <button type="button" name="button" id="sendFileMessage">Send</button>
  </fieldset>
</form>
```

```javascript
document.getElementById("sendFileMessage").addEventListener("click", function() {
  var fileInput = document.getElementById("sendFileInput"),
    image = fileInput.files[0],
    content = document.getElementById("sendFileDescription").value;

  chatAgent.sendFileMessage({
    threadId: 293,
    file: image,
    content: content,
    metaData: {custom_name: "John Doe"}
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
});
```

### uploadFile

```html
<form>
  <fieldset>
    <legend>Upload File</legend>
    <input type="file" name="file" id="fileInput" value="">
    <button type="button" name="button" id="uploadFile">Upload File</button>
    <br>
    <div id="uploadedFile"></div>
  </fieldset>
</form>
```

```javascript
document.getElementById("uploadFile").addEventListener("click", function() {
  var fileInput = document.getElementById("fileInput"),
    file = fileInput.files[0];

  chatAgent.uploadFile({
    file: file,
    fileName: "Test Name"
  }, function(result) {
    if (!result.hasError) {
      var file = result.result;
      document.getElementById("uploadedFile").innerHTML = "<pre><br>Uploaded File Id: " + file.id + "<br>Uploaded File Name : " + file.name + "<br>Uploaded File HashCode : " + file.hashCode + "</pre>";
    }
  });
});
```

### uploadImage

```html
<form>
  <fieldset>
    <legend>Upload Image</legend>
    <input type="file" name="image" id="imageInput" value="">
    <button type="button" name="button" id="uploadImage">Upload Image</button>
    <br>
    <img id="uploadedImage" />
    <div id="uploadedImageData"></div>
  </fieldset>
</form>
```

```javascript
document.getElementById("uploadImage").addEventListener("click", function() {
  var imageInput = document.getElementById("imageInput"),
    image = imageInput.files[0];

  chatAgent.uploadImage({
    image: image,
    fileName: "Test Name",
    xC: 0,
    yC: 0,
    hC: 800,
    wC: 800
  }, function(result) {
    if (!result.hasError) {
      var image = result.result;
      document.getElementById("uploadedImage").src = "http://172.16.106.26:8080/hamsam/nzh/image?imageId=" + image.id + "&hashCode=" + image.hashCode;
      document.getElementById("uploadedImageData").innerHTML = "<pre><br>Uploaded Image Id: " + image.id + "<br>Uploaded Image Name : " + image.name + "<br>Uploaded Image HashCode : " + image.hashCode + "</pre>";
    }
  });
});
```

### getFile

```javascript
chatAgent.getFile({
  fileId: fileId,
  hashCode: hashCode,
  downloadable: true
}, function(result) {
  if (!result.hasError) {
    var file = result.result;
  }
});
```

### getImage

```javascript
chatAgent.getImage({
  imageId: imageId,
  hashCode: hashCode,
  downloadable: true,
  actual: true
}, function(result) {
  if (!result.hasError) {
    var image = result.result;
  }
});
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
