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
    } else {
      Async = POD.Async;
      ChatUtility = POD.ChatUtility;
    }

    /*******************************************************
     *          P R I V A T E   V A R I A B L E S          *
     *******************************************************/

    var Utility = new ChatUtility();

    var asyncClient,
      peerId,
      oldPeerId,
      token = params.token,
      eventCallbacks = {
        connect: {},
        disconnect: {},
        reconnect: {},
        serverRegister: {},
        message: {},
        forwardMessage: {},
        newThread: {},
        leaveThread: {},
        newParticipant: {},
        deliver: {},
        seen: {},
        sent: {},
        login: {},
        logout: {},
        report: {},
        chatReady: {}
      },
      messagesCallbacks = {},
      sendMessageCallbacks = {},
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
      config = {
        getHistoryCount: 100
      };

    /*******************************************************
     *            P R I V A T E   M E T H O D S            *
     *******************************************************/

    var init = function() {
        asyncClient = new Async(params);

        asyncClient.asyncReady(function() {
          peerId = asyncClient.getPeerId();
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
          // TODO: check if its needed to do some registeration here
          peerId = newPeerId;
          fireEvent("reconnect");
        });

        asyncClient.on("message", function(params, ack) {
          pushMessageHandler(params);
          ack && ack();
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
          token: params.token,
          tokenIssuer: 1
        };

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
            sendMessageCallbacks[uniqueId] = {};

            if (callbacks.onSent) {
              sendMessageCallbacks[uniqueId].onSent = callbacks.onSent;
            }

            if (callbacks.onSeen) {
              sendMessageCallbacks[uniqueId].onSeen = callbacks.onSeen;
            }

            if (callbacks.onDeliver) {
              sendMessageCallbacks[uniqueId].onDeliver = callbacks.onDeliver;
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
        *    - type           {int}
        *    + content        {string}
        *       -peerName     {string}
        *       -receivers[]  {long}
        *       -priority     {int}
        *       -messageId    {long}
        *       -ttl          {long}
        *       -content      {string}    Chat Message goes here after stringifying
        *    - trackId        {long}
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

        return {uniqueId: uniqueId}
      },

      pushMessageHandler = function(params) {
        var content = JSON.parse(params.content);
        receivedMessageHandler(content);
      },

      receivedMessageHandler = function(params) {
        var threadId = params.subjectId,
          type = params.type,
          messageContent = JSON.parse(params.content),
          uniqueId = params.uniqueId;

        switch (type) {

            // 1
          case chatMessageVOTypes.CREATE_THREAD:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
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

            // 13
          case chatMessageVOTypes.GET_CONTACTS:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            break;

            // 14
          case chatMessageVOTypes.GET_THREADS:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            break;

            // 15
          case chatMessageVOTypes.GET_HISTORY:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            break;

            // 28
          case chatMessageVOTypes.EDIT_MESSAGE:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            break;

            // 999
          case chatMessageVOTypes.ERROR:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(true, messageContent, messageContent, messageContent));
            break;
        }
      },

      chatMessageHandler = function(threadId, messageContent) {
        var message = reformatMessage(threadId, messageContent);
        fireEvent("message", message);
      },

      formatDataToMakeThread = function(messageContent) {
        /**
         * + Conversation                     {object}
         *    - threadId                      {long}
         *    - title                         {string}
         *    - participants                  {list : ParticipantVO}
         *    - time                          {long}
         *    - lastMessage                   {string}
         *    - lastParticipantName           {string}
         *    - group                         {boolean}
         *    - partner                       {long}
         *    - image                         {object : ImageInfo}
         *    - unreadCount                   {long}
         *    - lastMessageVO                 {object : Message}
         *    - partnerLastMessageId          {long}
         *    - partnerLastDeliveredMessageId {long}
         *    - type                          {int}
         *    - metadata                      {string}
         *    - mute                          {boolean}
         *    - participantCount              {long}
         */

        var participants = messageContent.participants,
          partnerId = messageContent.partnerId,
          conversationData = {
            threadId: messageContent.id,
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

        // Add lastMessageVO if exist
        if (messageContent.lastMessageVO) {
          try {
            conversationData.lastMessageVO = JSON.parse(messageContent.lastMessageVO);
          } catch (e) {
            conversationData.lastMessageVO = messageContent.lastMessageVO;
          }
        }

        // Add participants Array if exist
        if (participants && Array.isArray(participants)) {
          conversationData.participants = [];

          for (var i = 0; i < participants.length; i++) {
            var participantData = formatDataToMakeParticipant(participants[i]);
            if (participantData) {
              conversationData.participants.push(participantData);
            }
          }
        }

        return conversationData;
      },

      formatDataToMakeContact = function(messageContent) {
        /**
         * + Contact                          {object}
         *    - id                            {long}
         *    - firstName                     {string}
         *    - lastName                      {string}
         *    - email                         {string}
         *    - cellphoneNumber               {string}
         *    - uniqueId                      {string}
         *    - lastseen                      {long}
         *    - hasUser                       {boolean}
         */

        var contact = {
          id: messageContent.id,
          firstName: messageContent.firstName,
          lastName: messageContent.lastName,
          email: messageContent.email,
          cellphoneNumber: messageContent.cellphoneNumber,
          uniqueId: messageContent.uniqueId,
          lastseen: messageContent.lastseen,
          hasUser: messageContent.hasUser
        };

        return contact;
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
         *    - lastseen                     {long}
         *    - userId                       {long}
         */

        var participant = {
          id: messageContent.id,
          sendEnable: messageContent.sendEnable,
          receiveEnable: messageContent.receiveEnable,
          name: messageContent.name,
          myFriend: messageContent.myFriend,
          online: messageContent.online,
          lastseen: messageContent.lastseen,
          userId: messageContent.userId
        };

        if (messageContent.image)
          participant.image = messageContent.image;

        return participant;
      },

      reformatMessage = function(threadId, pushMessageVO) {
        // TODO: Message Structure?!
        return {
          threadId: threadId,
          messageId: pushMessageVO.id,
          participant: pushMessageVO.participant,
          message: pushMessageVO.message,
          metaData: pushMessageVO.metadata,
          uniqueId: pushMessageVO.uniqueId,
          seen: pushMessageVO.seen,
          delivered: pushMessageVO.delivered,
          replyInfoVO: pushMessageVO.replyInfoVO,
          forwardInfo: pushMessageVO.forwardInfo,
          previousId: pushMessageVO.previousId,
          owner: pushMessageVO.participant.id,
          time: pushMessageVO.time
        };
      },

      reformatThreadHistory = function(threadId, historyContent) {
        var returnData = [];

        for (var i = 0; i < historyContent.length; i++) {
          returnData.push(reformatMessage(threadId, historyContent[i]));
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

        // TODO: Multi Event Handling Here?!
        // if (eventName == "login" && isLogin) {
        //   callback(userData);
        // }
        //
        // if (eventName == "connect" && peerId) {
        //   callback();
        // }
        //
        // if (eventName == "serverRegister" && isRegisterInChatServer) {
        //   callback();
        // }

        return id;
      }
    };

    this.getPeerId = function() {
      asyncClient.asyncReady(function() {
        peerId = asyncClient.getPeerId();
      });
    };

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
        content: content,
        token: token
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
                hasNext: (count === messageLength && messageLength > 0),
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
        content: content,
        token: token,
        timeout: params.timeout
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
                hasNext: (count === messageLength && messageLength > 0),
                nextOffset: offset += messageLength
              },
              threadData;

            for (var i = 0; i < messageLength; i++) {
              threadData = formatDataToMakeThread(messageContent[i]);
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

    this.getThreadHistory = function(params, callback) {
      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.GET_HISTORY,
        token: token,
        content: {},
        subjectId: params.threadId,
        timeout: params.timeout
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
                hasHistory: (sendMessageParams.content.count === messageLength && messageLength > 0),
                hasNext: (sendMessageParams.content.count === messageLength && messageLength > 0),
                nextOffset: sendMessageParams.content.offset += messageLength
              },
              threadData;

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

        // TODO: ownerSsoId??
      }

      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.CREATE_THREAD,
        content: content,
        token: token
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
                thread: formatDataToMakeThread(messageContent)
              };

            returnData.result = resultData;
          }

          callback && callback(returnData);
        }
      });

    };

    this.send = function(params, callbacks) {
      return sendMessage({
        token: token,
        chatMessageVOType: chatMessageVOTypes.MESSAGE,
        subjectId: params.threadId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: params.uniqueId,
        metaData: params.metaData,
        timeout: params.timeout,
        pushMsgType: 4
      }, callbacks);
    };

    this.editMessage = function(params, callbacks) {
      return sendMessage({
        token: token,
        chatMessageVOType: chatMessageVOTypes.EDIT_MESSAGE,
        subjectId: params.messageId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: params.uniqueId,
        metaData: params.metaData,
        timeout: params.timeout,
        pushMsgType: 4
      }, callbacks);
    };

    this.deliver = function(params) {
      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.DELIVERY,
        token: token,
        content: params.messageId,
        pushMsgType: 4
      });
    }

    this.seen = function(params) {
      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.SEEN,
        token: token,
        content: params.messageId,
        pushMsgType: 4
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
