# Changelog

All notable changes to this project will be documented here.
to see complete list of changelog please visit [ChangeLog](https://github.com/masoudmanson/pod-chat/blob/master/changelog.md)


## [Unreleased]

-   Search in threads metadata


## [4.10.0] - 2019-06-24

### Added

-   ACL functionalities
    - Getting admins list
    - Setting / Removing new admin with roles
-   `isTyping` for users, you can call `startTyping()` and `stopTyping()` to handle typing system messages
-   `clearHistory()` function to fully clear thread's history
-   `deleteMultipleMessages()` function to delete an array of message at once
-   `getNotSeenDuration()` function to get the time of user being off the application in miliseconds


## [3.5.38] - 2019-05-08

### Added

-   Function level cache control is now available. In order to disable receiving cache results for some specefic 
request, you can simply set `cache` parameter as `False` in `param` object which you're sending to chat SDK. 
Default value of `cache` is `True`. Be aware that this feature only works if global `enableCache` parameter has been set as `True`.
Below is the list of supported functions: 
    - `getHistory()`
    - `getThreads()`
    - `getThreadParticipants()`
    - `getContacts()`
    - `searchContacts()`
      
      
## [3.5.30] - 2019-04-28

### Added

-   Clear and Delete functionalities for cache. In order to clear current user's cache you can simply call `clearCacheDatabasesOfUser()` and if you want to delete whole cache database just call `deleteCacheDatabases()`

### Changed

-   Turn external web workers into Inline BLOB type workers.
-   Unified message structure for all queues


## [3.5.25] - 2019-03-13

### Added

-   Multi Tab IndexedDb CRUD management
-   `replyInfo` object now comes with `repliedToMessageTime`, `repliedToMessageTimeMiliSeconds` and `repliedToMessageTimeNanos`
-   `getHistory()` function now has 2 new parameters as below:
    - `queues` : This parameter takes an object as its value and declares which queues to be in return result of getHistory(). Default value for all 3 options is `TRUE`. Sample value object can be like below:
    ```javascript
    queues: {
        sending: true, 
        failed: false,
        uploading: true
    }
    ```
    - `dynamicHistoryCount` : If you need the number of messages that `getHistory()` function returns from server to be dynamically updated according to count of messages in message queues, you can set this parameter as `TRUE`. Default value is `FALSE`. 

### Changed

-   Cache return mechanism has changed. Here are all the details of each method:
    - `getThreads` : If there are some results for your request in cache, you'll get response from cache immediately. After receiving server's response, You'll get a new `threadEvents` event with `THREADS_LIST_CHANGE` type which gives you server's response. You can change your previous result with this one if you want to. Either way cache will update in background.
    - `getContacts` : Mechanism is the same as `getThreads`, the only difference is the event. After receiving server's response, You'll get a new `contactEvents` event with `CONTACTS_LIST_CHANGE` type which gives you server's response.
    - `getThreadParticipants` : Same as `getThreads`, but you will get a new `threadEvents` with `THREAD_PARTICIPANTS_LIST_CHANGE` type after server's response has received.
    - `getHistory`: If there are some results in cache for the request you made, we check some conditions on cache response, and if all goes well, we return from cache. Conditions are as below:
        - There should not be any GAPs between messages in cache result.
        - There should not be a GAP before first message of result.   
        
        If all the conditions pass, you get immediate response from cache. Then we wait for server to return it's response. After getting response from server, we check for differences between cache and server results and there we could have three scenarios:<br/> 
        -  There are some messages on server's result which were not in cache. in this case we emit a `MESSAGE_NEW` event to inform client of these new messages.
        -  Some messages have been deleted from server but we have them on cache. in this case we emit a `MESSAGE_DELETE` event.
        -  And if some messages have been edited on server, we simply return a `MESSAGE_EDIT` event.  
        
        If there are no messages on cache or one of conditions has failed, we will wait for server to return it's result and give it to client as callback result. <br/>  
        
-   The key for encrypting cache data now comes from server. If someone tries to decrypt user's cache with an invalid key, cache data will be automatically delete in order to keep user's data from being stolen. 
       

## [3.5.16] - 2019-01-28

### Added

-   `ActiveMQ` support has been added to `PodAsync`

In order to use `ActiveMQ` instead of `Websocket` you should send these parameters to `Chat()`

### ActiveMQ Parameters
```javascript
var params = {  
  protocol: "queue",
  queueHost: "172.16.0.248",
  queuePort: "61613",
  queueUsername: "root",
  queuePassword: "zalzalak",
  queueReceive: "queue-in-amjadi-stomp",
  queueSend: "queue-out-amjadi-stomp",
  queueConnectionTimeout: 20000
};
```

### Websockets Parameters

```javascript
var params = {
  socketAddress: "ws://172.16.106.26:8003/ws",
  serverName: "chat-server",
  wsConnectionWaitTime: 500,
  connectionRetryInterval: 5000,
  connectionCheckTimeout: 10000,
  reconnectOnClose: true
};
```

## [3.5.12] - 2019-01-22

### Changes

-   `block()` function has been changed and now you can block with `threadId`, `userId` alongside `contactId`

```javascript
chatAgent.block({
  contactId: 2247,
  // threadId: 1018,
  // userId: 121
}, function(result) {
  if (!result.hasError)
    console.log("Contact has been successfully Blocked!");
});
```

-   `unBlock()` function has been changed and now you can unblock with `contactId`, `threadId`, `userId` alongside `blockId`

```javascript
chatAgent.unblock({
  blockId: 425,
  // contactId: 2247,
  // threadId: 1018,
  // userId: 122
}, function(result) {
  if (!result.hasError)
    console.log("Contact has been successfully unBlocked!");
});
```

-   Thread model has been changed. `lastSeenMessageId`, `partnerLastSeenMessageId` and `partnerLastDeliveredMessageId` are no longer available, instead you can use below times:
    - `lastSeenMessageTime`
    - `partnerLastSeenMessageTime`
    - `partnerLastDeliveredMessageTime`


## [3.5.9] - 2019-01-20

### Added

-   `fromTimeFull` and `toTimeFull` have been added to `getHistory()` parameters. You can either enter full time as a 19 length number or enter it as `fromTime (length 13)` with `fromTimeNanos (length 9)`

```javascript
// Enter times like this
getHistoryParams = {
  fromTime: 1547896931323,
  fromTimeNanos: 323160000
}

// or like this
getHistoryParams = {
  fromTimeFull: 1547896931323160000
}
```

## [3.5.6] - 2019-01-19

### Changes

-   Refactoring Chat Send Queue and Upload Queue
-   `resendMessage()` now requires callbacks too.


## [3.5.3] - 2019-01-15

### Added

-   Cache synchronization with server to delete and update old cache data
    -   Update Cache on Message Delete/Edit
    -   Update Participants Cache
    -   Update Contacts Cache
    -   Update Threads Cache
-   Reply with file Message `replyFileMessage()`
-   Creating thread by sending or forwarding a message to someone
-   Set `image`, `description` and `metadata` parameters on thread creation so there would be no need for `updateThreadInfo()`
-   Implementing `UploadQueue`, `SendingQueue` and `WaitQueue` for chat messages
-   Resend `resendMessage()` / `cancelMessage()` Cancel function to handle failed messages
-   Cancel uploading and sending file messages with `cancelFileUpload()`
-   Get Message Delivered List `getMessageDeliveredList()`
-   Get Message Seen List `getMessageSeenList()`

### Changes

-   Update Chat ping mechanism
-   Replacing `RC4` with `AES` as encryption method


## [2.1.5] - 2018-11-17

### Changes

-   `replyInfo` has been changed as follow

```javascript
var replyInfo = {
  deleted,              /* Delete state of Replied Message */
  participant,          /* Sender of Replied Message */
  repliedToMessageId,   /* Id of Replied Message */
  message,              /* Content of Replied Message */
  messageType,          /* Type of Replied Message */
  metadata,             /* metadata of Replied Message */
  systemMetadata,       /* systemMetadata of Replied Message */
};
```

## [2.1.0] - 2018-11-13

### Added

-   `typeCode` attribute has been added to primary chat options. This attribute indicates which contact group you are willing to work with
-   `typeCode` is also available in every function separately and you can send this parameter along side others
-   You can declare type of message you are sending by setting `messageType` attribute. It takes an Integer value and you will get it on `getHistory()` results too.

### Changes

-   `notSeenDuration` attribute of `participants` will no longer save in cache, and you will get `undefined` in return

## [1.7.0] - 2018-11-06

### Added

-   Full cache support with local encryption for both Node and Browser Environments. In order to enable caching, you can set `enableCache: true` while you start a chat application
-   Embedded map services including
    -   `mapReverse()` which takes a Geo Location and returns its address back
    -   `mapSearch()` which takes a Geo Location and a Search term and returns an array of Nearby places containing that search term
    -   `mapRouting()` which takes two Geo Locations and returns the route between them
    -   `mapStaticImage()` which takes a Geo Locations and returns the static map image of that area


## [1.6.1] - 2018-10-21

### Added

-   Early version of Load Test are up now
-   `MESSAGE_DELETE` has been added to `messageEvents` listener, and whenever a message gets delete, you'll have an event announcing you that action. The result is like below:

```javascript
{ type: 'MESSAGE_DELETE',
  result: {
    message: {
      id: id_of_deleted_message,
      threadId: id_of_message_thread
    }
  }
}
```

## [1.6.0] - 2018-10-20

### Changes

-   `messageType` has been added to `MESSAGE` model
-   `admin` attribute has been added to `CONVERSATOIN` model
-   `contactId`, `contactName`, `contactFirstname`, `contactLastname` and `blocked` have been added to `PARTICIPANT` model

## [1.5.0] - 2018-10-10

### Added

-   If you want to grant device id from SSO you can set `grantDeviceIdFromSSO` as `TRUE` in initializing parameters


## [1.4.4] - 2018-10-01

### Changes

-   In order to rename a thread you can call `updateThreadInfo()` function and pass it 4 parameters as below:
    -   image
    -   description
    -   title
    -   metadata

-   `THREAD_INFO_UPDATED` events returns whole thread object

### Removed

-   `renameThread()` has been depreciated.

## [1.4.0] - 2018-08-27

### Added

-   Now you can Cancel File Uploads by calling `cancelFileUpload()` and sending file's uniqueId as a parameter to it

## [1.2.1] - 2018-08-27

### Added

-   `Block / unBlock` Functionality
-   `getBlockedList()` Function
-   `Spam` Functionality
-   Search in thread History and `metadata`
-   Update Thread Info
-   Search in Contacts list
-   `fileUploadEvents` Listener
-   Uploading progress for `File/Image Upload` and `sendFileMessage()`


## [1.1.5] - 2018-08-18

### Added

-   `getChatState()` Function
-   `TO_BE_USER_ID` type has been added to `inviteeVOidTypes` but only works while making P2P threads

### Changed

-   `PARTICIPANT` object now has `firstName` , `lastName` and `contactId` attributes
-   `image` attribute in `CONVRSATION` model changed to `lastParticipantImage`

## [0.7.6] - 2018-08-01

### Added

-   `setToken()` Function
-   `firstMessageId` and `lastMessageId` attributes in `getHistory()`

## [0.7.0] - 2018-07-22

### Added

-   Delete Message
-   Benchmark Tests

## [0.6.0] - 2018-07-16

### Added

-   Upload functionality for node base usages
-   Unit Tests (`npm test`)

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

## [3.9.8] - 2018-07-04

### Added

-   Add extra data on Message's metaData field and you will get your data back in metaData:{sdk: {}, user: { /**Your Custom Data Here**/ }}

### Changes

-   THREAD_LAST_ACTIVITY_TIME fires on sending message at Sender's side too


## [3.9.7] - 2018-07-04

### Added

-   threadEvents has 1 new type (Whatever happens in a thread, thread's time attribute changes. You can sort your list by listening to this event)
        \-   THREAD_LAST_ACTIVITY_TIME

## [3.9.6] - 2018-07-04

### Added

-   threadEvents has 1 new type (In case of someone remove you from an thread, you will get an event with this type containing the ThreadId you've been removed from)
        \-   THREAD_REMOVED_FROM


## [3.9.4] - 2018-07-04

### Added

-   You can Add Participants to an existing thread by addParticipants({threadId : Thread's ID, content : An Array of Contact IDs}, () => {});
-   To Remove participants from an thread use removeParticipants({threadId: Thread's ID, content: An Array of Participant IDs});
-   If you want to Leave a thread use leaveThread({threadId: Thread's Id}, () => {});
-   threadEvents now has 3 new types
    -   THREAD_ADD_PARTICIPANTS
    -   THREAD_REMOVE_PARTICIPANTS
    -   THREAD_LEAVE_PARTICIPANT


##[3.9.3] - 2018-07-04

### Added

-   messageEvents now has 2 new types
    -   MESSAGE_SEEN
    -   MESSAGE_DELIVERY

### Changed

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


## [3.9.2] - 2018-07-03

### Added

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

### Removed

-   Below event listeners are no longer available :
    -   chatAgent.on("message", () => {});
    -   chatAgent.on("editMessage", () => {});
    -   chatAgent.on("newThread", () => {});
    -   chatAgent.on("threadInfoUpdated", () => {});
    -   chatAgent.on("threadRename", () => {});
    -   chatAgent.on("lastSeenUpdated", () => {});
    -   chatAgent.on("muteThread", () => {});
    -   chatAgent.on("unMuteThread", () => {});

## [3.9.1] - 2018-07-02

### Added

-   Contact Management (addContacts, updateContacts, removeContacts)
-   Search in Threads
-   Http Request Handler


### Changed

-   Received Seen & Delivery Messages now have {messageId, participantId} in response content
