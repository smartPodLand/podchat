(function() {
  /*
   * Chat Module
   * @module chat
   *
   * @param {Object} params
   */
  var Async,
    ChatUtility,
    Request,
    FormData;

  function Chat(params) {
    if (typeof(require) !== "undefined" && typeof(exports) !== "undefined") {
      var Async = require('podasync'),
        ChatUtility = require('./utility/utility.js'),
        http = require('http'),
        Request = require('request'),
        FormData = require('form-data');
    } else {
      Async = POD.Async;
      ChatUtility = POD.ChatUtility;
      FormData = window.FormData;
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
        messageEvents: {},
        threadEvents: {},
        chatReady: {},
        error: {},
        chatState: {}
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
        LAST_SEEN_UPDATED: 31,
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
      SERVICE_ADDRESSES = {
        SSO_ADDRESS: params.ssoHost || "http://172.16.110.76",
        PLATFORM_ADDRESS: params.platformHost || "http://172.16.106.26:8080/hamsam"
      },
      SERVICES_PATH = {
        SSO_DEVICES: params.ssoGrantDevicesAddress || "/oauth2/grants/devices",
        ADD_CONTACTS: "/nzh/addContacts",
        UPDATE_CONTACTS: "/nzh/updateContacts",
        REMOVE_CONTACTS: "/nzh/removeContacts"
      },
      CHAT_ERRORS = {
        6000: "No Active Device found for this Token!",
        6001: "Invalid Token!",
        6002: "User not found!",
        6100: "Cant get UserInfo!",
        6101: "Getting User Info Retry Count exceeded 5 times; Connection Can Not Estabilish!",
        6200: "Network Error",
        6201: "URL is not clarified!"
      },
      getUserInfoRetry = 5,
      getUserInfoRetryCount = 0,
      asyncStateTypes = {
        0: "CONNECTING",
        1: "CONNECTED",
        2: "CLOSING",
        3: "CLOSED"
      },
      chatState = false,
      httpRequestTimeout = params.httpRequestTimeout || 20000;

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

          asyncClient.on("asyncReady", function() {
            peerId = asyncClient.getPeerId();

            if (!userInfo) {
              getUserInfo(function(userInfoResult) {
                if (!userInfoResult.hasError) {
                  userInfo = userInfoResult.result.user;
                  chatState = true;
                  fireEvent("chatReady");
                }
              });
            }
          });

          asyncClient.on("stateChange", function(state) {
            fireEvent("chatState", asyncStateTypes[state.socketState]);

            switch (state.socketState) {
              case 1: // CONNECTED
                chatState = true;
                ping();
                break;

              case 0: // CONNECTING
              case 2: // CLOSING
              case 3: // CLOSED
                chatState = false;
                break;
            }
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

          asyncClient.on("error", function(error) {
            fireEvent("error", {
              code: error.errorCode,
              message: error.errorMessage,
              error: error.errorEvent
            });
          });
        });
      },

      getDeviceIdWithToken = function(callback) {
        var deviceId;

        var params = {
          url: SERVICE_ADDRESSES.SSO_ADDRESS + SERVICES_PATH.SSO_DEVICES,
          method: "GET",
          headers: {
            "Authorization": "Bearer " + token
          }
        };

        httpRequest(params, function(result) {
          if (!result.hasError) {
            var devices = JSON.parse(result.result.responseText).devices;
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
                  message: CHAT_ERRORS[6000],
                  error: null
                });
              } else {
                callback(deviceId);
              }
            } else {
              fireEvent("error", {
                code: 6001,
                message: CHAT_ERRORS[6001],
                error: null
              });
            }
          } else {
            fireEvent("error", {
              code: result.errorCode,
              message: result.errorMessage,
              error: result
            });
          }
        });
      },

      httpRequest = function(params, callback) {
        var url = params.url,
          data = params.data,
          method = (typeof params.method == "string")
            ? params.method
            : "GET";

        if (!url) {
          callback({hasError: true, errorCode: 6201, errorMessage: CHAT_ERRORS[6201]});
          return;
        }

        if (isNode && Request) {
          var requestMethod = (params.method === "GET")
            ? Request.get
            : Request.post;

          // if (typeof data === "object") {
          //   var formData = new FormData;
          //   for (var i = 0; i < data.length; i++) {
          //     for (var key in data[i]) {
          //       formData.append(key, data[i][key]);
          //     }
          //   }
          //
          //   data = formData;
          // }

          requestMethod({
            url: url,
            formData: data,
            headers: params.headers
          }, function(error, response, body) {
            if (!error) {
              if (response.statusCode == 200) {
                callback && callback({
                  hasError: false,
                  result: {
                    responseText: body
                  }
                });
              } else {
                callback && callback({hasError: true, errorCode: response.statusCode, errorMessage: body});
              }
            } else {
              callback && callback({
                hasError: true,
                errorCode: 6200,
                errorMessage: CHAT_ERRORS[6200] + " (Request Error)",
                errorEvent: error
              });
            }
          });

          return;
        } else {
          var request = new XMLHttpRequest(),
            settings = params.settings;

          request.timeout = (settings && typeof settings.timeout === "number" && settings.timeout > 0)
            ? settings.timeout
            : httpRequestTimeout;

          request.addEventListener("error", function(event) {
            if (callback) {
              callback({
                hasError: true,
                errorCode: 6200,
                errorMessage: CHAT_ERRORS[6200] + " (XMLHttpRequest Error Event Listener)"
              });
            }
          }, false);

          try {
            if (typeof data === "object" && data !== null && method == "GET") {
              var keys = Object.keys(data);

              if (keys.length > 0) {
                url += "?";

                for (var i = 0; i < keys.length; i++) {
                  var key = keys[i];
                  url += key + "=" + data[key];
                  if (i < keys.length - 1) {
                    url += "&";
                  }
                }
              }
            } else if (typeof data === "string") {
              url += "?" + data;
            }

            request.open(method, url, true);

            if (typeof params.headers === "object") {
              for (var key in params.headers) {
                request.setRequestHeader(key, params.headers[key]);
              }
            }

            if (method === "POST" && data) {
              if (typeof data === "object") {
                var formData = new FormData;
                for (var key in data) {
                  formData.append(key, data[key]);
                }
                request.send(formData);
              } else {
                request.send(data);
              }
            } else {
              request.send();
            }
          } catch (e) {
            callback && callback({
              hasError: true,
              errorCode: 6200,
              errorMessage: CHAT_ERRORS[6200] + " (Request Catch Error)"
            });
          }

          request.onreadystatechange = function() {
            if (request.readyState == 4) {
              if (request.status == 200) {
                callback && callback({
                  hasError: false,
                  result: {
                    responseText: request.responseText,
                    responseHeaders: request.getAllResponseHeaders()
                  }
                });
              } else {
                if (callback) {
                  callback({
                    hasError: true,
                    errorCode: 6200,
                    errorMessage: CHAT_ERRORS[6200] + " (Request Status != 200)",
                    statusCode: request.status
                  });
                }
              }
            }
          };
        }
      },

      getUserInfo = function getUserInfoRecursive(callback) {
        getUserInfoRetryCount++;

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
              getUserInfoRetryCount = 0;
              callback && callback(returnData);
            } else {
              if (getUserInfoRetryCount > getUserInfoRetry) {
                fireEvent("error", {
                  code: 6101,
                  message: CHAT_ERRORS[6101],
                  error: null
                });
              } else {
                getUserInfoRecursive(callback);
              }
            }
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
        } else if (params.chatMessageVOType !== chatMessageVOTypes.PING) {
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
          if (currentTime - lastSentMessageTime > chatPingMessageInterval - 100) {
            ping();
          }
        }, chatPingMessageInterval);

        return {uniqueId: uniqueId}
      },

      ping = function() {
        if (chatState && peerId !== undefined) {
          sendMessage({chatMessageVOType: chatMessageVOTypes.PING, pushMsgType: 4});
        }
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
          messageContent = (typeof params.content === 'string')
            ? JSON.parse(params.content)
            : {},
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
              sendMessageCallbacks[uniqueId].onSent({uniqueId: uniqueId});
              delete(sendMessageCallbacks[uniqueId].onSent);
              threadCallbacks[threadId][uniqueId].onSent = true;
            }
            break;

            // 4
          case chatMessageVOTypes.DELIVERY:
            sendMessageCallbacksHandler(chatMessageVOTypes.DELIVERY, threadId, uniqueId);
            break;

            // 5
          case chatMessageVOTypes.SEEN:
            sendMessageCallbacksHandler(chatMessageVOTypes.SEEN, threadId, uniqueId);
            break;

            // 10
          case chatMessageVOTypes.RENAME:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));

            var threadRenameThreadId = messageContent.id;

            getThreads({
              threadIds: [threadRenameThreadId]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;

              fireEvent("threadEvents", {
                type: "THREAD_RENAME",
                result: {
                  thread: threads[0]
                }
              });
            });

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
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            }

            getThreads({
              threadIds: [threadId]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;

              fireEvent("threadEvents", {
                type: "THREAD_MUTE",
                result: {
                  thread: threads[0]
                }
              });
            });

            break;

            // 20
          case chatMessageVOTypes.UNMUTE_THREAD:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));

            getThreads({
              threadIds: [threadId]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;

              fireEvent("threadEvents", {
                type: "THREAD_UNMUTE",
                result: {
                  thread: threads[0]
                }
              });
            });

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
            fireEvent("threadEvents", {
              type: "THREAD_INFO_UPDATED",
              result: {
                thread: formatDataToMakeConversation(messageContent)
              }
            });
            break;

            // 31
          case chatMessageVOTypes.LAST_SEEN_UPDATED:
            getThreads({
              threadIds: [messageContent.conversationId]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;

              fireEvent("threadEvents", {
                type: "LAST_SEEN_UPDATED",
                result: {
                  thread: threads[0],
                  messageId: messageContent.messageId,
                  senderId: messageContent.participantId
                }
              });
            });

            break;

            // 999
          case chatMessageVOTypes.ERROR:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(true, messageContent.message, messageContent.code, messageContent, 0));

            fireEvent("error", {
              code: messageContent.code,
              message: messageContent.message,
              error: messageContent
            });
            break;
        }
      },

      sendMessageCallbacksHandler = function(actionType, threadId, uniqueId) {
        switch (actionType) {

          case chatMessageVOTypes.DELIVERY:
            if (threadCallbacks[threadId]) {
              var lastThreadCallbackIndex = Object.keys(threadCallbacks[threadId]).indexOf(uniqueId);
              if (lastThreadCallbackIndex !== undefined) {
                while (lastThreadCallbackIndex > -1) {
                  var tempUniqueId = Object.entries(threadCallbacks[threadId])[lastThreadCallbackIndex][0];
                  if (sendMessageCallbacks[tempUniqueId] && sendMessageCallbacks[tempUniqueId].onDeliver) {
                    if (threadCallbacks[threadId][tempUniqueId] && threadCallbacks[threadId][tempUniqueId].onSent) {
                      sendMessageCallbacks[tempUniqueId].onDeliver({uniqueId: tempUniqueId});
                      delete(sendMessageCallbacks[tempUniqueId].onDeliver);
                      threadCallbacks[threadId][tempUniqueId].onDeliver = true;
                    }
                  }

                  lastThreadCallbackIndex -= 1;
                }
              }
            }
            break;

          case chatMessageVOTypes.SEEN:
            if (threadCallbacks[threadId]) {
              var lastThreadCallbackIndex = Object.keys(threadCallbacks[threadId]).indexOf(uniqueId);
              if (lastThreadCallbackIndex !== undefined) {
                while (lastThreadCallbackIndex > -1) {
                  var tempUniqueId = Object.entries(threadCallbacks[threadId])[lastThreadCallbackIndex][0];

                  if (sendMessageCallbacks[tempUniqueId] && sendMessageCallbacks[tempUniqueId].onSeen) {
                    if (threadCallbacks[threadId][tempUniqueId] && threadCallbacks[threadId][tempUniqueId].onSent) {
                      if (!threadCallbacks[threadId][tempUniqueId].onDeliver) {
                        sendMessageCallbacks[tempUniqueId].onDeliver({uniqueId: tempUniqueId});
                        delete(sendMessageCallbacks[tempUniqueId].onDeliver);
                        threadCallbacks[threadId][tempUniqueId].onDeliver = true;
                      }

                      sendMessageCallbacks[tempUniqueId].onSeen({uniqueId: tempUniqueId});

                      delete(sendMessageCallbacks[tempUniqueId].onSeen);
                      threadCallbacks[threadId][tempUniqueId].onSeen = true;

                      if (threadCallbacks[threadId][tempUniqueId].onSent && threadCallbacks[threadId][tempUniqueId].onDeliver && threadCallbacks[threadId][tempUniqueId].onSeen) {
                        delete threadCallbacks[threadId][tempUniqueId];
                        delete sendMessageCallbacks[tempUniqueId];
                      }
                    }
                  }

                  lastThreadCallbackIndex -= 1;
                }
              }
            }
            break;

          default:
            break;
        }
      },

      chatMessageHandler = function(threadId, messageContent) {
        var message = formatDataToMakeMessage(threadId, messageContent);
        deliver({messageId: message.id, ownerId: message.participant.id});

        fireEvent("messageEvents", {
          type: "NEW_MESSAGE",
          result: {
            message: message
          }
        });
      },

      chatEditMessageHandler = function(threadId, messageContent) {
        var message = formatDataToMakeMessage(threadId, messageContent);

        fireEvent("messageEvents", {
          type: "EDIT_MESSAGE",
          result: {
            message: message
          }
        });
      },

      createThread = function(messageContent, addFromService) {
        var threadData = formatDataToMakeConversation(messageContent);
        if (addFromService) {
          fireEvent("threadEvents", {
            type: "NEW_THREAD",
            result: {
              thread: formatDataToMakeConversation(messageContent)
            }
          });
        }
        return threadData;
      },

      getThreads = function(params, callback) {
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
         *    - linkedUser                    {object : RelatedUserVO}
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
          hasUser: messageContent.hasUser,
          linkedUser: undefined
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
         *    - image                        {string}
         */

        var participant = {
          id: messageContent.id,
          sendEnable: messageContent.sendEnable,
          receiveEnable: messageContent.receiveEnable,
          name: messageContent.name,
          myFriend: messageContent.myFriend,
          online: messageContent.online,
          notSeenDuration: messageContent.notSeenDuration,
          userId: messageContent.userId,
          image: messageContent.image
        };

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
         *    - canEditInfo                   {boolean}
         */

        var conversation = {
          id: messageContent.id,
          joinDate: messageContent.joinDate,
          title: messageContent.title,
          inviter: undefined,
          participants: undefined,
          time: messageContent.time,
          lastMessage: messageContent.lastMessage,
          lastParticipantName: messageContent.lastParticipantName,
          group: messageContent.group,
          partner: messageContent.partner,
          image: messageContent.image,
          unreadCount: messageContent.unreadCount,
          lastMessageId: messageContent.lastMessageId,
          lastMessageVO: undefined,
          partnerLastMessageId: messageContent.partnerLastMessageId,
          partnerLastDeliveredMessageId: messageContent.partnerLastDeliveredMessageId,
          type: messageContent.type,
          metadata: messageContent.metadata,
          mute: messageContent.mute,
          participantCount: messageContent.participantCount,
          canEditInfo: messageContent.canEditInfo
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
          conversation.lastMessageVO = formatDataToMakeMessage(undefined, messageContent.lastMessageVO);
        }

        return conversation;
      },

      formatDataToMakeReplyInfo = function(messageContent) {
        /**
         * + replyInfoVO                  {object : replyInfoVO}
         *   - participant                {object : ParticipantVO}
         *   - repliedToMessageId         {long}
         *   - repliedToMessage           {string}
         */

        var replyInfo = {
          participant: undefined,
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
         *   - participant                {object : ParticipantVO}
         *   - conversation               {object : ConversationSummary}
         */

        var forwardInfo = {
          participant: undefined,
          conversation: undefined
        };

        if (messageContent.conversation) {
          forwardInfo.conversation = formatDataToMakeConversation(messageContent.conversation);
        }

        if (messageContent.participant) {
          forwardInfo.participant = formatDataToMakeParticipant(messageContent.participant);
        }

        return forwardInfo;
      },

      formatDataToMakeMessage = function(threadId, pushMessageVO) {
        /**
         * + MessageVO                       {object}
         *    - id                           {long}
         *    - threadId                     {long}
         *    - ownerId                      {long}
         *    - uniqueId                     {string}
         *    - previousId                   {long}
         *    - message                      {string}
         *    - edited                       {boolean}
         *    - editable                     {boolean}
         *    - delivered                    {boolean}
         *    - seen                         {boolean}
         *    - participant                  {object : ParticipantVO}
         *    - conversation                 {object : ConversationVO}
         *    - replyInfoVO                  {object : replyInfoVO}
         *    - forwardInfo                  {object : forwardInfoVO}
         *    - metadata                     {string}
         *    - time                         {long}
         */

        var message = {
          id: pushMessageVO.id,
          threadId: threadId,
          ownerId: undefined,
          uniqueId: pushMessageVO.uniqueId,
          previousId: pushMessageVO.previousId,
          message: pushMessageVO.message,
          edited: pushMessageVO.edited,
          editable: pushMessageVO.editable,
          delivered: pushMessageVO.delivered,
          seen: pushMessageVO.seen,
          participant: undefined,
          conversation: undefined,
          replyInfo: undefined,
          forwardInfo: undefined,
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

      formatDataToMakeMessageChangeState = function(messageContent) {
        /**
           * + MessageChangeStateVO       {object}
           *    - messageId               {long}
           *    - participantId           {long}
           *    - conversationId          {long}
           */

        var MessageChangeState = {
          messageId: messageContent.messageId,
          senderId: messageContent.participantId,
          threadId: messageContent.conversationId
        };

        return MessageChangeState;
      },

      reformatThreadHistory = function(threadId, historyContent) {
        var returnData = [];

        for (var i = 0; i < historyContent.length; i++) {
          returnData.push(formatDataToMakeMessage(threadId, historyContent[i]));
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

      deliver = function(params) {
        if (userInfo && params.ownerId !== userInfo.id) {
          return sendMessage({chatMessageVOType: chatMessageVOTypes.DELIVERY, content: params.messageId, pushMsgType: 3});
        }
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
      return peerId;
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

    this.getThreads = getThreads;

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

            if (messageLength > 0) {
              var lastMessage = messageContent.shift();
              deliver({messageId: lastMessage.id, ownerId: lastMessage.participant.id});
            }

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
                editedMessage: formatDataToMakeMessage(undefined, messageContent)
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

    this.forwardMessage = function(params, callbacks) {
      var threadId = params.subjectId,
        messageIdsList = JSON.parse(params.content),
        uniqueIdsList = [];

      for (i in messageIdsList) {
        var messageId = messageIdsList[i];

        if (!threadCallbacks[threadId]) {
          threadCallbacks[threadId] = {};
        }

        var uniqueId = Utility.generateUUID();
        uniqueIdsList.push(uniqueId);

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
      }

      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.FORWARD_MESSAGE,
        subjectId: params.subjectId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: JSON.stringify(uniqueIdsList),
        metaData: params.metaData,
        pushMsgType: 4
      }, callbacks);
    };

    this.deliver = deliver(params);

    this.seen = function(params) {
      if (userInfo && params.ownerId !== userInfo.id) {
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

    this.addContacts = function(params, callback) {
      var data = {};

      if (params) {
        if (typeof params.firstName === "string") {
          data.firstName = params.firstName;
        } else {
          data.firstName = "";
        }

        if (typeof params.lastName === "string") {
          data.lastName = params.lastName;
        } else {
          data.lastName = "";
        }

        if (typeof params.cellphoneNumber === "string") {
          data.cellphoneNumber = params.cellphoneNumber;
        } else {
          data.cellphoneNumber = "";
        }

        if (typeof params.email === "string") {
          data.email = params.email;
        } else {
          data.email = "";
        }

        data.uniqueId = Utility.generateUUID();
      }

      var requestParams = {
        url: SERVICE_ADDRESSES.PLATFORM_ADDRESS + SERVICES_PATH.ADD_CONTACTS,
        method: "POST",
        data: data,
        headers: {
          "_token_": token,
          "_token_issuer_": 1
        }
      };

      httpRequest(requestParams, function(result) {
        if (!result.hasError) {
          var responseData = JSON.parse(result.result.responseText);

          var returnData = {
            hasError: responseData.hasError,
            errorMessage: responseData.message,
            errorCode: responseData.errorCode
          };

          if (!responseData.hasError) {
            var messageContent = responseData.result,
              messageLength = responseData.result.length,
              resultData = {
                contacts: [],
                contentCount: messageLength
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

        } else {
          fireEvent("error", {
            code: result.errorCode,
            message: result.errorMessage,
            error: result
          });
        }
      });
    };

    this.updateContacts = function(params, callback) {
      var data = {};

      if (params) {
        if (typeof params.id === "string") {
          data.id = params.id;
        } else {
          fireEvent("error", {
            code: 999,
            message: "ID is required for Updating Contact!",
            error: undefined
          });
        }

        if (typeof params.firstName === "string") {
          data.firstName = params.firstName;
        } else {
          fireEvent("error", {
            code: 999,
            message: "firstName is required for Updating Contact!"
          });
        }

        if (typeof params.lastName === "string") {
          data.lastName = params.lastName;
        } else {
          fireEvent("error", {
            code: 999,
            message: "lastName is required for Updating Contact!"
          });
        }

        if (typeof params.cellphoneNumber === "string") {
          data.cellphoneNumber = params.cellphoneNumber;
        } else {
          fireEvent("error", {
            code: 999,
            message: "cellphoneNumber is required for Updating Contact!"
          });
        }

        if (typeof params.email === "string") {
          data.email = params.email;
        } else {
          fireEvent("error", {
            code: 999,
            message: "email is required for Updating Contact!"
          });
        }

        data.uniqueId = Utility.generateUUID();
      }

      var requestParams = {
        url: SERVICE_ADDRESSES.PLATFORM_ADDRESS + SERVICES_PATH.UPDATE_CONTACTS,
        method: "POST",
        data: data,
        headers: {
          "_token_": token,
          "_token_issuer_": 1
        }
      };

      httpRequest(requestParams, function(result) {
        if (!result.hasError) {
          var responseData = JSON.parse(result.result.responseText);

          var returnData = {
            hasError: responseData.hasError,
            errorMessage: responseData.message,
            errorCode: responseData.errorCode
          };

          if (!responseData.hasError) {
            var messageContent = responseData.result,
              messageLength = responseData.result.length,
              resultData = {
                contacts: [],
                contentCount: messageLength
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

        } else {
          fireEvent("error", {
            code: result.errorCode,
            message: result.errorMessage,
            error: result
          });
        }
      });
    };

    this.removeContacts = function(params, callback) {
      var data = {};

      if (params) {
        if (typeof params.id === "string") {
          data.id = params.id;
        } else {
          fireEvent("error", {
            code: 999,
            message: "ID is required for Deleting Contact!",
            error: undefined
          });
        }
      }

      var requestParams = {
        url: SERVICE_ADDRESSES.PLATFORM_ADDRESS + SERVICES_PATH.REMOVE_CONTACTS,
        method: "POST",
        data: data,
        headers: {
          "_token_": token,
          "_token_issuer_": 1
        }
      };

      httpRequest(requestParams, function(result) {
        if (!result.hasError) {
          var responseData = JSON.parse(result.result.responseText);

          var returnData = {
            hasError: responseData.hasError,
            errorMessage: responseData.message,
            errorCode: responseData.errorCode
          };

          if (!responseData.hasError) {
            returnData.result = responseData.result;
          }

          callback && callback(returnData);

        } else {
          fireEvent("error", {
            code: result.errorCode,
            message: result.errorMessage,
            error: result
          });
        }
      });
    };

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
