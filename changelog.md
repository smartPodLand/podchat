# Changelog

All notable changes to this project will be documented here.
to see complete list of changelog please visit [ChangeLog](https://github.com/masoudmanson/pod-chat/blob/master/changelog.md)


## [Unreleased]

-   Search in threads metadata

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


<details><summary>[2.1.5] - 2018-11-17</summary>

- Changes

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
</details>

<details><summary>[2.1.0] - 2018-11-13</summary>

- Added

-   `typeCode` attribute has been added to primary chat options. This attribute indicates which contact group you are willing to work with
-   `typeCode` is also available in every function separately and you can send this parameter along side others
-   You can declare type of message you are sending by setting `messageType` attribute. It takes an Integer value and you will get it on `getHistory()` results too.

- Changes

-   `notSeenDuration` attribute of `participants` will no longer save in cache, and you will get `undefined` in return

</details>

<details><summary>[1.7.0] - 2018-11-06</summary>

-   Added

-   Full cache support with local encryption for both Node and Browser Environments. In order to enable caching, you can set `enableCache: true` while you start a chat application
-   Embedded map services including
    -   `mapReverse()` which takes a Geo Location and returns its address back
    -   `mapSearch()` which takes a Geo Location and a Search term and returns an array of Nearby places containing that search term
    -   `mapRouting()` which takes two Geo Locations and returns the route between them
    -   `mapStaticImage()` which takes a Geo Locations and returns the static map image of that area

</details>


<details><summary>[1.6.1] - 2018-10-21</summary>
-   Added

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

</details>


<details><summary>[1.6.0] - 2018-10-20</summary>
-   Changes

-   `messageType` has been added to `MESSAGE` model
-   `admin` attribute has been added to `CONVERSATOIN` model
-   `contactId`, `contactName`, `contactFirstname`, `contactLastname` and `blocked` have been added to `PARTICIPANT` model

</details>

<details><summary>[1.5.0] - 2018-10-10</summary>
-   Added

-   If you want to grant device id from SSO you can set `grantDeviceIdFromSSO` as `TRUE` in initializing parameters
</details>


<details><summary>[1.4.4] - 2018-10-01</summary>

- Changes

-   In order to rename a thread you can call `updateThreadInfo()` function and pass it 4 parameters as below:
    -   image
    -   description
    -   title
    -   metadata

-   `THREAD_INFO_UPDATED` events returns whole thread object

- Removed

-   `renameThread()` has been depreciated.
</details>

<details><summary>[1.4.0] - 2018-08-27</summary>

-   Added

-   Now you can Cancel File Uploads by calling `cancelFileUpload()` and sending file's uniqueId as a parameter to it
</details>

<details><summary>[1.2.1] - 2018-08-27</summary>
-    Added

-   `Block / unBlock` Functionality
-   `getBlockedList()` Function
-   `Spam` Functionality
-   Search in thread History and `metadata`
-   Update Thread Info
-   Search in Contacts list
-   `fileUploadEvents` Listener
-   Uploading progress for `File/Image Upload` and `sendFileMessage()`

</details>

<details><summary>[1.1.5] - 2018-08-18</summary>
-    Added

-   `getChatState()` Function
-   `TO_BE_USER_ID` type has been added to `inviteeVOidTypes` but only works while making P2P threads

-   Changed

-   `PARTICIPANT` object now has `firstName` , `lastName` and `contactId` attributes
-   `image` attribute in `CONVRSATION` model changed to `lastParticipantImage`

</details>

<details><summary>[0.7.6] - 2018-08-01</summary>
-   Added

-   `setToken()` Function
-   `firstMessageId` and `lastMessageId` attributes in `getHistory()`
    </details>

<details><summary>[0.7.0] - 2018-07-22</summary>
-   Added

-   Delete Message
-   Benchmark Tests
    </details>

<details><summary>[0.6.0] - 2018-07-16</summary>

-   Added


-   Upload functionality for node base usages
-   Unit Tests (`npm test`)
    </details>

<details><summary>[0.5.1] - 2018-07-08</summary>

-   Added


-   uploadImage
-   uploadFile
-   getImage
-   getFile
-   sendFileMessage


-   Changes


-   npm version rescaled to 0.5.1 (Release . Sprint . Feature/Patch/BugFix)
-   MESSAGE_SEEN fires at Sender's side when he sends a SEEN type to server
    </details>

<details><summary>[3.9.8] - 2018-07-04</summary>
+ Added

-   Add extra data on Message's metaData field and you will get your data back in metaData:{sdk: {}, user: { /**Your Custom Data Here**/ }}


-   Changes


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


-   Changed


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


-   Removed


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

-   Added


-   Contact Management (addContacts, updateContacts, removeContacts)
-   Search in Threads
-   Http Request Handler


-   Changed


-   Received Seen & Delivery Messages now have {messageId, participantId} in response content

</details>
