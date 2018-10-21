(function() {
  /*
   * Chat Module
   * @module chat
   *
   * @param {Object} params
   */
  var Async,
    ChatUtility,
    FormData,
    Request,
    Dexie;

  function Chat(params) {
    if (typeof(require) !== "undefined" && typeof(exports) !== "undefined") {
      Async = require('podasync'),
        ChatUtility = require('./utility/utility.js'),
        FormData = require('form-data'),
        Request = require('request');
        // Dexie = require('dexie');
      var http = require('http'),
        QueryString = require('querystring'),
        FS = require('fs'),
        Mime = require('mime'),
        Path = require("path");

      /**
       * Defining global variables for dexie to work in Node ENV
       */
      // const setGlobalVars = require('indexeddbshim');
      // global.window = global;
      // setGlobalVars();
      // Dexie.dependencies.indexedDB = setGlobalVars.shimIndexedDB;
      // Dexie.dependencies.IDBKeyRange = setGlobalVars.shimIndexedDB.modules.IDBKeyRange;
    } else {
      Async = POD.Async,
        ChatUtility = POD.ChatUtility,
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
      hasCache = (typeof Dexie != "undefined"),
      enableCache = params.enableCache || true,
      cacheDb = hasCache && enableCache,
      ssoGrantDevicesAddress = params.ssoGrantDevicesAddress,
      ssoHost = params.ssoHost,
      grantDeviceIdFromSSO = params.grantDeviceIdFromSSO || false,
      eventCallbacks = {
        connect: {},
        disconnect: {},
        reconnect: {},
        messageEvents: {},
        threadEvents: {},
        botEvents: {},
        fileUploadEvents: {},
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
        ADD_PARTICIPANT: 11,
        GET_STATUS: 12,
        GET_CONTACTS: 13,
        GET_THREADS: 14,
        GET_HISTORY: 15,
        CHANGE_TYPE: 16,
        REMOVED_FROM_THREAD: 17,
        REMOVE_PARTICIPANT: 18,
        MUTE_THREAD: 19,
        UNMUTE_THREAD: 20,
        UPDATE_THREAD_INFO: 21,
        FORWARD_MESSAGE: 22,
        USER_INFO: 23,
        USER_STATUS: 24,
        GET_BLOCKED: 25,
        RELATION_INFO: 26,
        THREAD_PARTICIPANTS: 27,
        EDIT_MESSAGE: 28,
        DELETE_MESSAGE: 29,
        THREAD_INFO_UPDATED: 30,
        LAST_SEEN_UPDATED: 31,
        GET_MESSAGE_DELEVERY_PARTICIPANTS: 32,
        GET_MESSAGE_SEEN_PARTICIPANTS: 33,
        BOT_MESSAGE: 40,
        SPAM_PV_THREAD: 41,
        LOGOUT: 100,
        ERROR: 999
      },
      inviteeVOidTypes = {
        TO_BE_USER_SSO_ID: 1,
        TO_BE_USER_CONTACT_ID: 2,
        TO_BE_USER_CELLPHONE_NUMBER: 3,
        TO_BE_USER_USERNAME: 4,
        TO_BE_USER_ID: 5 // only in P2P mode
      },
      createThreadTypes = {
        NORMAL: 0,
        OWNER_GROUP: 1,
        PUBLIC_GROUP: 2,
        CHANNEL_GROUP: 4,
        CHANNEL: 8
      },
      socketAddress = params.socketAddress,
      serverName = params.serverName || "",
      wsConnectionWaitTime = params.wsConnectionWaitTime,
      connectionRetryInterval = params.connectionRetryInterval,
      msgPriority = params.msgPriority || 1,
      messageTtl = params.messageTtl || 10000,
      reconnectOnClose = params.reconnectOnClose,
      asyncLogging = params.asyncLogging,
      chatPingMessageInterval = 20000,
      lastSentMessageTime,
      lastSentMessageTimeoutId,
      lastReceivedMessageTime,
      lastReceivedMessageTimeoutId,
      JSTimeLatency = 100,
      config = {
        getHistoryCount: 100
      },
      SERVICE_ADDRESSES = {
        SSO_ADDRESS: params.ssoHost || "http://172.16.110.76",
        PLATFORM_ADDRESS: params.platformHost || "http://172.16.106.26:8080/hamsam",
        FILESERVER_ADDRESS: params.fileServer || "http://172.16.106.26:8080/hamsam"
      },
      SERVICES_PATH = {
        SSO_DEVICES: "/oauth2/grants/devices",
        ADD_CONTACTS: "/nzh/addContacts",
        UPDATE_CONTACTS: "/nzh/updateContacts",
        REMOVE_CONTACTS: "/nzh/removeContacts",
        SEARCH_CONTACTS: "/nzh/listContacts",
        UPLOAD_IMAGE: "/nzh/uploadImage",
        GET_IMAGE: "/nzh/image/",
        UPLOAD_FILE: "/nzh/uploadFile",
        GET_FILE: "/nzh/file/"
      },
      imageMimeTypes = [
        "image/bmp",
        "image/png",
        "image/tiff",
        "image/gif",
        "image/x-icon",
        "image/jpeg",
        "image/webp"
      ],
      imageExtentions = [
        "bmp",
        "png",
        "tiff",
        "tiff2",
        "gif",
        "ico",
        "jpg",
        "jpeg",
        "webp"
      ],
      CHAT_ERRORS = {
        6000: "No Active Device found for this Token!",
        6001: "Invalid Token!",
        6002: "User not found!",
        6100: "Cant get UserInfo!",
        6101: "Getting User Info Retry Count exceeded 5 times; Connection Can Not Estabilish!",
        6200: "Network Error",
        6201: "URL is not clarified!",
        6300: "Error in uploading File!",
        6301: "Not an image!",
        6302: "No file has been selected!",
        6303: "File upload has been canceled!",
        6600: "Database is not defined and usable"
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
      chatFullStateObject = {},
      httpRequestObject = {},
      connectionCheckTimeout = params.connectionCheckTimeout,
      connectionCheckTimeoutThreshold = params.connectionCheckTimeoutThreshold,
      httpRequestTimeout = params.httpRequestTimeout || 20000,
      actualTimingLog = params.asyncLogging.actualTiming || false;

    // if (hasCache && enableCache) {
    //   var db = new Dexie('podChat');
    //   db.version(1).stores({
    //     contacts: '&id, &userId, cellphoneNumber, email, firstName, lastName'
    //   });
    // } else {
    //   console.log(new Error(CHAT_ERRORS[6600]));
    // }

    /*******************************************************
     *            P R I V A T E   M E T H O D S            *
     *******************************************************/

    var init = function() {
        if (grantDeviceIdFromSSO) {
          var getDeviceIdWithTokenTime = new Date().getTime();
          getDeviceIdWithToken(function(retrievedDeviceId) {

            if (actualTimingLog) {
              Utility.chatStepLogger("Get Device ID ", new Date().getTime() - getDeviceIdWithTokenTime);
            }

            deviceId = retrievedDeviceId;

            initAsync();
          });
        } else {
          initAsync();
        }
      },

      initAsync = function() {
        var asyncGetReadyTime = new Date().getTime();

        asyncClient = new Async({
          socketAddress: socketAddress,
          serverName: serverName,
          deviceId: deviceId,
          wsConnectionWaitTime: wsConnectionWaitTime,
          connectionRetryInterval: connectionRetryInterval,
          connectionCheckTimeout: connectionCheckTimeout,
          connectionCheckTimeoutThreshold: connectionCheckTimeoutThreshold,
          messageTtl: messageTtl,
          reconnectOnClose: reconnectOnClose,
          asyncLogging: asyncLogging
        });

        asyncClient.on("asyncReady", function() {
          if (actualTimingLog) {
            Utility.chatStepLogger("Async Connection ", new Date().getTime() - asyncGetReadyTime);
          }

          peerId = asyncClient.getPeerId();

          if (!userInfo) {
            var getUserInfoTime = new Date().getTime();

            getUserInfo(function(userInfoResult) {
              if (actualTimingLog) {
                Utility.chatStepLogger("Get User Info ", new Date().getTime() - getUserInfoTime);
              }

              if (!userInfoResult.hasError) {
                userInfo = userInfoResult.result.user;
                chatState = true;
                ping();
                fireEvent("chatReady");
              }
            });
          }
        });

        asyncClient.on("stateChange", function(state) {
          fireEvent("chatState", state);
          chatFullStateObject = state;
          switch (state.socketState) {
            case 1: // CONNECTED
              chatState = true;
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

          lastReceivedMessageTimeoutId && clearTimeout(lastReceivedMessageTimeoutId);

          lastReceivedMessageTime = new Date();

          lastReceivedMessageTimeoutId = setTimeout(function() {
            var currentDate = new Date();
            if (currentDate - lastReceivedMessageTime >= connectionCheckTimeout - JSTimeLatency) {
              asyncClient.reconnectSocket();
            }
          }, chatPingMessageInterval * 1.5);

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
          fileSize,
          originalFileName,
          threadId,
          fileUniqueId,
          fileObject,
          data = params.data,
          method = (typeof params.method == "string") ?
          params.method :
          "GET",
          fileUploadUniqueId = (typeof params.uniqueId == "string") ? params.uniqueId : "uniqueId",
          hasError = false;

        if (!url) {
          callback({
            hasError: true,
            errorCode: 6201,
            errorMessage: CHAT_ERRORS[6201]
          });
          return;
        }

        if (isNode && Request) {
          var headers = params.headers;

          if (params.method == "POST" && data) {
            if (data.hasOwnProperty("image") || data.hasOwnProperty("file")) {
              headers['Content-Type'] = 'multipart/form-data';
              var postFormData = {};

              for (var i in data) {
                if (i == "image" || i == "file") {
                  fileSize = data.fileSize;
                  originalFileName = data.originalFileName;
                  threadId = data.threadId;
                  fileUniqueId = data.uniqueId;
                  fileObject = data[i];
                  postFormData[i] = FS.createReadStream(data[i]);
                } else {
                  postFormData[i] = data[i];
                }
              }

              var r = httpRequestObject[eval(`fileUploadUniqueId`)] = Request.post({
                url: url,
                formData: postFormData,
                headers: headers
              }, function(error, response, body) {
                if (!error) {
                  if (response.statusCode == 200) {
                    var body = JSON.parse(body);
                    if (typeof body.hasError !== "undefined" && body.hasError) {
                      hasError = true;
                      fireEvent("fileUploadEvents", {
                        threadId: threadId,
                        uniqueId: fileUniqueId,
                        state: "UPLOAD_ERROR",
                        progress: 0,
                        fileInfo: {
                          fileName: originalFileName,
                          fileSize: fileSize
                        },
                        fileObject: params.file,
                        errorCode: body.errorCode,
                        errorMessage: body.message,
                        errorEvent: body
                      });

                      callback && callback({
                        hasError: true,
                        errorCode: body.errorCode,
                        errorMessage: body.message,
                        errorEvent: body
                      });
                    } else {
                      hasError = false;
                      fireEvent("fileUploadEvents", {
                        threadId: threadId,
                        uniqueId: fileUniqueId,
                        state: "UPLOADED",
                        progress: 100,
                        fileInfo: {
                          fileName: originalFileName,
                          fileSize: fileSize
                        },
                        fileObject: params.file
                      });

                      callback && callback({
                        hasError: false,
                        result: {
                          responseText: body
                        }
                      });
                    }
                  } else {
                    hasError = true;
                    fireEvent("fileUploadEvents", {
                      threadId: threadId,
                      uniqueId: fileUniqueId,
                      state: "UPLOAD_ERROR",
                      progress: 0,
                      fileInfo: {
                        fileName: originalFileName,
                        fileSize: fileSize
                      },
                      fileObject: params.file,
                      errorCode: response.statusCode,
                      errorMessage: body
                    });

                    callback && callback({
                      hasError: true,
                      errorCode: response.statusCode,
                      errorMessage: body
                    });
                  }
                } else {
                  hasError = true;
                  fireEvent("fileUploadEvents", {
                    threadId: threadId,
                    uniqueId: fileUniqueId,
                    state: "UPLOAD_ERROR",
                    progress: 0,
                    fileInfo: {
                      fileName: originalFileName,
                      fileSize: fileSize
                    },
                    fileObject: params.file,
                    errorCode: 6200,
                    errorMessage: CHAT_ERRORS[6200] + " (Request Error)",
                    errorEvent: error
                  });

                  callback && callback({
                    hasError: true,
                    errorCode: 6200,
                    errorMessage: CHAT_ERRORS[6200] + " (Request Error)",
                    errorEvent: error
                  });
                }
              }).on('abort', function() {
                hasError = true;
                fireEvent("fileUploadEvents", {
                  threadId: threadId,
                  uniqueId: fileUniqueId,
                  state: "UPLOAD_CANCELED",
                  progress: 0,
                  fileInfo: {
                    fileName: originalFileName,
                    fileSize: fileSize
                  },
                  fileObject: fileObject,
                  errorCode: 6303,
                  errorMessage: CHAT_ERRORS[6303]
                });
                callback({
                  hasError: true,
                  errorCode: 6303,
                  errorMessage: CHAT_ERRORS[6303]
                });
              });

              var oldPercent = 0;

              var q = setInterval(function() {
                if (r.req && r.req.connection) {
                  var dispatched = r.req.connection._bytesDispatched;
                  var percent = Math.round(dispatched * 100 / fileSize);

                  if (percent < 100 && !hasError) {
                    oldPercent = percent;
                    fireEvent("fileUploadEvents", {
                      threadId: threadId,
                      uniqueId: fileUniqueId,
                      state: "UPLOADING",
                      progress: percent,
                      fileInfo: {
                        fileName: originalFileName,
                        fileSize: fileSize
                      },
                      fileObject: params.file
                    });
                  } else {
                    clearInterval(q);
                  }
                }
              }, 10);

            } else {
              headers['Content-Type'] = 'application/x-www-form-urlencoded';
              data = QueryString.stringify(data);
              Request.post({
                url: url,
                body: data,
                headers: headers
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
                    callback && callback({
                      hasError: true,
                      errorCode: response.statusCode,
                      errorMessage: body
                    });
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
            }
          } else if (params.method == "GET") {
            if (typeof data === "object") {
              data = QueryString.stringify(data);
              url += "?" + data;
            } else if (typeof data === "string") {
              url += "?" + data;
            }
            Request.get({
              url: url,
              headers: headers
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
                  callback && callback({
                    hasError: true,
                    errorCode: response.statusCode,
                    errorMessage: body
                  });
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
          }
        } else {
          var hasFile = false;

          httpRequestObject[eval(`fileUploadUniqueId`)] = new XMLHttpRequest(),
            settings = params.settings;

          httpRequestObject[eval(`fileUploadUniqueId`)].timeout = (settings && typeof parseInt(settings.timeout) > 0 && settings.timeout > 0) ?
            settings.timeout :
            httpRequestTimeout;

          httpRequestObject[eval(`fileUploadUniqueId`)].addEventListener("error", function(event) {
            if (callback) {
              if (hasFile) {
                hasError = true;
                fireEvent("fileUploadEvents", {
                  threadId: threadId,
                  uniqueId: fileUniqueId,
                  state: "UPLOAD_ERROR",
                  progress: 0,
                  fileInfo: {
                    fileName: originalFileName,
                    fileSize: fileSize
                  },
                  fileObject: fileObject,
                  errorCode: 6200,
                  errorMessage: CHAT_ERRORS[6200] + " (XMLHttpRequest Error Event Listener)"
                });
              }
              callback({
                hasError: true,
                errorCode: 6200,
                errorMessage: CHAT_ERRORS[6200] + " (XMLHttpRequest Error Event Listener)"
              });
            }
          }, false);


          httpRequestObject[eval(`fileUploadUniqueId`)].addEventListener("abort", function(event) {
            if (callback) {
              if (hasFile) {
                hasError = true;
                fireEvent("fileUploadEvents", {
                  threadId: threadId,
                  uniqueId: fileUniqueId,
                  state: "UPLOAD_CANCELED",
                  progress: 0,
                  fileInfo: {
                    fileName: originalFileName,
                    fileSize: fileSize
                  },
                  fileObject: fileObject,
                  errorCode: 6303,
                  errorMessage: CHAT_ERRORS[6303]
                });
              }
              callback({
                hasError: true,
                errorCode: 6303,
                errorMessage: CHAT_ERRORS[6303]
              });
            }
          }, false);

          try {
            if (method == "GET") {
              if (typeof data === "object" && data !== null) {
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
              } else if (typeof data === "string" && data !== null) {
                url += "?" + data;
              }

              httpRequestObject[eval(`fileUploadUniqueId`)].open(method, url, true);

              if (typeof params.headers === "object") {
                for (var key in params.headers) {
                  httpRequestObject[eval(`fileUploadUniqueId`)].setRequestHeader(key, params.headers[key]);
                }
              }

              httpRequestObject[eval(`fileUploadUniqueId`)].send();
            }

            if (method === "POST" && data) {

              httpRequestObject[eval(`fileUploadUniqueId`)].open(method, url, true);

              if (typeof params.headers === "object") {
                for (var key in params.headers) {
                  httpRequestObject[eval(`fileUploadUniqueId`)].setRequestHeader(key, params.headers[key]);
                }
              }

              if (typeof data == "object") {
                if (data.hasOwnProperty("image") || data.hasOwnProperty("file")) {
                  hasFile = true;
                  var formData = new FormData();
                  for (var key in data) {
                    formData.append(key, data[key]);
                  }

                  fileSize = data.fileSize;
                  originalFileName = data.originalFileName;
                  threadId = data.threadId;
                  fileUniqueId = data.uniqueId;
                  fileObject = (data["image"]) ? data["image"] : data["file"];

                  httpRequestObject[eval(`fileUploadUniqueId`)].upload.onprogress = function(event) {
                    if (event.lengthComputable && !hasError) {
                      fireEvent("fileUploadEvents", {
                        threadId: threadId,
                        uniqueId: fileUniqueId,
                        state: "UPLOADING",
                        progress: Math.round((event.loaded / event.total) * 100),
                        fileInfo: {
                          fileName: originalFileName,
                          fileSize: fileSize
                        },
                        fileObject: fileObject
                      });
                    }
                  };

                  httpRequestObject[eval(`fileUploadUniqueId`)].send(formData);
                } else {
                  httpRequestObject[eval(`fileUploadUniqueId`)].setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

                  var keys = Object.keys(data);

                  if (keys.length > 0) {
                    sendData = "";

                    for (var i = 0; i < keys.length; i++) {
                      var key = keys[i];
                      sendData += key + "=" + data[key];
                      if (i < keys.length - 1) {
                        sendData += "&";
                      }
                    }
                  }

                  httpRequestObject[eval(`fileUploadUniqueId`)].send(sendData);
                }
              } else {
                httpRequestObject[eval(`fileUploadUniqueId`)].send(data);
              }
            }
          } catch (e) {
            callback && callback({
              hasError: true,
              errorCode: 6200,
              errorMessage: CHAT_ERRORS[6200] + " (Request Catch Error)" + e
            });
          }

          httpRequestObject[eval(`fileUploadUniqueId`)].onreadystatechange = function() {
            if (httpRequestObject[eval(`fileUploadUniqueId`)].readyState == 4) {
              if (httpRequestObject[eval(`fileUploadUniqueId`)].status == 200) {
                if (hasFile) {
                  hasError = false;
                  fireEvent("fileUploadEvents", {
                    threadId: threadId,
                    uniqueId: fileUniqueId,
                    state: "UPLOADED",
                    progress: 100,
                    fileInfo: {
                      fileName: originalFileName,
                      fileSize: fileSize
                    },
                    fileObject: fileObject
                  });
                }

                callback && callback({
                  hasError: false,
                  result: {
                    responseText: httpRequestObject[eval(`fileUploadUniqueId`)].responseText,
                    responseHeaders: httpRequestObject[eval(`fileUploadUniqueId`)].getAllResponseHeaders()
                  }
                });
              } else {
                if (hasFile) {
                  hasError = true;
                  fireEvent("fileUploadEvents", {
                    threadId: threadId,
                    uniqueId: fileUniqueId,
                    state: "UPLOAD_ERROR",
                    progress: 0,
                    fileInfo: {
                      fileName: originalFileName,
                      fileSize: fileSize
                    },
                    fileObject: fileObject,
                    errorCode: 6200,
                    errorMessage: CHAT_ERRORS[6200] + " (Request Status != 200)",
                    statusCode: httpRequestObject[eval(`fileUploadUniqueId`)].status
                  });
                }
                if (callback) {
                  callback({
                    hasError: true,
                    errorCode: 6200,
                    errorMessage: CHAT_ERRORS[6200] + " (Request Status != 200)",
                    statusCode: httpRequestObject[eval(`fileUploadUniqueId`)].status
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
         * + ChatMessage        {object}
         *    - token           {string}
         *    - tokenIssuer     {string}
         *    - type            {int}
         *    - subjectId       {long}
         *    - uniqueId        {string}
         *    - content         {string}
         *    - time            {long}
         *    - medadata        {string}
         *    - systemMedadata  {string}
         *    - repliedTo       {long}
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

        if (params.systemMetadata) {
          messageVO.systemMetadata = params.systemMetadata;
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
         *       -priority     {int}       Priority of message 1-10, lower has more priority
         *       -messageId    {long}      Id of message on your side, not required
         *       -ttl          {long}      Time to live for message in milliseconds
         *       -content      {string}    Chat Message goes here after stringifying
         *    - trackId        {long}      Tracker id of message that you receive from DIRANA previously (if you are replying a sync message)
         */

        var data = {
          type: (parseInt(params.pushMsgType) > 0) ?
            params.pushMsgType : 3,
          content: {
            peerName: serverName,
            priority: msgPriority,
            content: JSON.stringify(messageVO),
            ttl: messageTtl
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
          if (currentTime - lastSentMessageTime > chatPingMessageInterval - 100 && chatState) {
            ping();
          }
        }, chatPingMessageInterval);

        return {
          uniqueId: uniqueId,
          threadId: threadId,
          participant: userInfo,
          content: params.content
        }
      },

      ping = function() {
        if (chatState && peerId !== undefined && userInfo !== undefined) {
          sendMessage({
            chatMessageVOType: chatMessageVOTypes.PING,
            pushMsgType: 4
          });
        } else {
          lastSentMessageTimeoutId && clearTimeout(lastSentMessageTimeoutId);
        }
      },

      clearCache = function() {
        sendMessage({
          chatMessageVOType: chatMessageVOTypes.LOGOUT,
          pushMsgType: 4
        });
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
          messageContent = (typeof params.content === 'string') ?
          JSON.parse(params.content) : {},
          contentCount = params.contentCount,
          uniqueId = params.uniqueId;

        switch (type) {
          // 1
          case chatMessageVOTypes.CREATE_THREAD:
            messageContent.uniqueId = uniqueId;
            createThread(messageContent, true);

            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));

            break;

            // 2
          case chatMessageVOTypes.MESSAGE:
            chatMessageHandler(threadId, messageContent);
            break;

            // 3
          case chatMessageVOTypes.SENT:
            if (sendMessageCallbacks[uniqueId] && sendMessageCallbacks[uniqueId].onSent) {
              sendMessageCallbacks[uniqueId].onSent({
                uniqueId: uniqueId
              });
              delete(sendMessageCallbacks[uniqueId].onSent);
              threadCallbacks[threadId][uniqueId].onSent = true;
            }
            break;

            // 4
          case chatMessageVOTypes.DELIVERY:
            // TODO: CACHE

            getHistory({
              offset: 0,
              threadId: threadId,
              id: messageContent.messageId
            }, function(result) {
              if (!result.hasError) {
                fireEvent("messageEvents", {
                  type: "MESSAGE_DELIVERY",
                  result: {
                    message: result.result.history[0],
                    threadId: threadId,
                    senderId: messageContent.participantId
                  }
                });
              }
            });
            sendMessageCallbacksHandler(chatMessageVOTypes.DELIVERY, threadId, uniqueId);
            break;

            // 5
          case chatMessageVOTypes.SEEN:
            // TODO: CACHE

            getHistory({
              offset: 0,
              threadId: threadId,
              id: messageContent.messageId
            }, function(result) {
              if (!result.hasError) {
                fireEvent("messageEvents", {
                  type: "MESSAGE_SEEN",
                  result: {
                    message: result.result.history[0],
                    threadId: threadId,
                    senderId: messageContent.participantId
                  }
                });
              }
            });

            sendMessageCallbacksHandler(chatMessageVOTypes.SEEN, threadId, uniqueId);
            break;

            // 6
          case chatMessageVOTypes.PING:
            break;

            // 7
          case chatMessageVOTypes.BLOCK:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            }
            break;

            // 8
          case chatMessageVOTypes.UNBLOCK:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            }
            break;

            // 9
          case chatMessageVOTypes.LEAVE_THREAD:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));

            getThreads({
              threadIds: [threadId]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;
              if (threads.length > 0) {
                fireEvent("threadEvents", {
                  type: "THREAD_LEAVE_PARTICIPANT",
                  result: {
                    thread: threads[0]
                  }
                });

                fireEvent("threadEvents", {
                  type: "THREAD_LAST_ACTIVITY_TIME",
                  result: {
                    thread: threads[0]
                  }
                });
              } else {
                fireEvent("threadEvents", {
                  type: "THREAD_LEAVE_PARTICIPANT",
                  result: {
                    threadId: threadId
                  }
                });
              }
            });
            break;

            // 11
          case chatMessageVOTypes.ADD_PARTICIPANT:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));

            getThreads({
              threadIds: [messageContent.id]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;

              fireEvent("threadEvents", {
                type: "THREAD_ADD_PARTICIPANTS",
                result: {
                  thread: threads[0]
                }
              });

              fireEvent("threadEvents", {
                type: "THREAD_LAST_ACTIVITY_TIME",
                result: {
                  thread: threads[0]
                }
              });
            });
            break;

            //13
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

            // 17
          case chatMessageVOTypes.REMOVED_FROM_THREAD:
            fireEvent("threadEvents", {
              type: "THREAD_REMOVED_FROM",
              result: {
                thread: threadId
              }
            });
            break;

            // 18
          case chatMessageVOTypes.REMOVE_PARTICIPANT:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));

            getThreads({
              threadIds: [threadId]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;

              fireEvent("threadEvents", {
                type: "THREAD_REMOVE_PARTICIPANTS",
                result: {
                  thread: threads[0]
                }
              });

              fireEvent("threadEvents", {
                type: "THREAD_LAST_ACTIVITY_TIME",
                result: {
                  thread: threads[0]
                }
              });
            });
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

            // 21
          case chatMessageVOTypes.UPDATE_THREAD_INFO:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            }

            getThreads({
              threadIds: [messageContent.id]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;

              fireEvent("threadEvents", {
                type: "THREAD_INFO_UPDATED",
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


            // 25
          case chatMessageVOTypes.GET_BLOCKED:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            }
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

            // 29
          case chatMessageVOTypes.DELETE_MESSAGE:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));


            fireEvent("messageEvents", {
              type: "MESSAGE_DELETE",
              result: {
                message: {
                  id: messageContent,
                  threadId: threadId
                }
              }
            });
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
                type: "THREAD_UNREAD_COUNT_UPDATED",
                result: {
                  thread: threads[0],
                  messageId: messageContent.messageId,
                  senderId: messageContent.participantId
                }
              });

              fireEvent("threadEvents", {
                type: "THREAD_LAST_ACTIVITY_TIME",
                result: {
                  thread: threads[0]
                }
              });
            });

            break;

            //40
          case chatMessageVOTypes.BOT_MESSAGE:
            fireEvent("botEvents", {
              type: "BOT_MESSAGE",
              result: {
                bot: messageContent // todo: data will be formated
              }
            });
            break;

            // 41
          case chatMessageVOTypes.SPAM_PV_THREAD:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            }
            break;

            // 999
          case chatMessageVOTypes.ERROR:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(true, messageContent.message, messageContent.code, messageContent, 0));

            if (messageContent.code == 21) {
              chatState = false;
              asyncClient.logout();
              clearCache();
            }

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
                      sendMessageCallbacks[tempUniqueId].onDeliver({
                        uniqueId: tempUniqueId
                      });
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
                        sendMessageCallbacks[tempUniqueId].onDeliver({
                          uniqueId: tempUniqueId
                        });
                        delete(sendMessageCallbacks[tempUniqueId].onDeliver);
                        threadCallbacks[threadId][tempUniqueId].onDeliver = true;
                      }

                      sendMessageCallbacks[tempUniqueId].onSeen({
                        uniqueId: tempUniqueId
                      });

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
        deliver({
          messageId: message.id,
          ownerId: message.participant.id
        });

        fireEvent("messageEvents", {
          type: "MESSAGE_NEW",
          result: {
            message: message
          }
        });

        getThreads({
          threadIds: [threadId]
        }, function(threadsResult) {
          var threads = threadsResult.result.threads;

          if (messageContent.participant.id !== userInfo.id) {
            fireEvent("threadEvents", {
              type: "THREAD_UNREAD_COUNT_UPDATED",
              result: {
                thread: threads[0],
                messageId: messageContent.id,
                senderId: messageContent.participant.id
              }
            });
          }

          fireEvent("threadEvents", {
            type: "THREAD_LAST_ACTIVITY_TIME",
            result: {
              thread: threads[0]
            }
          });
        });
      },

      chatEditMessageHandler = function(threadId, messageContent) {
        var message = formatDataToMakeMessage(threadId, messageContent);

        fireEvent("messageEvents", {
          type: "MESSAGE_EDIT",
          result: {
            message: message
          }
        });
      },

      createThread = function(messageContent, addFromService) {
        var threadData = formatDataToMakeConversation(messageContent);
        if (addFromService) {
          fireEvent("threadEvents", {
            type: "THREAD_NEW",
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
          if (parseInt(params.count) > 0) {
            count = params.count;
          }

          if (parseInt(params.offset) > 0) {
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

      getHistory = function(params, callback) {
        var sendMessageParams = {
          chatMessageVOType: chatMessageVOTypes.GET_HISTORY,
          content: {
            count: 50,
            offset: 0
          },
          subjectId: params.threadId
        };

        if (parseInt(params.count) > 0) {
          sendMessageParams.content.count = params.count;
        }

        if (parseInt(params.offset) > 0) {
          sendMessageParams.content.offset = params.offset;
        }

        if (parseInt(params.firstMessageId) > 0) {
          sendMessageParams.content.firstMessageId = params.firstMessageId;
        }

        if (parseInt(params.lastMessageId) > 0) {
          sendMessageParams.content.lastMessageId = params.lastMessageId;
        }

        if (typeof params.order != "undefined") {
          sendMessageParams.content.order = params.order;
        }

        if (typeof params.query != "undefined") {
          sendMessageParams.content.query = params.query;
        }

        if (typeof params.metadataCriteria == "object" && params.metadataCriteria.hasOwnProperty("field")) {
          sendMessageParams.content.metadataCriteria = params.metadataCriteria;
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
                deliver({
                  messageId: lastMessage.id,
                  ownerId: lastMessage.participant.id
                });
              }

              returnData.result = resultData;
            }

            callback && callback(returnData);
          }
        });
      },

      updateThreadInfo = function(params, callback) {
        var updateThreadInfoData = {
          chatMessageVOType: chatMessageVOTypes.UPDATE_THREAD_INFO,
          subjectId: params.threadId,
          content: {},
          pushMsgType: 4,
          token: token
        };

        if (params) {
          if (parseInt(params.threadId) > 0) {
            updateThreadInfoData.subjectId = params.threadId;
          } else {
            fireEvent("error", {
              code: 999,
              message: "Thread ID is required for Updating thread info!"
            });
          }

          if (typeof params.image == "string") {
            updateThreadInfoData.content.image = params.image;
          }

          if (typeof params.description == "string") {
            updateThreadInfoData.content.description = params.description;
          }

          if (typeof params.title == "string") {
            updateThreadInfoData.content.name = params.title;
          }

          if (typeof params.metadata == "object") {
            updateThreadInfoData.content.metadata = JSON.stringify(params.metadata);
          } else if (typeof params.metadata == "string") {
            updateThreadInfoData.content.metadata = params.metadata;
          }
        }

        return sendMessage(updateThreadInfoData, {
          onResult: function(result) {
            callback && callback(result);
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
         *    - userId                        {long}
         *    - firstName                     {string}
         *    - lastName                      {string}
         *    - image                         {string}
         *    - email                         {string}
         *    - cellphoneNumber               {string}
         *    - uniqueId                      {string}
         *    - notSeenDuration               {long}
         *    - hasUser                       {boolean}
         *    - linkedUser                    {object : RelatedUserVO}
         */

        var contact = {
          id: messageContent.id,
          userId: messageContent.userId,
          firstName: messageContent.firstName,
          lastName: messageContent.lastName,
          image: messageContent.profileImage,
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

      formatDataToMakeBlockedUser = function(messageContent) {
        /**
         * + BlockedUser              {object}
         *    - id                    {long}
         *    - firstName             {string}
         *    - lastName              {string}
         *    - nickName              {string}
         */

        var blockedUser = {
          blockId: messageContent.id,
          firstName: messageContent.firstName,
          lastName: messageContent.lastName,
          nickName: messageContent.nickName
        };

        return blockedUser;
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
         *    - firstName                    {string}
         *    - lastName                     {string}
         *    - name                         {string}
         *    - cellphoneNumber              {string}
         *    - email                        {string}
         *    - myFriend                     {boolean}
         *    - online                       {boolean}
         *    - blocked                      {boolean}
         *    - notSeenDuration              {long}
         *    - contactId                    {long}
         *    - image                        {string}
         *    - contactName                  {string}
         *    - contactFirstname             {string}
         *    - contactLastname              {string}
         */

        var participant = {
          id: messageContent.id,
          sendEnable: messageContent.sendEnable,
          receiveEnable: messageContent.receiveEnable,
          firstName: messageContent.firstName,
          lastName: messageContent.lastName,
          name: messageContent.name,
          cellphoneNumber: messageContent.cellphoneNumber,
          email: messageContent.email,
          myFriend: messageContent.myFriend,
          online: messageContent.online,
          blocked: messageContent.blocked,
          notSeenDuration: messageContent.notSeenDuration,
          contactId: messageContent.contactId,
          image: messageContent.image,
          contactName: messageContent.contactName,
          contactFirstname: messageContent.contactFirstname,
          contactLastname: messageContent.contactLastname
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
         *    - lastParticipantImage          {string}
         *    - image                         {string}
         *    - description                   {string}
         *    - unreadCount                   {long}
         *    - lastSeenMessageId             {long}
         *    - lastMessageVO                 {object : ChatMessageVO}
         *    - partnerLastSeenMessageId      {long}
         *    - partnerLastDeliveredMessageId {long}
         *    - type                          {int}
         *    - metadata                      {string}
         *    - mute                          {boolean}
         *    - participantCount              {long}
         *    - canEditInfo                   {boolean}
         *    - canSpam                       {boolean}
         *    - admin                         {boolean}
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
          lastParticipantImage: messageContent.lastParticipantImage,
          image: messageContent.image,
          description: messageContent.description,
          unreadCount: messageContent.unreadCount,
          lastSeenMessageId: messageContent.lastSeenMessageId,
          lastMessageVO: undefined,
          partnerLastSeenMessageId: messageContent.partnerLastSeenMessageId,
          partnerLastDeliveredMessageId: messageContent.partnerLastDeliveredMessageId,
          type: messageContent.type,
          metadata: messageContent.metadata,
          mute: messageContent.mute,
          participantCount: messageContent.participantCount,
          canEditInfo: messageContent.canEditInfo,
          canSpam: messageContent.canSpam,
          admin: messageContent.admin
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
         *    - messageType                  {int}
         *    - edited                       {boolean}
         *    - editable                     {boolean}
         *    - delivered                    {boolean}
         *    - seen                         {boolean}
         *    - participant                  {object : ParticipantVO}
         *    - conversation                 {object : ConversationVO}
         *    - replyInfo                    {object : replyInfoVO}
         *    - forwardInfo                  {object : forwardInfoVO}
         *    - metadata                     {string}
         *    - systemMetadata               {string}
         *    - time                         {long}
         */

        var message = {
          id: pushMessageVO.id,
          threadId: threadId,
          ownerId: undefined,
          uniqueId: pushMessageVO.uniqueId,
          previousId: pushMessageVO.previousId,
          message: pushMessageVO.message,
          messageType: pushMessageVO.messageType,
          edited: pushMessageVO.edited,
          editable: pushMessageVO.editable,
          delivered: pushMessageVO.delivered,
          seen: pushMessageVO.seen,
          participant: undefined,
          conversation: undefined,
          replyInfo: undefined,
          forwardInfo: undefined,
          metaData: pushMessageVO.metadata,
          systemMetadata: pushMessageVO.systemMetadata,
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
          return sendMessage({
            chatMessageVOType: chatMessageVOTypes.DELIVERY,
            content: params.messageId,
            pushMsgType: 3
          });
        }
      },

      /**
       * Get Image.
       *
       * This functions gets an uploaded image from File Server.
       *
       * @since 3.9.9
       * @access public
       *
       * @param {long}    imageId         ID of image
       * @param {int}     width           Required width to get
       * @param {int}     height          Required height to get
       * @param {boolean} actual          Required height to get
       * @param {boolean} downloadable    TRUE to be downloadable / FALSE to not
       * @param {string}  hashCode        HashCode of uploaded file
       *
       * @return {object} Image Object
       */
      getImage = function(params, callback) {
        getImageData = {};

        if (params) {
          if (parseInt(params.imageId) > 0) {
            getImageData.imageId = params.imageId;
          }

          if (typeof params.hashCode == "string") {
            getImageData.hashCode = params.hashCode;
          }

          if (parseInt(params.width) > 0) {
            getImageData.width = params.width;
          }

          if (parseInt(params.height) > 0) {
            getImageData.height = params.height;
          }

          if (parseInt(params.actual) > 0) {
            getImageData.actual = params.actual;
          }

          if (parseInt(params.downloadable) > 0) {
            getImageData.downloadable = params.downloadable;
          }
        }

        httpRequest({
          url: SERVICE_ADDRESSES.FILESERVER_ADDRESS + SERVICES_PATH.GET_IMAGE,
          method: "GET",
          data: getImageData
        }, function(result) {
          if (!result.hasError) {
            var queryString = "?";
            for (var i in params) {
              queryString += i + "=" + params[i] + "&";
            }
            queryString = queryString.slice(0, -1);
            var image = SERVICE_ADDRESSES.FILESERVER_ADDRESS + SERVICES_PATH.GET_IMAGE + queryString;
            callback({
              hasError: result.hasError,
              result: image
            });
          } else {
            callback({
              hasError: true
            });
          }
        });
      },

      /**
       * Get File.
       *
       * This functions gets an uploaded file from File Server.
       *
       * @since 3.9.9
       * @access public
       *
       * @param {long}    fileId          ID of file
       * @param {boolean} downloadable    TRUE to be downloadable / False to not
       * @param {string}  hashCode        HashCode of uploaded file
       *
       * @return {object} File Object
       */
      getFile = function(params, callback) {
        getFileData = {};

        if (params) {
          if (typeof params.fileId != "undefined") {
            getFileData.fileId = params.fileId;
          }

          if (typeof params.hashCode == "string") {
            getFileData.hashCode = params.hashCode;
          }

          if (typeof params.downloadable == "boolean") {
            getFileData.downloadable = params.downloadable;
          }
        }

        httpRequest({
          url: SERVICE_ADDRESSES.FILESERVER_ADDRESS + SERVICES_PATH.GET_FILE,
          method: "GET",
          data: getFileData
        }, function(result) {
          if (!result.hasError) {
            var queryString = "?";
            for (var i in params) {
              queryString += i + "=" + params[i] + "&";
            }
            queryString = queryString.slice(0, -1);
            var file = SERVICE_ADDRESSES.FILESERVER_ADDRESS + SERVICES_PATH.GET_FILE + queryString;
            callback({
              hasError: result.hasError,
              result: file
            });
          } else {
            callback({
              hasError: true
            });
          }
        });
      },

      /**
       * Upload File
       *
       * Upload files to File Server
       *
       * @since 3.9.9
       * @access public
       *
       * @param {string}  fileName        A name for the file
       * @param {file}    file            FILE: the file
       *
       * @link http://docs.pod.land/v1.0.8.0/Developer/CustomPost/605/File
       *
       * @return {object} Uploaded File Object
       */
      uploadFile = function(params, callback) {
        var fileName,
          fileType,
          fileSize,
          fileExtension,
          uploadUniqueId,
          uploadThreadId;

        if (isNode) {
          fileName = params.file.split('/').pop();
          fileType = Mime.getType(params.file);
          fileSize = FS.statSync(params.file).size;
          fileExtension = params.file.split('.').pop();
        } else {
          fileName = params.file.name;
          fileType = params.file.type;
          fileSize = params.file.size;
          fileExtension = params.file.name.split('.').pop();
        }

        var uploadFileData = {};

        if (params) {
          if (typeof params.file !== "undefined") {
            uploadFileData.file = params.file;
          }

          if (typeof params.fileName == "string") {
            uploadFileData.fileName = params.fileName;
          } else {
            uploadFileData.fileName = Utility.generateUUID() + "." + fileExtension;
          }

          uploadFileData.fileSize = fileSize;

          if (parseInt(params.threadId) > 0) {
            uploadThreadId = params.threadId;
            uploadFileData.threadId = params.threadId;
          } else {
            uploadThreadId = 0;
            uploadFileData.threadId = 0;
          }

          if (typeof params.uniqueId == "string") {
            uploadUniqueId = params.uniqueId;
            uploadFileData.uniqueId = params.uniqueId;
          } else {
            uploadUniqueId = Utility.generateUUID();
            uploadFileData.uniqueId = uploadUniqueId;
          }

          if (typeof params.originalFileName == "string") {
            uploadFileData.originalFileName = params.originalFileName;
          } else {
            uploadFileData.originalFileName = fileName;
          }
        }

        httpRequest({
          url: SERVICE_ADDRESSES.FILESERVER_ADDRESS + SERVICES_PATH.UPLOAD_FILE,
          method: "POST",
          headers: {
            "_token_": token,
            "_token_issuer_": 1
          },
          data: uploadFileData,
          uniqueId: uploadUniqueId
        }, (result) => {
          if (!result.hasError) {
            try {
              var response = (typeof result.result.responseText == "string") ? JSON.parse(result.result.responseText) : result.result.responseText;
              callback({
                hasError: response.hasError,
                result: response.result
              });
            } catch (e) {
              callback({
                hasError: true,
                errorCode: 999,
                errorMessage: "Problem in Parsing result"
              });
            }

          } else {
            callback({
              hasError: true,
              errorCode: result.errorCode,
              errorMessage: result.errorMessage
            });
          }
        });

        return {
          uniqueId: uploadUniqueId,
          threadId: uploadThreadId,
          participant: userInfo,
          content: {
            caption: params.content,
            file: {
              uniqueId: uploadUniqueId,
              fileName: fileName,
              fileSize: fileSize,
              fileObject: params.file
            }
          }
        }
      },

      /**
       * Upload Image
       *
       * Upload images to Image Server
       *
       * @since 3.9.9
       * @access public
       *
       * @param {string}  fileName        A name for the file
       * @param {file}    image           FILE: the image file  (if its an image file)
       * @param {float}   xC              Crop Start point x    (if its an image file)
       * @param {float}   yC              Crop Start point Y    (if its an image file)
       * @param {float}   hC              Crop size Height      (if its an image file)
       * @param {float}   wC              Crop size Weight      (if its an image file)
       *
       * @link http://docs.pod.land/v1.0.8.0/Developer/CustomPost/215/UploadImage
       *
       * @return {object} Uploaded Image Object
       */
      uploadImage = function(params, callback) {
        var fileName,
          fileType,
          fileSize,
          fileExtension,
          uploadUniqueId,
          uploadThreadId;

        if (isNode) {
          fileName = params.image.split('/').pop();
          fileType = Mime.getType(params.image);
          fileSize = FS.statSync(params.image).size;
          fileExtension = params.image.split('.').pop();
        } else {
          fileName = params.image.name;
          fileType = params.image.type;
          fileSize = params.image.size;
          fileExtension = params.image.name.split('.').pop();
        }

        if (imageMimeTypes.indexOf(fileType) > 0 || imageExtentions.indexOf(fileExtension) > 0) {
          uploadImageData = {};

          if (params) {
            if (typeof params.image !== "undefined") {
              uploadImageData.image = params.image;
              uploadImageData.file = params.image;
            }

            if (typeof params.fileName == "string") {
              uploadImageData.fileName = params.fileName;
            } else {
              uploadImageData.fileName = Utility.generateUUID() + "." + fileExtension;
            }

            uploadImageData.fileSize = fileSize;

            if (parseInt(params.threadId) > 0) {
              uploadThreadId = params.threadId;
              uploadImageData.threadId = params.threadId;
            } else {
              uploadThreadId = 0;
              uploadImageData.threadId = 0;
            }

            if (typeof params.uniqueId == "string") {
              uploadUniqueId = params.uniqueId;
              uploadImageData.uniqueId = params.uniqueId;
            } else {
              uploadUniqueId = Utility.generateUUID();
              uploadImageData.uniqueId = uploadUniqueId;
            }

            if (typeof params.originalFileName == "string") {
              uploadImageData.originalFileName = params.originalFileName;
            } else {
              uploadImageData.originalFileName = fileName;
            }

            if (parseInt(params.xC) > 0) {
              uploadImageData.xC = params.xC;
            }

            if (parseInt(params.yC) > 0) {
              uploadImageData.yC = params.yC;
            }

            if (parseInt(params.hC) > 0) {
              uploadImageData.hC = params.hC;
            }

            if (parseInt(params.wC) > 0) {
              uploadImageData.wC = params.wC;
            }
          }

          httpRequest({
            url: SERVICE_ADDRESSES.FILESERVER_ADDRESS + SERVICES_PATH.UPLOAD_IMAGE,
            method: "POST",
            headers: {
              "_token_": token,
              "_token_issuer_": 1
            },
            data: uploadImageData,
            uniqueId: uploadUniqueId
          }, (result) => {
            if (!result.hasError) {
              try {
                var response = (typeof result.result.responseText == "string") ? JSON.parse(result.result.responseText) : result.result.responseText;
                if (typeof response.hasError !== "undefined" && !response.hasError) {
                  callback({
                    hasError: response.hasError,
                    result: response.result
                  });
                } else {
                  callback({
                    hasError: true,
                    errorCode: response.errorCode,
                    errorMessage: response.message
                  });
                }
              } catch (e) {
                callback({
                  hasError: true,
                  errorCode: 6300,
                  errorMessage: CHAT_ERRORS[6300]
                });
              }
            } else {
              callback({
                hasError: true,
                errorCode: result.errorCode,
                errorMessage: result.errorMessage
              });
            }
          });

          return {
            uniqueId: uploadUniqueId,
            threadId: uploadThreadId,
            participant: userInfo,
            content: {
              caption: params.content,
              file: {
                uniqueId: uploadUniqueId,
                fileName: fileName,
                fileSize: fileSize,
                fileObject: params.file
              }
            }
          }
        } else {
          callback({
            hasError: true,
            errorCode: 6301,
            errorMessage: CHAT_ERRORS[6301]
          });
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

    this.getCurrentUser = function() {
      return userInfo;
    }

    this.getUserInfo = getUserInfo;

    this.getContacts = function(params, callback) {
      var count = 50,
        offset = 0,
        content = {};

      if (params) {
        if (parseInt(params.count) > 0) {
          count = params.count;
        }

        if (parseInt(params.offset) > 0) {
          offset = params.offset;
        }

        if (typeof params.name === "string") {
          content.name = params.name;
        }
      }

      content.size = count;
      content.offset = offset;

      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.GET_CONTACTS,
        content: content
      };

      // if (cacheDb && db) {
      //   console.log("Dashagh injam");
      //   db.contacts
      //     .offset(offset)
      //     .limit(count)
      //     .toArray()
      //     .then((contacts) => {
      //       console.log("retrieved form cache", contacts);
      //     }).catch((e) => {
      //       console.log(e);
      //     });
      //   console.log("Zadam ta javabesh biad");
      // }

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

    this.getHistory = getHistory;

    this.getThreadParticipants = function(params, callback) {
      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.THREAD_PARTICIPANTS,
        content: {},
        subjectId: params.threadId
      };

      if (parseInt(params.count) > 0) {
        sendMessageParams.content.count = params.count;
      } else {
        sendMessageParams.content.count = config.getHistoryCount;
      }

      if (parseInt(params.offset) > 0) {
        sendMessageParams.content.offset = params.offset;
      } else {
        sendMessageParams.content.offset = 0;
      }

      if (parseInt(params.firstMessageId) > 0) {
        sendMessageParams.content.firstMessageId = params.firstMessageId;
      }
      if (parseInt(params.lastMessageId) > 0) {
        sendMessageParams.content.lastMessageId = params.lastMessageId;
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

    this.addParticipants = function(params, callback) {

      /**
       * + AddParticipantsRequest   {object}
       *    - subjectId             {long}
       *    + content               {list} List of CONTACT IDs
       *       -id                  {long}
       *    - uniqueId              {string}
       */

      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.ADD_PARTICIPANT
      };

      if (params) {
        if (parseInt(params.threadId) > 0) {
          sendMessageParams.subjectId = params.threadId;
        }

        if (Array.isArray(params.contacts)) {
          sendMessageParams.content = params.contacts;
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

    this.removeParticipants = function(params, callback) {

      /**
       * + RemoveParticipantsRequest    {object}
       *    - subjectId                 {long}
       *    + content                   {list} List of PARTICIPANT IDs from Thread's Participants object
       *       -id                      {long}
       *    - uniqueId                  {string}
       */

      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.REMOVE_PARTICIPANT
      };

      if (params) {
        if (parseInt(params.threadId) > 0) {
          sendMessageParams.subjectId = params.threadId;
        }

        if (Array.isArray(params.participants)) {
          sendMessageParams.content = params.participants;
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

    this.leaveThread = function(params, callback) {

      /**
       * + LeaveThreadRequest    {object}
       *    - subjectId          {long}
       *    - uniqueId           {string}
       */

      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.LEAVE_THREAD
      };

      if (params) {
        if (parseInt(params.threadId) > 0) {
          sendMessageParams.subjectId = params.threadId;
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

    this.sendTextMessage = function(params, callbacks) {
      var metaData = {};

      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.MESSAGE,
        subjectId: params.threadId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: params.uniqueId,
        systemMetadata: JSON.stringify(params.metaData),
        metaData: JSON.stringify(metaData),
        pushMsgType: 4
      }, callbacks);
    };

    this.sendBotMessage = function(params, callbacks) {
      var metaData = {};

      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.BOT_MESSAGE,
        subjectId: params.messageId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: params.uniqueId,
        receiver: params.receiver,
        systemMetadata: JSON.stringify(params.metaData),
        metaData: JSON.stringify(metaData),
        pushMsgType: 4
      }, callbacks);
    };

    this.sendFileMessage = function(params, callbacks) {
      var metaData = {},
        fileUploadParams = {},
        fileUniqueId = Utility.generateUUID();

      if (params) {
        if (typeof params.file != "undefined") {

          var fileName,
            fileType,
            fileSize,
            fileExtension;

          if (isNode) {
            fileName = params.file.split('/').pop();
            fileType = Mime.getType(params.file);
            fileSize = FS.statSync(params.file).size;
            fileExtension = params.file.split('.').pop();
          } else {
            fileName = params.file.name;
            fileType = params.file.type;
            fileSize = params.file.size;
            fileExtension = params.file.name.split('.').pop();
          }

          fireEvent("fileUploadEvents", {
            threadId: params.threadId,
            uniqueId: fileUniqueId,
            state: "NOT_STARTED",
            progress: 0,
            fileInfo: {
              fileName: fileName,
              fileSize: fileSize
            },
            fileObject: params.file
          });

          /**
           * File is a valid Image
           * Should upload to image server
           */
          if (imageMimeTypes.indexOf(fileType) > 0 || imageExtentions.indexOf(fileExtension) > 0) {
            fileUploadParams.image = params.file;

            if (typeof params.xC == "string") {
              fileUploadParams.xC = params.xC;
            }

            if (typeof params.yC == "string") {
              fileUploadParams.yC = params.yC;
            }

            if (typeof params.hC == "string") {
              fileUploadParams.hC = params.hC;
            }

            if (typeof params.wC == "string") {
              fileUploadParams.wC = params.wC;
            }
          } else {
            fileUploadParams.file = params.file;
          }

          metaData["file"] = {};

          metaData["file"]["originalName"] = fileName;
          metaData["file"]["mimeType"] = fileType;
          metaData["file"]["size"] = fileSize;

          if (typeof params.fileName == "string") {
            fileUploadParams.fileName = params.fileName;
          } else {
            fileUploadParams.fileName = fileUniqueId;
          }

          fileUploadParams.threadId = params.threadId;
          fileUploadParams.uniqueId = fileUniqueId;
          fileUploadParams.fileObject = params.file;
          fileUploadParams.originalFileName = fileName;

          var customeUniqueId = Utility.generateUUID();

          if (imageMimeTypes.indexOf(fileType) > 0 || imageExtentions.indexOf(fileExtension) > 0) {
            uploadImage(fileUploadParams, function(result) {
              if (!result.hasError) {
                metaData["file"]["actualHeight"] = result.result.actualHeight;
                metaData["file"]["actualWidth"] = result.result.actualWidth;
                metaData["file"]["height"] = result.result.height;
                metaData["file"]["width"] = result.result.width;
                metaData["file"]["name"] = result.result.name;
                metaData["file"]["hashCode"] = result.result.hashCode;
                metaData["file"]["id"] = result.result.id;
                metaData["file"]["link"] = SERVICE_ADDRESSES.FILESERVER_ADDRESS + SERVICES_PATH.GET_IMAGE + "?imageId=" + result.result.id + "&hashCode=" + result.result.hashCode;

                sendMessage({
                  chatMessageVOType: chatMessageVOTypes.MESSAGE,
                  subjectId: params.threadId,
                  repliedTo: params.repliedTo,
                  content: params.content,
                  subjectId: params.threadId,
                  repliedTo: params.repliedTo,
                  content: params.content,
                  metaData: JSON.stringify(metaData),
                  systemMetadata: JSON.stringify(params.metaData),
                  uniqueId: customeUniqueId,
                  pushMsgType: 4
                }, callbacks);
              }
            });
          } else {
            uploadFile(fileUploadParams, function(result) {
              if (!result.hasError) {
                metaData["file"]["name"] = result.result.name;
                metaData["file"]["hashCode"] = result.result.hashCode;
                metaData["file"]["id"] = result.result.id;
                metaData["file"]["link"] = SERVICE_ADDRESSES.FILESERVER_ADDRESS + SERVICES_PATH.GET_FILE + "?fileId=" + result.result.id + "&hashCode=" + result.result.hashCode;

                sendMessage({
                  chatMessageVOType: chatMessageVOTypes.MESSAGE,
                  subjectId: params.threadId,
                  repliedTo: params.repliedTo,
                  content: params.content,
                  subjectId: params.threadId,
                  repliedTo: params.repliedTo,
                  content: params.content,
                  metaData: JSON.stringify(metaData),
                  systemMetadata: JSON.stringify(params.metaData),
                  uniqueId: customeUniqueId,
                  pushMsgType: 4
                }, callbacks);
              }
            });
          }

          return {
            uniqueId: customeUniqueId,
            threadId: params.threadId,
            participant: userInfo,
            content: {
              caption: params.content,
              file: {
                uniqueId: fileUniqueId,
                fileName: fileName,
                fileSize: fileSize,
                fileObject: params.file
              }
            }
          }

        } else {
          fireEvent("error", {
            code: 6302,
            message: CHAT_ERRORS[6302]
          });
        }
      }
    };

    this.getImage = getImage;

    this.getFile = getFile;

    this.uploadFile = uploadFile;

    this.uploadImage = uploadImage;

    this.cancelFileUpload = function(params, callback) {
      if (params) {
        if (typeof params.uniqueId == "string") {
          var uniqueId = params.uniqueId;
          httpRequestObject[eval(`uniqueId`)] && httpRequestObject[eval(`uniqueId`)].abort();
          httpRequestObject[eval(`uniqueId`)] && delete(httpRequestObject[eval(`uniqueId`)]);
          callback && callback();
        }
      }
      return;
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

    this.deleteMessage = function(params, callback) {
      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.DELETE_MESSAGE,
        subjectId: params.messageId,
        uniqueId: params.uniqueId,
        content: JSON.stringify({
          'deleteForAll': params.deleteForAll
        }),
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
                deletedMessage: {
                  id: result.result
                }
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
        return sendMessage({
          chatMessageVOType: chatMessageVOTypes.SEEN,
          content: params.messageId,
          pushMsgType: 3
        });
      }
    }

    this.updateThreadInfo = updateThreadInfo;

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

    this.spamPvThread = function(params, callback) {
      var spamData = {
        chatMessageVOType: chatMessageVOTypes.SPAM_PV_THREAD,
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      };

      if (params) {
        if (parseInt(params.threadId) > 0) {
          spamData.subjectId = params.threadId;
        }
      }

      return sendMessage(spamData, {
        onResult: function(result) {
          callback && callback(result);
        }
      });
    }

    this.block = function(params, callback) {

      var blockData = {
        chatMessageVOType: chatMessageVOTypes.BLOCK,
        content: {},
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      };

      if (params) {
        if (parseInt(params.contactId) > 0) {
          blockData.content.contactId = params.contactId;
        }
      }

      return sendMessage(blockData, {
        onResult: function(result) {
          if (typeof result.result == "object") {
            result.result = formatDataToMakeBlockedUser(result.result);
          }
          callback && callback(result);
        }
      });
    }

    this.unblock = function(params, callback) {
      var unblockData = {
        chatMessageVOType: chatMessageVOTypes.UNBLOCK,
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      };

      if (params) {
        if (parseInt(params.blockId) > 0) {
          unblockData.subjectId = params.blockId;
        }
      }

      return sendMessage(unblockData, {
        onResult: function(result) {
          if (typeof result.result == "object") {
            result.result = formatDataToMakeBlockedUser(result.result);
          }

          callback && callback(result);
        }
      });
    }

    this.getBlocked = function(params, callback) {
      var count = 50,
        offset = 0,
        content = {};

      if (params) {
        if (parseInt(params.count) > 0) {
          count = params.count;
        }

        if (parseInt(params.offset) > 0) {
          offset = params.offset;
        }
      }

      content.count = count;
      content.offset = offset;

      var getBlockedData = {
        chatMessageVOType: chatMessageVOTypes.GET_BLOCKED,
        content: content,
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      };

      return sendMessage(getBlockedData, {
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
                blockedUsers: [],
                contentCount: result.contentCount,
                hasNext: (offset + count < result.contentCount && messageLength > 0),
                nextOffset: offset += messageLength
              },
              blockedUser;

            for (var i = 0; i < messageLength; i++) {
              blockedUser = formatDataToMakeBlockedUser(messageContent[i]);
              if (blockedUser) {
                resultData.blockedUsers.push(blockedUser);
              }
            }

            returnData.result = resultData;
          }

          callback && callback(returnData);
        }
      });
    };

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
        if (parseInt(params.id) > 0) {
          data.id = parseInt(params.id);
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
        method: "GET",
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
        if (parseInt(params.id) > 0) {
          data.id = parseInt(params.id);
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

    this.searchContacts = function(params, callback) {
      var data = {
        size: 50,
        offset: 0
      };

      if (params) {
        if (typeof params.firstName === "string") {
          data.firstName = params.firstName;
        }

        if (typeof params.lastName === "string") {
          data.lastName = params.lastName;
        }

        if (parseInt(params.cellphoneNumber) > 0) {
          data.cellphoneNumber = params.cellphoneNumber;
        }

        if (typeof params.email === "string") {
          data.email = params.email;
        }

        if (typeof params.q === "string") {
          data.q = params.q;
        }

        if (typeof params.uniqueId === "string") {
          data.uniqueId = params.uniqueId;
        }

        if (parseInt(params.id) > 0) {
          data.id = params.id;
        }

        if (parseInt(params.typeCode) > 0) {
          data.typeCode = params.typeCode;
        }

        if (parseInt(params.size) > 0) {
          data.size = params.size;
        }

        if (parseInt(params.offset) > 0) {
          data.offset = params.offset;
        }
      }

      var requestParams = {
        url: SERVICE_ADDRESSES.PLATFORM_ADDRESS + SERVICES_PATH.SEARCH_CONTACTS,
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
    }

    this.generateUUID = Utility.generateUUID;

    this.logout = function() {
      asyncClient.logout();
    };

    this.clearCache = clearCache;

    this.getChatState = function() {
      return chatFullStateObject;
    }

    this.reconnect = function() {
      asyncClient.reconnectSocket();
    }

    this.setToken = function(newToken) {
      if (typeof newToken != "undefined") {
        token = newToken;
      }
    };

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
