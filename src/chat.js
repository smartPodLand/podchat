(function() {
  /*
   * Chat Module
   * @module chat
   *
   * @param {Object} params
   */
  var Async,
    ChatUtility;

  function Chat(params) {
    if (typeof(require) !== "undefined" && typeof(exports) !== "undefined") {
      Async = require('podasync');
      ChatUtility = require('./utility/utility.js');
      podLogger = require('./log/log.js');
      http = require('http');
    } else {
      Async = POD.Async;
      ChatUtility = POD.ChatUtility;
      podLogger = POD.Log;
    }

    /*******************************************************
     *          P R I V A T E   V A R I A B L E S          *
     *******************************************************/

    var Utility = new ChatUtility();

    var asyncClient,
      peerId,
      oldPeerId,
      userInfo,
      token = params.token,
      deviceId,
      isNode = Utility.isNode(),
      ssoGrantDevicesAddress = params.ssoGrantDevicesAddress,
      ssoHost = params.ssoHost,
      eventCallbacks = {
        connect: {},
        disconnect: {},
        reconnect: {},
        serverRegister: {},
        message: {},
        editMessage: {},
        forwardMessage: {},
        newThread: {},
        threadInfoUpdated: {},
        threadRename: {},
        leaveThread: {},
        newParticipant: {},
        deliver: {},
        seen: {},
        sent: {},
        login: {},
        logout: {},
        report: {},
        chatReady: {},
        error: {}
      },
      messagesCallbacks = {},
      sendMessageCallbacks = {},
      threadCallbacks = {},
      chatMessageVOTypes = {
        CREATE_THREAD: 1,
        MESSAGE: 2,
        SENT: 3,
        DELIVERY: 4,
        SEEN: 5,
        PING: 6,
        BLOCK: 7,
        UNBLOCK: 8,
        LEAVE_THREAD: 9,
        RENAME: 10,
        ADD_PARTICIPANT: 11,
        GET_STATUS: 12,
        GET_CONTACTS: 13,
        GET_THREADS: 14,
        GET_HISTORY: 15,
        CHANGE_TYPE: 16,
        LAST_SEEN_TYPE: 17,
        REMOVE_PARTICIPANT: 18,
        MUTE_THREAD: 19,
        UNMUTE_THREAD: 20,
        UPDATE_METADATA: 21,
        FORWARD_MESSAGE: 22,
        USER_INFO: 23,
        USER_STATUS: 24,
        USERS_STATUS: 25,
        RELATION_INFO: 26,
        THREAD_PARTICIPANTS: 27,
        EDIT_MESSAGE: 28,
        DELETE_MESSAGE: 29,
        THREAD_INFO_UPDATED: 30,
        ERROR: 999
      },
      inviteeVOidTypes = {
        TO_BE_USER_SSO_ID: 1,
        TO_BE_USER_CONTACT_ID: 2,
        TO_BE_USER_CELLPHONE_NUMBER: 3,
        TO_BE_USER_USERNAME: 4
      },
      createThreadTypes = {
        NORMAL: 0,
        OWNER_GROUP: 1,
        PUBLIC_GROUP: 2,
        CHANNEL_GROUP: 4,
        CHANNEL: 8
      },
      msgPriority = params.msgPriority || 1,
      msgTTL = params.msgTTL || 10000,
      serverName = params.serverName || "",
      chatPingMessageInterval = 20000,
      lastReceivedMessageTime,
      lastSentMessageTime,
      lastSentMessageTimeoutId,
      config = {
        getHistoryCount: 100
      },
      CHAT_ERRORS = {
        6000: "Invalid Token!",
        6001: "No Active Device found for this Token!",
        6002: "User not found!"
      };

    /*******************************************************
     *            P R I V A T E   M E T H O D S            *
     *******************************************************/

    var init = function() {
        getDeviceIdWithToken(function(retrievedDeviceId) {
          deviceId = retrievedDeviceId;

          asyncClient = new Async({
            socketAddress: params.socketAddress,
            serverName: params.serverName,
            deviceId: retrievedDeviceId,
            wsConnectionWaitTime: params.wsConnectionWaitTime,
            connectionRetryInterval: params.connectionRetryInterval,
            connectionCheckTimeout: params.connectionCheckTimeout,
            connectionCheckTimeoutThreshold: params.connectionCheckTimeoutThreshold,
            messageTtl: params.messageTtl,
            reconnectOnClose: params.reconnectOnClose,
            asyncLogging: params.asyncLogging
          });

          asyncClient.asyncReady(function() {
            peerId = asyncClient.getPeerId();

            getUserInfo(function(userInfoResult) {
              if (!userInfoResult.hasError) {
                userInfo = userInfoResult.result.user;
              }
            });

            fireEvent("chatReady");
          });

          asyncClient.on("connect", function(newPeerId) {
            peerId = newPeerId;
            fireEvent("connect");
          });

          asyncClient.on("disconnect", function() {
            oldPeerId = peerId;
            peerId = undefined;
            fireEvent("disconnect");
          });

          asyncClient.on("reconnect", function(newPeerId) {
            peerId = newPeerId;
            fireEvent("reconnect");
          });

          asyncClient.on("message", function(params, ack) {
            pushMessageHandler(params);
            ack && ack();
          });
        });
      },

      getDeviceIdWithToken = function(callback) {
        var deviceId;

        if (isNode) {
          var options = {
            host: ssoHost,
            path: ssoGrantDevicesAddress,
            method: "GET",
            headers: {
              "Authorization": "Bearer " + token
            }
          };

          http.get(options, function(response) {
            var resultText = '';

            response.on('data', function(data) {
              resultText += data;
            });

            response.on('end', function() {
              var devices = JSON.parse(resultText).devices;
              if (devices && devices.length > 0) {
                for (var i = 0; i < devices.length; i++) {
                  if (devices[i].current) {
                    deviceId = devices[i].uid;
                    break;
                  }
                }

                if (!deviceId) {
                  fireEvent("error", {
                    code: 6000,
                    message: CHAT_ERRORS[6000]
                  });
                } else {
                  callback(deviceId);
                }
              } else {
                fireEvent("error", {
                  code: 6001,
                  message: CHAT_ERRORS[6001]
                });
              }
            });
          });

        } else {
          var request = new XMLHttpRequest();
          request.open("GET", "http://" + ssoHost + ssoGrantDevicesAddress, true);
          request.setRequestHeader("Authorization", "Bearer " + token);
          request.send();

          request.onreadystatechange = function() {
            if (request.readyState == 4 && request.status == 200) {
              var response = request.responseText;

              var devices = JSON.parse(response).devices;

              if (devices && devices.length > 0) {
                for (var i = 0; i < devices.length; i++) {
                  if (devices[i].current) {
                    deviceId = devices[i].uid;
                    break;
                  }
                }

                if (!deviceId) {
                  fireEvent("error", {
                    code: 6000,
                    message: CHAT_ERRORS[6000]
                  });
                } else {
                  callback(deviceId);
                }
              } else {
                fireEvent("error", {
                  code: 6001,
                  message: CHAT_ERRORS[6001]
                });
              }
            }
          }
        }
      },

      getUserInfo = function(callback) {
        var sendMessageParams = {
          chatMessageVOType: chatMessageVOTypes.USER_INFO
        };

        return sendMessage(sendMessageParams, {
          onResult: function(result) {
            var returnData = {
              hasError: result.hasError,
              errorMessage: result.errorMessage,
              errorCode: result.errorCode
            };

            if (!returnData.hasError) {
              var messageContent = result.result,
                resultData = {
                  user: formatDataToMakeUser(messageContent)
                };

              returnData.result = resultData;
            }

            callback && callback(returnData);
          }
        });
      },

      sendMessage = function(params, callbacks) {
        /**
         * + ChatMessage    {object}
         *    - token       {string}
         *    - tokenIssuer {string}
         *    - type        {int}
         *    - subjectId   {long}
         *    - uniqueId    {string}
         *    - content     {string}
         *    - time        {long}
         *    - medadata    {string}
         *    - repliedTo   {long}
         */
        var messageVO = {
          type: params.chatMessageVOType,
          token: token,
          tokenIssuer: 1
        };

        var threadId = params.subjectId;

        if (params.subjectId) {
          messageVO.subjectId = params.subjectId;
        }

        if (params.repliedTo) {
          messageVO.repliedTo = params.repliedTo;
        }

        if (params.content) {
          if (typeof params.content == "object") {
            messageVO.content = JSON.stringify(params.content);
          } else {
            messageVO.content = params.content;
          }
        }

        if (params.metaData) {
          messageVO.metadata = params.metaData;
        }

        var uniqueId;

        if (typeof params.uniqueId != "undefined") {
          uniqueId = params.uniqueId;
        } else {
          uniqueId = Utility.generateUUID();
        }

        if (Array.isArray(uniqueId)) {
          messageVO.uniqueId = JSON.stringify(uniqueId);
        } else {
          messageVO.uniqueId = uniqueId;
        }

        if (typeof callbacks == "object") {
          if (callbacks.onSeen || callbacks.onDeliver || callbacks.onSent) {
            if (!threadCallbacks[threadId]) {
              threadCallbacks[threadId] = {};
            }

            threadCallbacks[threadId][uniqueId] = {};

            sendMessageCallbacks[uniqueId] = {};

            if (callbacks.onSent) {
              sendMessageCallbacks[uniqueId].onSent = callbacks.onSent;
              threadCallbacks[threadId][uniqueId].onSent = false;
              threadCallbacks[threadId][uniqueId].uniqueId = uniqueId;
            }

            if (callbacks.onSeen) {
              sendMessageCallbacks[uniqueId].onSeen = callbacks.onSeen;
              threadCallbacks[threadId][uniqueId].onSeen = false;
            }

            if (callbacks.onDeliver) {
              sendMessageCallbacks[uniqueId].onDeliver = callbacks.onDeliver;
              threadCallbacks[threadId][uniqueId].onDeliver = false;
            }

          } else if (callbacks.onResult) {
            messagesCallbacks[uniqueId] = callbacks.onResult;
          }
        } else if (typeof callbacks == "function") {
          messagesCallbacks[uniqueId] = callbacks;
        }

        /**
        * Message to send through async SDK
        *
        * + MessageWrapperVO  {object}
        *    - type           {int}       Type of ASYNC message based on content
        *    + content        {string}
        *       -peerName     {string}    Name of receiver Peer
        *       -receivers[]  {long}      Array of receiver peer ids (if you use this, peerName will be ignored)
        *       -priority     {int}       priority of message 1-10, lower has more priority
        *       -messageId    {long}      id of message on your side, not required
        *       -ttl          {long}      Time to live for message in milliseconds
        *       -content      {string}    Chat Message goes here after stringifying
        *    - trackId        {long}      Tracker id of message that you receive from DIRANA previously (if you are replying a sync message)
        */

        var data = {
          type: (typeof params.pushMsgType == "number")
            ? params.pushMsgType
            : 3,
          content: {
            peerName: serverName,
            priority: msgPriority,
            content: JSON.stringify(messageVO),
            ttl: msgTTL
          }
        };

        asyncClient.send(data, function(res) {
          if (res.hasError && callbacks) {
            if (typeof callbacks == "function") {
              callbacks(res);
            } else if (typeof callbacks == "object" && typeof callbacks.onResult == "function") {
              callbacks.onResult(res);
            }

            if (messagesCallbacks[uniqueId]) {
              delete messagesCallbacks[uniqueId];
            }
          }
        });

        lastSentMessageTimeoutId && clearTimeout(lastSentMessageTimeoutId);
        lastSentMessageTime = new Date();
        lastSentMessageTimeoutId = setTimeout(function() {
          var currentTime = new Date();

          if (currentTime - lastSentMessageTime > chatPingMessageInterval) {
            ping();
          }
        }, chatPingMessageInterval);

        return {uniqueId: uniqueId}
      },

      ping = function() {
        sendMessage({chatMessageVOType: chatMessageVOTypes.PING, pushMsgType: 4});
      },

      pushMessageHandler = function(params) {
        /**
         * + Message Received From Async      {object}
         *    - id                            {long}
         *    - senderMessageId               {long}
         *    - senderName                    {string}
         *    - senderId                      {long}
         *    - type                          {int}
         *    - content                       {string}
         */

        lastReceivedMessageTime = new Date();

        var content = JSON.parse(params.content);
        receivedMessageHandler(content);
      },

      receivedMessageHandler = function(params) {
        var threadId = params.subjectId,
          type = params.type,
          messageContent = (typeof params.content === 'string') ? JSON.parse(params.content) : {},
          contentCount = params.contentCount,
          uniqueId = params.uniqueId;

        switch (type) {
            // 1
          case chatMessageVOTypes.CREATE_THREAD:
            messageContent.uniqueId = uniqueId;
            createThread(messageContent, true);
            break;

            // 2
          case chatMessageVOTypes.MESSAGE:
            chatMessageHandler(threadId, messageContent);
            break;

            // 3
          case chatMessageVOTypes.SENT:
            if (sendMessageCallbacks[uniqueId] && sendMessageCallbacks[uniqueId].onSent) {
              sendMessageCallbacks[uniqueId].onSent(params);
              delete(sendMessageCallbacks[uniqueId].onSent);
            }
            break;

            // 4
          case chatMessageVOTypes.DELIVERY:
            console.log("\n");
            console.log(threadCallbacks[threadId]);
            // console.log(Object.keys(threadCallbacks[threadId]).indexOf(uniqueId));

            // var lastCallbackIndex = threadCallbacks[threadId].indexOf(uniqueId);
            var lastCallbackIndex = Object.keys(threadCallbacks[threadId]).indexOf(uniqueId);
            console.log(lastCallbackIndex);
            console.log(uniqueId);
            console.log(threadCallbacks[threadId][uniqueId]);
            console.log("\n\n");

            while (lastCallbackIndex > -1) {
              // console.log(Object.entries(threadCallbacks[threadId][lastCallbackIndex]));
              //   var lastEventCallbackIndex = threadCallbacks[threadId][lastCallbackIndex];
              //   if (sendMessageCallbacks[lastEventCallbackIndex] && sendMessageCallbacks[lastEventCallbackIndex].onDeliver) {
              //     sendMessageCallbacks[lastEventCallbackIndex].onDeliver({uniqueId: lastEventCallbackIndex});
              //     delete(sendMessageCallbacks[lastEventCallbackIndex].onDeliver);
              //     threadCallbacks[threadId][lastCallbackIndex].onDeliver = true;
              //   }
              //   lastCallbackIndex -= 1;
              //   lastEventCallbackIndex = undefined;
              // }
              //
              // if (threadCallbacks[threadId][uniqueId]) {
              //   delete(threadCallbacks[threadId][uniqueId]);
            }

            if (sendMessageCallbacks[uniqueId] && sendMessageCallbacks[uniqueId].onDeliver) {
              sendMessageCallbacks[uniqueId].onDeliver(params);
              delete(sendMessageCallbacks[uniqueId].onDeliver);
            }
            break;

            // 5
          case chatMessageVOTypes.SEEN:
            if (sendMessageCallbacks[uniqueId] && sendMessageCallbacks[uniqueId].onSeen) {
              sendMessageCallbacks[uniqueId].onSeen(params);
              delete(sendMessageCallbacks[uniqueId].onSeen);
            }
            break;

            // 10
          case chatMessageVOTypes.RENAME:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            fireEvent("threadRename", messageContent);
            break;

            // 13
          case chatMessageVOTypes.GET_CONTACTS:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            break;

            // 14
          case chatMessageVOTypes.GET_THREADS:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            break;

            // 15
          case chatMessageVOTypes.GET_HISTORY:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            break;

            // 19
          case chatMessageVOTypes.MUTE_THREAD:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            break;

            // 20
          case chatMessageVOTypes.UNMUTE_THREAD:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            break;

            // 22
          case chatMessageVOTypes.FORWARD_MESSAGE:
            chatMessageHandler(threadId, messageContent);
            break;

            // 23
          case chatMessageVOTypes.USER_INFO:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            break;

            // 27
          case chatMessageVOTypes.THREAD_PARTICIPANTS:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            break;

            // 28
          case chatMessageVOTypes.EDIT_MESSAGE:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            chatEditMessageHandler(threadId, messageContent);
            break;

            // 30
          case chatMessageVOTypes.THREAD_INFO_UPDATED:
            fireEvent("threadInfoUpdated", messageContent);
            break;

            // 999
          case chatMessageVOTypes.ERROR:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(true, messageContent.message, messageContent.code, messageContent, 0));
            fireEvent("error", messageContent);
            break;
        }
      },

      chatMessageHandler = function(threadId, messageContent) {
        var message = formatDataToMakeMessage(messageContent);
        fireEvent("message", message);
      },

      chatEditMessageHandler = function(threadId, messageContent) {
        var message = formatDataToMakeMessage(messageContent);
        fireEvent("editMessage", message);
      },

      createThread = function(messageContent, addFromService) {
        var threadData = formatDataToMakeConversation(messageContent);
        if (addFromService) {
          fireEvent("newThread", threadData);
        }
        return threadData;
      },

      formatdataToMakeLinkedUser = function(messageContent) {
        /**
         * + RelatedUserVO                 {object}
         *   - username                    {string}
         *   - nickname                    {string}
         *   - name                        {string}
         *   - image                       {string}
         */

        var linkedUser = {
          username: messageContent.username,
          nickname: messageContent.nickname,
          name: messageContent.name,
          image: messageContent.image
        };

        return linkedUser;
      },

      formatDataToMakeContact = function(messageContent) {
        /**
         * + ContactVO                        {object}
         *    - id                            {long}
         *    - firstName                     {string}
         *    - lastName                      {string}
         *    - profileImage                  {string}
         *    - email                         {string}
         *    - cellphoneNumber               {string}
         *    - uniqueId                      {string}
         *    - notSeenDuration               {long}
         *    - hasUser                       {boolean}
         *    + linkedUser                    {object : RelatedUserVO}
         *      - username                    {string}
         *      - nickname                    {string}
         *      - name                        {string}
         *      - image                       {string}
         */

        var contact = {
          id: messageContent.id,
          firstName: messageContent.firstName,
          lastName: messageContent.lastName,
          profileImage: messageContent.profileImage,
          email: messageContent.email,
          cellphoneNumber: messageContent.cellphoneNumber,
          uniqueId: messageContent.uniqueId,
          notSeenDuration: messageContent.notSeenDuration,
          hasUser: messageContent.hasUser
        };

        if (messageContent.linkedUser !== undefined) {
          contact.linkedUser = formatdataToMakeLinkedUser(messageContent.linkedUser);
        }

        return contact;
      },

      formatDataToMakeUser = function(messageContent) {
        /**
         * + User                     {object}
         *    - id                    {long}
         *    - name                  {string}
         *    - email                 {string}
         *    - cellphoneNumber       {string}
         *    - image                 {string}
         *    - lastSeen              {long}
         *    - sendEnable            {boolean}
         *    - receiveEnable         {boolean}
         */

        var user = {
          id: messageContent.id,
          name: messageContent.name,
          email: messageContent.email,
          cellphoneNumber: messageContent.cellphoneNumber,
          image: messageContent.image,
          lastSeen: messageContent.lastSeen,
          sendEnable: messageContent.sendEnable,
          receiveEnable: messageContent.receiveEnable
        };

        return user;
      },

      formatDataToMakeInvitee = function(messageContent) {
        /**
         * + InviteeVO       {object}
         *    - id           {string}
         *    - idType       {int}
         */

        var inviteeData = {
          id: messageContent.id,
          idType: inviteeVOidTypes[messageContent.idType]
        };

        return inviteeData;
      },

      formatDataToMakeParticipant = function(messageContent) {
        /**
         * + ParticipantVO                   {object}
         *    - id                           {long}
         *    - sendEnable                   {boolean}
         *    - receiveEnable                {boolean}
         *    - name                         {string}
         *    - myFriend                     {boolean}
         *    - online                       {boolean}
         *    - notSeenDuration              {long}
         *    - userId                       {long}
         */

        var participant = {
          id: messageContent.id,
          sendEnable: messageContent.sendEnable,
          receiveEnable: messageContent.receiveEnable,
          name: messageContent.name,
          myFriend: messageContent.myFriend,
          online: messageContent.online,
          notSeenDuration: messageContent.notSeenDuration,
          userId: messageContent.userId
        };

        if (messageContent.image)
          participant.image = messageContent.image;

        return participant;
      },

      formatDataToMakeConversation = function(messageContent) {

        /**
         * + Conversation                     {object}
         *    - id                            {long}
         *    - joinDate                      {long}
         *    - title                         {string}
         *    - inviter                       {object : ParticipantVO}
         *    - participants                  {list : ParticipantVO}
         *    - time                          {long}
         *    - lastMessage                   {string}
         *    - lastParticipantName           {string}
         *    - group                         {boolean}
         *    - partner                       {long}
         *    - image                         {string}
         *    - unreadCount                   {long}
         *    - lastMessageId                 {long}
         *    - lastMessageVO                 {object : ChatMessageVO}
         *    - partnerLastMessageId          {long}
         *    - partnerLastDeliveredMessageId {long}
         *    - type                          {int}
         *    - metadata                      {string}
         *    - mute                          {boolean}
         *    - participantCount              {long}
         */

        var conversation = {
          id: messageContent.id,
          joinDate: messageContent.joinDate,
          title: messageContent.title,
          time: messageContent.time,
          lastMessage: messageContent.lastMessage,
          lastParticipantName: messageContent.lastParticipantName,
          group: messageContent.group,
          partner: messageContent.partner,
          image: messageContent.image,
          unreadCount: messageContent.unreadCount,
          lastMessageId: messageContent.lastMessageId,
          partnerLastMessageId: messageContent.partnerLastMessageId,
          partnerLastDeliveredMessageId: messageContent.partnerLastDeliveredMessageId,
          type: messageContent.type,
          metadata: messageContent.metadata,
          mute: messageContent.mute,
          participantCount: messageContent.participantCount
        };

        // Add inviter if exist
        if (messageContent.inviter) {
          conversation.inviter = formatDataToMakeParticipant(messageContent.inviter);
        }

        // Add participants list if exist
        if (messageContent.participants && Array.isArray(messageContent.participants)) {
          conversation.participants = [];

          for (var i = 0; i < messageContent.participants.length; i++) {
            var participantData = formatDataToMakeParticipant(messageContent.participants[i]);
            if (participantData) {
              conversation.participants.push(participantData);
            }
          }
        }

        // Add lastMessageVO if exist
        if (messageContent.lastMessageVO) {
          conversation.lastMessageVO = formatDataToMakeMessage(messageContent.lastMessageVO);
        }

        return conversation;
      },

      formatDataToMakeReplyInfo = function(messageContent) {
        /**
         * + replyInfoVO                  {object : replyInfoVO}
         *   + participant                {object : ParticipantVO}
         *     - id                       {long}
         *     - name                     {string}
         *     - lastSeen                 {long}
         *   - repliedToMessageId         {long}
         *   - repliedToMessage           {string}
         */

        var replyInfo = {
          participant: formatDataToMakeParticipant(messageContent.participant),
          repliedToMessageId: messageContent.repliedToMessageId,
          repliedToMessage: messageContent.repliedToMessage
        };

        if (messageContent.participant) {
          replyInfo.participant = formatDataToMakeParticipant(messageContent.participant);
        }

        return replyInfo;
      },

      formatDataToMakeForwardInfo = function(messageContent) {
        /**
         * + forwardInfo                  {object : forwardInfoVO}
         *   + participant                {object : ParticipantVO}
         *     - id                       {long}
         *     - name                     {string}
         *     - lastSeen                 {long}
         *   + conversation               {object : ConversationSummary}
         *     - id                       {long}
         *     - title                    {string}
         *     - metadata                 {string}
         */

        var forwardInfo = {};

        if (messageContent.conversation) {
          forwardInfo.conversation = formatDataToMakeConversation(messageContent.conversation);
        }

        if (messageContent.participant) {
          forwardInfo.participant = formatDataToMakeParticipant(messageContent.participant);
        }

        return forwardInfo;
      },

      formatDataToMakeMessage = function(pushMessageVO) {
        /**
         * + MessageVO                       {object}
         *    - id                           {long}
         *    - uniqueId                     {string}
         *    - previousId                   {long}
         *    - message                      {string}
         *    - edited                       {boolean}
         *    - editable                     {boolean}
         *    - delivered                    {boolean}
         *    - seen                         {boolean}
         *    + participant                  {object : ParticipantVO}
         *      - id                         {long}
         *      - name                       {string}
         *      - lastSeen                   {long}
         *    + conversation                 {object : ConversationVO}
         *      - id                         {long}
         *      - title                      {string}
         *      - metadata                   {string}
         *    + replyInfoVO                  {object : replyInfoVO}
         *      + participant                {object : ParticipantVO}
         *        - id                       {long}
         *        - name                     {string}
         *        - lastSeen                 {long}
         *      - repliedToMessageId         {long}
         *      - repliedToMessage           {string}
         *    + forwardInfo                  {object : forwardInfoVO}
         *      + participant                {object : ParticipantVO}
         *        - id                       {long}
         *        - name                     {string}
         *        - lastSeen                 {long}
         *      + conversation               {object : ConversationVO}
         *        - id                       {long}
         *        - title                    {string}
         *        - metadata                 {string}
         *    - time                         {long}
         *    - metadata                     {string}
         */

        var message = {
          id: pushMessageVO.id,
          uniqueId: pushMessageVO.uniqueId,
          previousId: pushMessageVO.previousId,
          message: pushMessageVO.message,
          edited: pushMessageVO.edited,
          editable: pushMessageVO.editable,
          delivered: pushMessageVO.delivered,
          seen: pushMessageVO.seen,
          metaData: pushMessageVO.metadata,
          time: pushMessageVO.time
        };

        if (pushMessageVO.participant) {
          message.ownerId = pushMessageVO.participant.id;
        }

        if (pushMessageVO.conversation) {
          message.conversation = formatDataToMakeConversation(pushMessageVO.conversation);
          message.threadId = pushMessageVO.conversation.id;
        }

        if (pushMessageVO.replyInfoVO) {
          message.replyInfo = formatDataToMakeReplyInfo(pushMessageVO.replyInfoVO);
        }

        if (pushMessageVO.forwardInfo) {
          message.forwardInfo = formatDataToMakeForwardInfo(pushMessageVO.forwardInfo);
        }

        if (pushMessageVO.participant) {
          message.participant = formatDataToMakeParticipant(pushMessageVO.participant);
        }

        return message;
      },

      reformatThreadHistory = function(threadId, historyContent) {
        var returnData = [];

        for (var i = 0; i < historyContent.length; i++) {
          returnData.push(formatDataToMakeMessage(historyContent[i]));
        }

        return returnData;
      },

      reformatThreadParticipants = function(participantsContent) {
        var returnData = [];

        for (var i = 0; i < participantsContent.length; i++) {
          returnData.push(formatDataToMakeParticipant(participantsContent[i]));
        }

        return returnData;
      },

      fireEvent = function(eventName, param) {
        for (var id in eventCallbacks[eventName]) {
          eventCallbacks[eventName][id](param);
        }
      };

    /******************************************************
    *             P U B L I C   M E T H O D S             *
    *******************************************************/

    this.on = function(eventName, callback) {
      if (eventCallbacks[eventName]) {
        var id = Utility.generateUUID();
        eventCallbacks[eventName][id] = callback;
        return id;
      }
    };

    this.getPeerId = function() {
      asyncClient.asyncReady(function() {
        return peerId = asyncClient.getPeerId();
      });
    };

    this.getUserInfo = getUserInfo;

    this.getContacts = function(params, callback) {
      var count = 50,
        offset = 0,
        content = {};

      if (params) {
        if (typeof params.count === "number") {
          count = params.count;
        }

        if (typeof params.offset === "number") {
          offset = params.offset;
        }
      }

      content.count = count;
      content.offset = offset;

      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.GET_CONTACTS,
        content: content
      };

      return sendMessage(sendMessageParams, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode
          };

          if (!returnData.hasError) {
            var messageContent = result.result,
              messageLength = messageContent.length,
              resultData = {
                contacts: [],
                contentCount: result.contentCount,
                hasNext: (offset + count < result.contentCount && messageLength > 0),
                nextOffset: offset += messageLength
              },
              contactData;

            for (var i = 0; i < messageLength; i++) {
              contactData = formatDataToMakeContact(messageContent[i]);
              if (contactData) {
                resultData.contacts.push(contactData);
              }
            }

            returnData.result = resultData;
          }

          callback && callback(returnData);
        }
      });
    };

    this.getThreads = function(params, callback) {
      var count = 50,
        offset = 0,
        content = {};

      if (params) {
        if (typeof params.count === "number") {
          count = params.count;
        }

        if (typeof params.offset === "number") {
          offset = params.offset;
        }

        if (typeof params.name === "string") {
          content.name = params.name;
        }

        if (Array.isArray(params.threadIds)) {
          content.threadIds = params.threadIds;
        }

        if (typeof params.new === "boolean") {
          content.new = params.new;
        }
      }

      content.count = count;
      content.offset = offset;

      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.GET_THREADS,
        content: content
      };

      return sendMessage(sendMessageParams, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode
          };

          if (!returnData.hasError) {
            var messageContent = result.result,
              messageLength = messageContent.length,
              resultData = {
                threads: [],
                contentCount: result.contentCount,
                hasNext: (offset + count < result.contentCount && messageLength > 0),
                nextOffset: offset += messageLength
              },
              threadData;

            for (var i = 0; i < messageLength; i++) {
              threadData = createThread(messageContent[i], false);
              if (threadData) {
                resultData.threads.push(threadData);
              }
            }

            returnData.result = resultData;
          }

          callback && callback(returnData);
        }
      });
    };

    this.getHistory = function(params, callback) {
      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.GET_HISTORY,
        content: {},
        subjectId: params.threadId
      };

      if (typeof params.count === "number") {
        sendMessageParams.content.count = params.count;
      } else {
        sendMessageParams.content.count = config.getHistoryCount;
      }

      if (typeof params.offset === "number") {
        sendMessageParams.content.offset = params.offset;
      } else {
        sendMessageParams.content.offset = 0;
      }

      if (typeof params.firstMessageId != "undefined") {
        sendMessageParams.content.firstMessageId = params.firstMessageId;
      }

      if (typeof params.id != "undefined") {
        sendMessageParams.content.id = params.id;
      }

      if (typeof params.lastMessageId != "undefined") {
        sendMessageParams.content.lastMessageId = params.lastMessageId;
      }

      if (typeof params.order != "undefined") {
        sendMessageParams.content.order = params.order;
      }

      return sendMessage(sendMessageParams, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode
          };

          if (!returnData.hasError) {
            var messageContent = result.result,
              messageLength = messageContent.length,
              resultData = {
                history: reformatThreadHistory(params.threadId, messageContent),
                contentCount: result.contentCount,
                hasNext: (sendMessageParams.content.offset + sendMessageParams.content.count < result.contentCount && messageLength > 0),
                nextOffset: sendMessageParams.content.offset += messageLength
              };

            returnData.result = resultData;
          }

          callback && callback(returnData);
        }
      });
    };

    this.getThreadParticipants = function(params, callback) {
      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.THREAD_PARTICIPANTS,
        content: {},
        subjectId: params.threadId
      };

      if (typeof params.count === "number") {
        sendMessageParams.content.count = params.count;
      } else {
        sendMessageParams.content.count = config.getHistoryCount;
      }

      if (typeof params.offset === "number") {
        sendMessageParams.content.offset = params.offset;
      } else {
        sendMessageParams.content.offset = 0;
      }

      if (typeof params.name === "string") {
        content.name = params.name;
      }

      return sendMessage(sendMessageParams, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode
          };

          if (!returnData.hasError) {
            var messageContent = result.result,
              messageLength = messageContent.length,
              resultData = {
                participants: reformatThreadParticipants(messageContent),
                contentCount: result.contentCount,
                hasNext: (sendMessageParams.content.offset + sendMessageParams.content.count < result.contentCount && messageLength > 0),
                nextOffset: sendMessageParams.content.offset += messageLength
              };

            returnData.result = resultData;
          }

          callback && callback(returnData);
        }
      });
    };

    this.createThread = function(params, callback) {

      /**
       * + CreateThreadRequest    {object}
       *    - ownerSsoId          {string}
       *    + invitees            {object}
       *       -id                {string}
       *       -idType            {int} ** inviteeVOidTypes
       *    - title               {string}
       *    - type                {int} ** createThreadTypes
       */

      var content = {};

      if (params) {
        if (typeof params.title === "string") {
          content.title = params.title;
        }

        if (typeof params.type === "string") {
          var threadType = params.type;
          content.type = createThreadTypes[threadType];
        }

        if (Array.isArray(params.invitees)) {
          var tempInvitee;
          content.invitees = [];
          for (var i = 0; i < params.invitees.length; i++) {
            var tempInvitee = formatDataToMakeInvitee(params.invitees[i]);
            if (tempInvitee) {
              content.invitees.push(tempInvitee);
            }
          }
        }
      }

      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.CREATE_THREAD,
        content: content
      };

      return sendMessage(sendMessageParams, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode
          };

          if (!returnData.hasError) {
            var messageContent = result.result,
              resultData = {
                thread: createThread(messageContent)
              };

            returnData.result = resultData;
          }

          callback && callback(returnData);
        }
      });

    };

    this.renameThread = function(params, callback) {

      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.RENAME,
        subjectId: params.threadId
      };

      if (params) {
        if (typeof params.title === "string") {
          sendMessageParams.content = params.title;
        }
      }

      return sendMessage(sendMessageParams, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode
          };

          if (!returnData.hasError) {
            var messageContent = result.result,
              resultData = {
                thread: createThread(messageContent)
              };

            returnData.result = resultData;
          }

          callback && callback(returnData);
        }
      });
    };

    this.sendTextMessage = function(params, callbacks) {
      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.MESSAGE,
        subjectId: params.threadId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: params.uniqueId,
        metaData: params.metaData,
        pushMsgType: 4
      }, callbacks);
    };

    this.editMessage = function(params, callback) {
      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.EDIT_MESSAGE,
        subjectId: params.messageId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: params.uniqueId,
        metaData: params.metaData,
        pushMsgType: 4
      }, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode
          };

          if (!returnData.hasError) {
            var messageContent = result.result,
              resultData = {
                editedMessage: formatDataToMakeMessage(messageContent)
              };

            returnData.result = resultData;
          }

          callback && callback(returnData);
        }
      });
    };

    this.replyMessage = function(params, callbacks) {
      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.MESSAGE,
        subjectId: params.threadId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: params.uniqueId,
        metaData: params.metaData,
        pushMsgType: 4
      }, callbacks);
    };

    this.forwardMessage = function(params) {
      var callbacks = {};

      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.FORWARD_MESSAGE,
        subjectId: params.subjectId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: params.uniqueId,
        metaData: params.metaData,
        pushMsgType: 4
      }, callbacks);
    };

    this.deliver = function(params) {
      if (params.owner !== userInfo.id) {
        return sendMessage({chatMessageVOType: chatMessageVOTypes.DELIVERY, content: params.messageId, pushMsgType: 3});
      }
    }

    this.seen = function(params) {
      if (params.owner !== userInfo.id) {
        return sendMessage({chatMessageVOType: chatMessageVOTypes.SEEN, content: params.messageId, pushMsgType: 3});
      }
    }

    this.muteThread = function(params, callback) {
      var muteData = {
        chatMessageVOType: chatMessageVOTypes.MUTE_THREAD,
        subjectId: params.subjectId,
        content: {},
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      };

      return sendMessage(muteData, {
        onResult: function(result) {
          callback && callback(result);
        }
      });
    }

    this.unMuteThread = function(params, callback) {
      var muteData = {
        chatMessageVOType: chatMessageVOTypes.UNMUTE_THREAD,
        subjectId: params.subjectId,
        content: {},
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      };

      return sendMessage(muteData, {
        onResult: function(result) {
          callback && callback(result);
        }
      });
    }

    this.generateUUID = Utility.generateUUID;

    init();
  }

  if (typeof module !== 'undefined' && typeof module.exports != "undefined") {
    module.exports = Chat;
  } else {
    if (!window.POD) {
      window.POD = {};
    }
    window.POD.Chat = Chat;
  }

})();
