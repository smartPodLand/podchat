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
        Request = require('request'),
        Dexie = require('dexie').default || require('dexie');

      var http = require('http'),
        QueryString = require('querystring'),
        FS = require('fs'),
        Mime = require('mime'),
        Path = require("path");

      /**
       * Defining global variables for dexie to work in Node ENV
       */
      if (typeof global !== "undefined" && ({}).toString.call(global) === '[object global]') {
        var setGlobalVars = require('indexeddbshim'),
          shim = {};
        setGlobalVars(shim, {
          checkOrigin: false
        });
        var {
          indexedDB,
          IDBKeyRange
        } = shim;
        Dexie.dependencies.indexedDB = indexedDB;
        Dexie.dependencies.IDBKeyRange = IDBKeyRange;
      }
    } else {
      Async = POD.Async,
        ChatUtility = POD.ChatUtility,
        FormData = window.FormData,
        Dexie = window.Dexie;
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
      generalTypeCode = params.typeCode,
      mapApiKey = params.mapApiKey || "8b77db18704aa646ee5aaea13e7370f4f88b9e8c",
      deviceId,
      isNode = Utility.isNode(),
      db,
      queueDb,
      hasCache = (typeof Dexie != "undefined"),
      enableCache = (params.enableCache && typeof params.enableCache === "boolean") ?
      params.enableCache :
      false,
      cacheExpireTime = params.cacheExpireTime || 2 * 24 * 60 * 60 * 1000,
      cacheDb = hasCache && enableCache,
      cacheSecret = "urlLyxCdr1dzj6dl4TAJyNS00mZD2RIc", // TODO: Replace with SSO Encryption Key
      cacheSyncWorker,
      ssoGrantDevicesAddress = params.ssoGrantDevicesAddress,
      ssoHost = params.ssoHost,
      grantDeviceIdFromSSO = (params.grantDeviceIdFromSSO && typeof params.grantDeviceIdFromSSO === "boolean") ?
      params.grantDeviceIdFromSSO :
      false,
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
      sendPingTimeout,
      lastReceivedMessageTime,
      connectionCloseTimeout,
      getUserInfoTimeout,
      JSTimeLatency = 100,
      config = {
        getHistoryCount: 50
      },
      SERVICE_ADDRESSES = {
        SSO_ADDRESS: params.ssoHost || "http://172.16.110.76",
        PLATFORM_ADDRESS: params.platformHost || "http://172.16.106.26:8080/hamsam",
        FILESERVER_ADDRESS: params.fileServer || "http://172.16.106.26:8080/hamsam",
        MAP_ADDRESS: params.mapServer || "https://api.neshan.org/v1"
      },
      SERVICES_PATH = {
        // Grant Devices
        SSO_DEVICES: "/oauth2/grants/devices",
        // Contacts
        ADD_CONTACTS: "/nzh/addContacts",
        UPDATE_CONTACTS: "/nzh/updateContacts",
        REMOVE_CONTACTS: "/nzh/removeContacts",
        SEARCH_CONTACTS: "/nzh/listContacts",
        // File/Image Upload and Download
        UPLOAD_IMAGE: "/nzh/uploadImage",
        GET_IMAGE: "/nzh/image/",
        UPLOAD_FILE: "/nzh/uploadFile",
        GET_FILE: "/nzh/file/",
        // Neshan Map
        REVERSE: "/reverse",
        SEARCH: "/search",
        ROUTING: "/routing",
        STATIC_IMAGE: "/static"
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
        // Socket Errors
        6000: "No Active Device found for this Token!",
        6001: "Invalid Token!",
        6002: "User not found!",
        // Get User Info Errors
        6100: "Cant get UserInfo!",
        6101: "Getting User Info Retry Count exceeded 5 times; Connection Can Not Been Estabilished!",
        // Http Request Errors
        6200: "Network Error",
        6201: "URL is not clarified!",
        // File Uploads Errors
        6300: "Error in uploading File!",
        6301: "Not an image!",
        6302: "No file has been selected!",
        6303: "File upload has been canceled!",
        // Cache Database Errors
        6600: "Your Environment doesn't have Databse compatibility",
        6601: "Database is not defined! (missing db)",
        6602: "Database Error",
        // Map Errors
        6700: "You should Enter a Center Location like {lat: \" \", lng: \" \"}",
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
      actualTimingLog = (params.asyncLogging.actualTiming && typeof params.asyncLogging.actualTiming === "boolean") ? params.asyncLogging.actualTiming : false,
      minIntegerValue = Number.MAX_SAFE_INTEGER * -1,
      maxIntegerValue = Number.MAX_SAFE_INTEGER * 1,
      chatSendQueue = [],
      chatWaitQueue = [],
      chatUploadQueue = [],
      chatSendQueueHandlerTimeout;

    chatSendQueue.push = function() {
      Array.prototype.push.apply(this, arguments);
      chatSendQueueHandler();
    }

    /**
     * Initialize Cache Database
     *
     * if client's environement is capable of supporting indexedDB
     * and the hasCache attribute set to be true, we created
     * a indexedDB instance based on DexieDb and Initialize
     * client sde caching
     *
     * @return {undefined}
     */
    if (hasCache) {
      queueDb = new Dexie('podQueues');

      queueDb.version(1).stores({
        sendQ: "[threadId+uniqueId], threadId, uniqueId, message, callbacks",
        waitQ: "[threadId+uniqueId], threadId, uniqueId, message, callbacks",
        uploadQ: "[threadId+uniqueId], threadId, uniqueId, message, callbacks"
      });

      // queueDb.delete().then(() => {
      //   console.log("podQueues Database successfully deleted");
      // }).catch((err) => {
      //   console.log(err);
      // });

      if (enableCache) {
        db = new Dexie('podChat');

        // db.delete().then(() => {
        //   console.log("Database successfully deleted");
        // }).catch((err) => {
        //   console.log(err);
        // });

        db.version(1).stores({
          users: "&id, name, cellphoneNumber",
          contacts: "[owner+id], id, owner, uniqueId, userId, cellphoneNumber, email, firstName, lastName, expireTime",
          threads: "[owner+id] ,id, owner, title, time, [owner+time]",
          participants: "[owner+id], id, owner, threadId, notSeenDuration, name, contactName, email, expireTime",
          messages: "[owner+id], id, owner, threadId, time, [threadId+id], [threadId+owner+time]"
        });
      }
    } else {
      fireEvent("error", {
        code: 6600,
        message: CHAT_ERRORS[6600],
        error: null
      });
    }

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

      /**
       * Initialize Async
       *
       * Initializes Async module and sets proper callbacks
       *
       * @access private
       *
       * @return {undefined}
       */
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
                chatSendQueueHandler();
                fireEvent("chatReady");
              }
            });
          } else if (userInfo.id > 0) {
            chatState = true;
            chatSendQueueHandler();
            fireEvent("chatReady");
          }
        });

        asyncClient.on("stateChange", function(state) {
          fireEvent("chatState", state);
          chatFullStateObject = state;

          switch (state.socketState) {
            case 1: // CONNECTED
              if (state.deviceRegister && state.serverRegister) {
                chatState = true;
                // TODO: Is it necessary???
                // chatSendQueueHandler();
              }
              break;
            case 0: // CONNECTING
            case 2: // CLOSING
            case 3: // CLOSED
              chatState = false;
              break;
          }
        });

        asyncClient.on("connect", function(newPeerId) {
          asyncGetReadyTime = new Date().getTime();
          peerId = newPeerId;
          fireEvent("connect");
        });

        asyncClient.on("disconnect", function(event) {
          oldPeerId = peerId;
          peerId = undefined;
          fireEvent("disconnect", event);
        });

        asyncClient.on("reconnect", function(newPeerId) {
          peerId = newPeerId;
          fireEvent("reconnect");
        });

        asyncClient.on("message", function(params, ack) {

          // connectionCloseTimeout && clearTimeout(connectionCloseTimeout);
          //
          // connectionCloseTimeout = setTimeout(function() {
          //   // asyncClient.reconnectSocket();
          //   // TODO: Check if its needed to set chatState as FALSE or not?!
          //
          //   // asyncClient.close();
          // }, chatPingMessageInterval * 2);

          receivedAsyncMessageHandler(params);
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

      /**
       * Get Device Id With Token
       *
       * If ssoGrantDevicesAddress set as TRUE, chat agent gets Device ID
       * from SSO server and passes it to Async Module
       *
       * @access private
       *
       * @param {function}  callback    The callback function to run after getting Device Id
       *
       * @return {undefined}
       */
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

      /**
       * HTTP Request class
       *
       * Manages all HTTP Requests
       *
       * @access private
       *
       * @param {object}    params      Given parameters including (Headers, ...)
       * @param {function}  callback    The callback function to run after
       *
       * @return {undefined}
       */
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
                        cache: false,
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
                      cache: false,
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
                    cache: false,
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
              cache: false,
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
                  cache: false,
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

      /**
       * Get User Info
       *
       * This functions gets user info from chat serverName.
       * If info is not retrived the function will attemp
       * 5 more times to get info from erver
       *
       * @recursive
       * @access private
       *
       * @param {function}    callback    The callback function to call after
       *
       * @return {object} Instant function return
       */
      getUserInfo = function getUserInfoRecursive(callback) {
        getUserInfoRetryCount++;

        if (getUserInfoRetryCount > getUserInfoRetry) {
          getUserInfoTimeout && clearTimeout(getUserInfoTimeout);

          getUserInfoRetryCount = 0;

          fireEvent("error", {
            code: 6101,
            message: CHAT_ERRORS[6101],
            error: null
          });

          /**
           * Retrieve User info from cache #cache
           */
          if (cacheDb) {
            if (db) {
              db.users.toArray()
                .then(function(users) {
                  if (users.length > 0) {
                    var returnData = {
                      hasError: false,
                      cache: true,
                      errorCode: 0,
                      errorMessage: '',
                      user: users[0]
                    };
                  }
                });
            } else {
              fireEvent("error", {
                code: 6601,
                message: CHAT_ERRORS[6601],
                error: null
              });
            }
          }

        } else {
          getUserInfoTimeout && clearTimeout(getUserInfoTimeout);

          getUserInfoTimeout = setTimeout(function() {
            getUserInfoRecursive(callback);
          }, getUserInfoRetryCount * 10000);

          return sendMessage({
            chatMessageVOType: chatMessageVOTypes.USER_INFO,
            typeCode: params.typeCode
          }, {
            onResult: function(result) {
              var returnData = {
                hasError: result.hasError,
                cache: false,
                errorMessage: result.errorMessage,
                errorCode: result.errorCode
              };

              if (!returnData.hasError) {
                getUserInfoTimeout && clearTimeout(getUserInfoTimeout);

                var messageContent = result.result;
                var currentUser = formatDataToMakeUser(messageContent);

                /**
                 * Add current user into cache database #cache
                 */
                if (cacheDb) {
                  if (db) {
                    db.users.where("id").above(0).delete();
                    db.users.put(currentUser)
                      .catch(function(error) {
                        fireEvent("error", {
                          code: error.code,
                          message: error.message,
                          error: error
                        });
                      });
                  } else {
                    fireEvent("error", {
                      code: 6601,
                      message: CHAT_ERRORS[6601],
                      error: null
                    });
                  }
                }

                resultData = {
                  user: currentUser
                };

                returnData.result = resultData;
                getUserInfoRetryCount = 0;

                callback && callback(returnData);

                /**
                 * Delete callback so if server pushes response before
                 * cache, cache won't send data again
                 */
                callback = undefined;
              }
            }
          });
        }
      },

      /**
       * Send Message
       *
       * All socket messages go through this function
       *
       * @access private
       *
       * @param {string}    token           SSO Token of current user
       * @param {string}    tokenIssuer     Issuer of token (default : 1)
       * @param {int}       type            Type of message (object : chatMessageVOTypes)
       * @param {string}    typeCode        Type of contact who is going to receive the message
       * @param {int}       messageType     Type of Message, in order to filter messages
       * @param {long}      subjectId       Id of chat thread
       * @param {string}    uniqueId        Tracker id for client
       * @param {string}    content         Content of message
       * @param {long}      time            Time of message, filled by chat server
       * @param {string}    medadata        Metadata for message (Will use when needed)
       * @param {string}    systemMedadata  Metadata for message (To be Set by client)
       * @param {long}      repliedTo       Id of message to reply to (Should be filled by client)
       * @param {function}  callback        The callback function to run after
       *
       * @return {object} Instant Function Return
       */
      sendMessage = function(params, callbacks, recursiveCallback) {
        /**
         * + ChatMessage        {object}
         *    - token           {string}
         *    - tokenIssuer     {string}
         *    - type            {int}
         *    - typeCode        {string}
         *    - messageType     {int}
         *    - subjectId       {long}
         *    - uniqueId        {string}
         *    - content         {string}
         *    - time            {long}
         *    - medadata        {string}
         *    - systemMedadata  {string}
         *    - repliedTo       {long}
         */

        var asyncPriority = (params.asyncPriority > 0) ? params.asyncPriority : msgPriority;

        var messageVO = {
          type: params.chatMessageVOType,
          token: token,
          tokenIssuer: 1
        };

        var threadId = params.subjectId;

        if (params.typeCode) {
          messageVO.typeCode = params.typeCode;
        } else if (generalTypeCode) {
          messageVO.typeCode = generalTypeCode;
        }

        if (params.messageType) {
          messageVO.messageType = params.messageType;
        }

        if (params.subjectId) {
          messageVO.subjectId = params.subjectId;
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

        if (params.repliedTo) {
          messageVO.repliedTo = params.repliedTo;
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
            priority: asyncPriority,
            content: JSON.stringify(messageVO),
            ttl: (params.messageTtl > 0) ? params.messageTtl : messageTtl
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

        sendPingTimeout && clearTimeout(sendPingTimeout);
        sendPingTimeout = setTimeout(function() {
          ping();
        }, chatPingMessageInterval);

        recursiveCallback && recursiveCallback();

        return {
          uniqueId: uniqueId,
          threadId: threadId,
          participant: userInfo,
          content: params.content
        }
      },

      /**
       * Chat Send Message Queue Handler
       *
       * Whenever something pushes into cahtSendQueue
       * this function invokes and does the message
       * sending progress throught async
       *
       * @access private
       *
       * @return {undefined}
       */
      chatSendQueueHandler = function() {
        chatSendQueueHandlerTimeout && clearTimeout(chatSendQueueHandlerTimeout);

        /**
         * Getting chatSendQueue from either cache or
         * memory and scrolling through the send queue
         * to send all the messages which are waiting
         * for chatState to become TRUE
         *
         * There is a small possibility that a Message
         * wouldn't make it through network, so it Will
         * not reach chat server. To avoid losing those
         * messages, we put a clone of every message
         * in waitQ, and when ack of the message comes,
         * we delete that message from waitQ. otherwise
         * we assume that these messagee have been failed to
         * send and keep them to be either canceled or resent
         * by user later. When user calls getHistory(), they
         * will have failed messages alongside with typical
         * messages history.
         */
        if (chatState) {
          getChatSendQueue(0, function(chatSendQueue) {
            if (chatSendQueue.length) {
              var messageToBeSend = chatSendQueue.shift();

              deleteFromChatSentQueue(messageToBeSend, function() {
                putInChatWaitQueue(messageToBeSend, function() {
                  /**
                   * If mesage data is encrypted, decrypt it first
                   */
                  if (typeof messageToBeSend.message != "object") {
                    try {
                      messageToBeSend.message = Utility.jsonParser(Utility.decrypt(messageToBeSend.message, cacheSecret));
                      messageToBeSend.callbacks = Utility.jsonParser(Utility.decrypt(messageToBeSend.callbacks, cacheSecret));
                    } catch (e) {
                      console.error(e);
                    }
                  }

                  sendMessage(messageToBeSend.message, messageToBeSend.callbacks, function() {
                    if (chatSendQueue.length) {
                      chatSendQueueHandler();
                    }
                  });
                });
              });
            }
          });
        }
      },

      /**
       * Ping
       *
       * This Function sends ping message to keep user connected to
       * chat server and updates its status
       *
       * @access private
       *
       * @return {undefined}
       */
      ping = function() {
        if (chatState && peerId !== undefined && userInfo !== undefined) {
          /**
           * Ping messages should be sent ASAP, because
           * we dont want to wait for send queue, we send them
           * right trhough async from here
           */
          sendMessage({
            chatMessageVOType: chatMessageVOTypes.PING,
            pushMsgType: 5
          });

        } else {
          sendPingTimeout && clearTimeout(sendPingTimeout);
        }
      },

      /**
       * Clear Cache
       *
       * Clears Async queue so that all the remained messages will be ignored
       *
       * @access private
       *
       * @return {undefined}
       */
      clearChatServerCaches = function() {
        sendMessage({
          chatMessageVOType: chatMessageVOTypes.LOGOUT,
          pushMsgType: 4
        });
      },

      /**
       * Received Async Message Handler
       *
       * This functions parses received message from async
       *
       * @access private
       *
       * @param {object}    asyncMessage    Received Message from Async
       *
       * @return {undefined}
       */
      receivedAsyncMessageHandler = function(asyncMessage) {
        /**
         * + Message Received From Async      {object}
         *    - id                            {long}
         *    - senderMessageId               {long}
         *    - senderName                    {string}
         *    - senderId                      {long}
         *    - type                          {int}
         *    - content                       {string}
         */

        var content = JSON.parse(asyncMessage.content);
        chatMessageHandler(content);
      },

      /**
       * Chat Message Handler
       *
       * Manages received chat messages and do the job
       *
       * @access private
       *
       * @param {object}    chatMessage     Content of Async Message which is considered as Chat Message
       *
       * @return {undefined}
       */
      chatMessageHandler = function(chatMessage) {
        var threadId = chatMessage.subjectId,
          type = chatMessage.type,
          messageContent = (typeof chatMessage.content === 'string') ?
          JSON.parse(chatMessage.content) : {},
          contentCount = chatMessage.contentCount,
          uniqueId = chatMessage.uniqueId;

        switch (type) {
          /**
           * Type 1    Get Threads
           */
          case chatMessageVOTypes.CREATE_THREAD:
            messageContent.uniqueId = uniqueId;
            createThread(messageContent, true);

            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            }

            break;

            /**
             * Type 2    Message
             */
          case chatMessageVOTypes.MESSAGE:
            newMessageHandler(threadId, messageContent);
            break;

            /**
             * Type 3    Message Sent
             */
          case chatMessageVOTypes.SENT:
            if (sendMessageCallbacks[uniqueId] && sendMessageCallbacks[uniqueId].onSent) {
              sendMessageCallbacks[uniqueId].onSent({
                uniqueId: uniqueId
              });
              delete(sendMessageCallbacks[uniqueId].onSent);
              threadCallbacks[threadId][uniqueId].onSent = true;
            }
            break;

            /**
             * Type 4    Message Delivery
             */
          case chatMessageVOTypes.DELIVERY:
            // TODO: CACHE

            getHistory({
              offset: 0,
              threadId: threadId,
              id: messageContent.messageId
            }, function(result) {
              if (!result.hasError && !result.cache) {
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

            /**
             * Type 5    Message Seen
             */
          case chatMessageVOTypes.SEEN:
            // TODO: CACHE

            getHistory({
              offset: 0,
              threadId: threadId,
              id: messageContent.messageId
            }, function(result) {
              if (!result.hasError && !result.cache) {
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

            /**
             * Type 6    Chat Ping
             */
          case chatMessageVOTypes.PING:
            break;

            /**
             * Type 7    Block Contact
             */
          case chatMessageVOTypes.BLOCK:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            }
            break;

            /**
             * Type 8    Unblock Blocked User
             */
          case chatMessageVOTypes.UNBLOCK:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            }
            break;

            /**
             * Type 9   Leave Thread
             */
          case chatMessageVOTypes.LEAVE_THREAD:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));

            /**
             * Remove the participant from cache
             */
            if (cacheDb) {
              if (db) {
                /**
                 * Remove the participant from participants table
                 */
                db.participants
                  .where('threadId')
                  .equals(threadId)
                  .and(function(participant) {
                    return (participant.id == messageContent.id || participant.owner == userInfo.id);
                  })
                  .delete()
                  .catch(function(error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  });

                /**
                 * If this is the user who is leaving the thread
                 * we should delete the thread and messages of
                 * thread from this users cache database
                 */
                if (messageContent.id == userInfo.id) {

                  /**
                   * Remove Thread from this users cache
                   */
                  db.threads
                    .where('[owner+id]')
                    .equals([userInfo.id, threadId])
                    .delete()
                    .catch(function(error) {
                      fireEvent("error", {
                        code: error.code,
                        message: error.message,
                        error: error
                      });
                    });

                  /**
                   * Remove all messages of the thread which this
                   * user left
                   */
                  db.messages
                    .where('threadId')
                    .equals(threadId)
                    .and(function(message) {
                      return message.owner == userInfo.id;
                    })
                    .delete()
                    .catch(function(error) {
                      fireEvent("error", {
                        code: error.code,
                        message: error.message,
                        error: error
                      });
                    });
                }
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }

            getThreads({
              threadIds: [threadId]
            }, function(threadsResult) {
              if (!threadsResult.cache) {
                var threads = threadsResult.result.threads;
                if (threads.length > 0) {
                  fireEvent("threadEvents", {
                    type: "THREAD_LEAVE_PARTICIPANT",
                    result: {
                      thread: threads[0],
                      participant: formatDataToMakeParticipant(messageContent, threadId)
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
                      threadId: threadId,
                      participant: formatDataToMakeParticipant(messageContent, threadId)
                    }
                  });
                }
              }
            });
            break;

            /**
             * Type 11    Add Participant to Thread
             */
          case chatMessageVOTypes.ADD_PARTICIPANT:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));

            /**
             * Add participants into cache
             */
            if (cacheDb) {
              if (db) {
                var cacheData = [];

                for (var i = 0; i < messageContent.participants.length; i++) {
                  try {
                    var tempData = {},
                      salt = Utility.generateUUID();

                    tempData.id = messageContent.participants[i].id;
                    tempData.owner = userInfo.id;
                    tempData.threadId = messageContent.id;
                    tempData.notSeenDuration = messageContent.participants[i].notSeenDuration;
                    tempData.name = Utility.crypt(messageContent.participants[i].name, cacheSecret, salt);
                    tempData.contactName = Utility.crypt(messageContent.participants[i].contactName, cacheSecret, salt);
                    tempData.email = Utility.crypt(messageContent.participants[i].email, cacheSecret, salt);
                    tempData.expireTime = new Date().getTime() + cacheExpireTime;
                    tempData.data = Utility.crypt(JSON.stringify(unsetNotSeenDuration(messageContent.participants[i])), cacheSecret, salt);
                    tempData.salt = salt;

                    cacheData.push(tempData);
                  } catch (error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  }
                }

                db.participants
                  .bulkPut(cacheData)
                  .catch(function(error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  });
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }

            getThreads({
              threadIds: [messageContent.id]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;

              if (!threadsResult.cache) {
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
              }
            });
            break;

            /**
             * Type 13    Get Contacts List
             */
          case chatMessageVOTypes.GET_CONTACTS:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            break;

            /**
             * Type 14    Get Threads List
             */
          case chatMessageVOTypes.GET_THREADS:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            break;

            /**
             * Type 15    Get Message History of an Thread
             */
          case chatMessageVOTypes.GET_HISTORY:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            break;

            /**
             * Type 17    Remove sb from thread
             */
          case chatMessageVOTypes.REMOVED_FROM_THREAD:

            fireEvent("threadEvents", {
              type: "THREAD_REMOVED_FROM",
              result: {
                thread: threadId
              }
            });

            /**
             * This user has been removed from a thread
             * So we should delete thread, its participants
             * and it's messages from this users cache
             */
            if (cacheDb) {
              if (db) {
                /**
                 * Remove Thread from this users cache
                 */
                db.threads
                  .where('[owner+id]')
                  .equals([userInfo.id, threadId])
                  .delete()
                  .catch(function(error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  });

                /**
                 * Remove all messages of the thread which this
                 * user left
                 */
                db.messages
                  .where('threadId')
                  .equals(threadId)
                  .and(function(message) {
                    return message.owner == userInfo.id;
                  })
                  .delete()
                  .catch(function(error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  });

                /**
                 * Remove all participants of the thread which this
                 * user left
                 */
                db.participants
                  .where('threadId')
                  .equals(threadId)
                  .and(function(participant) {
                    return participant.owner == userInfo.id;
                  })
                  .delete()
                  .catch(function(error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  });

              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }

            break;

            /**
             * Type 18    Remove a /participant from Thread
             */
          case chatMessageVOTypes.REMOVE_PARTICIPANT:
            if (messagesCallbacks[uniqueId]) messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));

            /**
             * Remove the participant from cache
             */
            if (cacheDb) {
              if (db) {
                for (var i = 0; i < messageContent.length; i++) {
                  db.participants
                    .where('id')
                    .equals(messageContent[i].id)
                    .and(function(participants) {
                      return participants.threadId == threadId;
                    })
                    .delete()
                    .catch(function(error) {
                      fireEvent("error", {
                        code: error.code,
                        message: error.message,
                        error: error
                      });
                    });
                }
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }

            getThreads({
              threadIds: [threadId]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;

              if (!threadsResult.cache) {
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
              }
            });
            break;

            /**
             * Type 19    Mute Thread
             */
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

            /**
             * Type 20    Unmute muted Thread
             */
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

            /**
             * Type 21    Update Thread Info
             */
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

            /**
             * Type 22    Forward Multiple Messages
             */
          case chatMessageVOTypes.FORWARD_MESSAGE:
            newMessageHandler(threadId, messageContent);
            break;

            /**
             * Type 23    User Info
             */
          case chatMessageVOTypes.USER_INFO:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            break;

            /**
             * Type 25    Get Blocked List
             */
          case chatMessageVOTypes.GET_BLOCKED:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            }
            break;

            /**
             * Type 27    Thread Participants List
             */
          case chatMessageVOTypes.THREAD_PARTICIPANTS:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            break;

            /**
             * Type 28    Edit Message
             */
          case chatMessageVOTypes.EDIT_MESSAGE:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            chatEditMessageHandler(threadId, messageContent);
            break;

            /**
             * Type 29    Delete Message
             */
          case chatMessageVOTypes.DELETE_MESSAGE:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));

            /**
             * Remove Message from cache
             */
            if (cacheDb) {
              if (db) {
                db.messages
                  .where('id')
                  .equals(messageContent)
                  .and(function(message) {
                    return message.owner == userInfo.id;
                  })
                  .delete()
                  .catch(function(error) {
                    fireEvent("error", {
                      code: 6602,
                      message: CHAT_ERRORS[6602],
                      error: error
                    });
                  });
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }

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

            /**
             * Type 30    Thread Info Updated
             */
          case chatMessageVOTypes.THREAD_INFO_UPDATED:
            fireEvent("threadEvents", {
              type: "THREAD_INFO_UPDATED",
              result: {
                thread: formatDataToMakeConversation(messageContent)
              }
            });
            break;

            /**
             * Type 31    Thread Last Seen Updated
             */
          case chatMessageVOTypes.LAST_SEEN_UPDATED:
            getThreads({
              threadIds: [messageContent.conversationId]
            }, function(threadsResult) {
              var threads = threadsResult.result.threads;

              if (!threadsResult.cache) {
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
              }
            });

            break;

            /**
             * Type 32    Get Message Delivered List
             */
          case chatMessageVOTypes.GET_MESSAGE_DELEVERY_PARTICIPANTS:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            }
            break;

            /**
             * Type 33    Get Message Delivered List
             */
          case chatMessageVOTypes.GET_MESSAGE_SEEN_PARTICIPANTS:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent, contentCount));
            }
            break;

            /**
             * Type 40    Bot Messages
             */
          case chatMessageVOTypes.BOT_MESSAGE:
            fireEvent("botEvents", {
              type: "BOT_MESSAGE",
              result: {
                bot: messageContent // todo: data will be formated
              }
            });
            break;

            /**
             * Type 41    Spam P2P Thread
             */
          case chatMessageVOTypes.SPAM_PV_THREAD:
            if (messagesCallbacks[uniqueId]) {
              messagesCallbacks[uniqueId](Utility.createReturnData(false, "", 0, messageContent));
            }
            break;

            /**
             * Type 999   All unknown errors
             */
          case chatMessageVOTypes.ERROR:
            if (messagesCallbacks[uniqueId])
              messagesCallbacks[uniqueId](Utility.createReturnData(true, messageContent.message, messageContent.code, messageContent, 0));

            /**
             * If error code is 21 threrfore Token is invalid &
             * user should be logged put
             */
            if (messageContent.code == 21) {
              chatState = false;
              asyncClient.logout();
              clearChatServerCaches();
            }

            fireEvent("error", {
              code: messageContent.code,
              message: messageContent.message,
              error: messageContent
            });
            break;
        }
      },

      /**
       * Send Message Callbacks Handler
       *
       * When you send Delivery or Seen Acknowledgements of a message
       * You should send Delivery and Seen for all the Messages before
       * that message so that you wont have un delivered/unseen messages
       * after seeing the last message of a thread
       *
       * @access private
       *
       * @param {int}     actionType      Switch between Delivery or Seen
       * @param {long}    threadId        Id of thread
       * @param {string}  uniqueId        uniqueId of message
       *
       * @return {undefined}
       */
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

      /**
       * New Message Handler
       *
       * Handles Event Emitter of a newley received Chat Message
       *
       * @access private
       *
       * @param {long}    threadId         ID of image
       * @param {object}  messageContent   Json Content of the message
       *
       * @return {undefined}
       */
      newMessageHandler = function(threadId, messageContent) {

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

          if (messageContent.participant.id !== userInfo.id && !threadsResult.cache) {
            fireEvent("threadEvents", {
              type: "THREAD_UNREAD_COUNT_UPDATED",
              result: {
                thread: threads[0],
                messageId: messageContent.id,
                senderId: messageContent.participant.id
              }
            });
          }

          if (!threadsResult.cache) {
            fireEvent("threadEvents", {
              type: "THREAD_LAST_ACTIVITY_TIME",
              result: {
                thread: threads[0]
              }
            });
          }
        });

        /**
         * Update waitQ and remove sent messages from it
         */
        if (hasCache && typeof queueDb == "object") {
          queueDb.waitQ
            .where("uniqueId")
            .equals(message.uniqueId)
            .delete()
            .catch(function(error) {
              fireEvent("error", {
                code: error.code,
                message: error.message,
                error: error
              });
            });
        } else {
          for (var i = 0; i < chatSendQueue.length; i++) {
            if (chatSendQueue[i].uniqueId == message.uniqueId) {
              chatSendQueue.splice(i, 1);
            }
          }
        }
      },

      /**
       * Chat Edit Message Handler
       *
       * Handles Event Emitter of an edited Chat Message
       *
       * @access private
       *
       * @param {long}    threadId         ID of image
       * @param {object}  messageContent   Json Content of the message
       *
       * @return {undefined}
       */
      chatEditMessageHandler = function(threadId, messageContent) {
        var message = formatDataToMakeMessage(threadId, messageContent);

        /**
         * Update Message on cache
         */
        if (cacheDb) {
          if (db) {
            try {
              var tempData = {},
                salt = Utility.generateUUID();
              tempData.id = parseInt(message.id);
              tempData.owner = parseInt(userInfo.id);
              tempData.threadId = parseInt(message.threadId);
              tempData.time = message.time;
              tempData.message = Utility.crypt(message.message, cacheSecret, salt);
              tempData.data = Utility.crypt(JSON.stringify(unsetNotSeenDuration(message)), cacheSecret, salt);
              tempData.salt = salt;

              /**
               * Insert Message into cache database
               */
              db.messages
                .put(tempData)
                .catch(function(error) {
                  fireEvent("error", {
                    code: error.code,
                    message: error.message,
                    error: error
                  });
                });
            } catch (error) {
              fireEvent("error", {
                code: error.code,
                message: error.message,
                error: error
              });
            }
          } else {
            fireEvent("error", {
              code: 6601,
              message: CHAT_ERRORS[6601],
              error: null
            });
          }
        }

        fireEvent("messageEvents", {
          type: "MESSAGE_EDIT",
          result: {
            message: message
          }
        });
      },

      /**
       * Create Thread
       *
       * Makes formatted Thread Object out of given contentCount,
       * If Thread has been newely created, a THREAD_NEW event
       * will be emitted
       *
       * @access private
       *
       * @param {object}    messageContent    Json object of thread taken from chat server
       * @param {boolean}   addFromService    if this is a newely created Thread, addFromService should be True
       *
       * @return {object} Formatted Thread Object
       */
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

      /**
       * Format Data To Make Linked User
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} linkedUser Object
       */
      formatdataToMakeLinkedUser = function(messageContent) {
        /**
         * + RelatedUserVO                 {object}
         *   - coreUserId                  {long}
         *   - username                    {string}
         *   - nickname                    {string}
         *   - name                        {string}
         *   - image                       {string}
         */

        var linkedUser = {
          coreUserId: messageContent.coreUserId,
          username: messageContent.username,
          nickname: messageContent.nickname,
          name: messageContent.name,
          image: messageContent.image
        };

        return linkedUser;
      },

      /**
       * Format Data To Make Contact
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} contact Object
       */
      formatDataToMakeContact = function(messageContent) {
        /**
         * + ContactVO                        {object}
         *    - id                            {long}
         *    - blocked                       {boolean}
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
          blocked: (messageContent.blocked !== undefined) ? messageContent.blocked : false,
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

      /**
       * Format Data To Make User
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} user Object
       */
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

      /**
       * Format Data To Make Blocked User
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} blockedUser Object
       */
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

      /**
       * Format Data To Make Invitee
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} inviteeData Object
       */
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

      /**
       * Format Data To Make Participant
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} participant Object
       */
      formatDataToMakeParticipant = function(messageContent, threadId) {
        /**
         * + ParticipantVO                   {object}
         *    - id                           {long}
         *    - coreUserId                   {long}
         *    - threadId                     {long}
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
         *    - contactFirstName             {string}
         *    - contactLastName              {string}
         */

        var participant = {
          id: messageContent.id,
          coreUserId: messageContent.coreUserId,
          threadId: threadId,
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
          contactFirstName: messageContent.contactFirstName,
          contactLastName: messageContent.contactLastName
        };

        return participant;
      },

      /**
       * Format Data To Make Conversation
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} concersation Object
       */
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
          conversation.inviter = formatDataToMakeParticipant(messageContent.inviter, messageContent.id);
        }

        // Add participants list if exist
        if (messageContent.participants && Array.isArray(messageContent.participants)) {
          conversation.participants = [];

          for (var i = 0; i < messageContent.participants.length; i++) {
            var participantData = formatDataToMakeParticipant(messageContent.participants[i], messageContent.id);
            if (participantData) {
              conversation.participants.push(participantData);
            }
          }
        }

        // Add lastMessageVO if exist
        if (messageContent.lastMessageVO) {
          conversation.lastMessageVO = formatDataToMakeMessage(messageContent.id, messageContent.lastMessageVO);
        }

        return conversation;
      },

      /**
       * Format Data To Make Reply Info
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} replyInfo Object
       */
      formatDataToMakeReplyInfo = function(messageContent, threadId) {
        /**
         * + replyInfoVO                  {object : replyInfoVO}
         *   - participant                {object : ParticipantVO}
         *   - repliedToMessageId         {long}
         *   - message                    {string}
         *   - deleted                    {boolean}
         *   - messageType                {int}
         *   - metadata                   {string}
         *   - systemMetadata             {string}
         */

        var replyInfo = {
          deleted: messageContent.deleted,
          participant: undefined,
          repliedToMessageId: messageContent.repliedToMessageId,
          message: messageContent.message,
          deleted: messageContent.deleted,
          messageType: messageContent.messageType,
          metadata: messageContent.metadata,
          systemMetadata: messageContent.systemMetadata
        };

        if (messageContent.participant) {
          replyInfo.participant = formatDataToMakeParticipant(messageContent.participant, threadId);
        }

        return replyInfo;
      },

      /**
       * Format Data To Make Forward Info
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} forwardInfo Object
       */
      formatDataToMakeForwardInfo = function(messageContent, threadId) {
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
          forwardInfo.participant = formatDataToMakeParticipant(messageContent.participant, threadId);
        }

        return forwardInfo;
      },

      /**
       * Format Data To Make Message
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} message Object
       */
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
         *    - deletable                    {boolean}
         *    - delivered                    {boolean}
         *    - seen                         {boolean}
         *    - participant                  {object : ParticipantVO}
         *    - conversation                 {object : ConversationVO}
         *    - replyInfo                    {object : replyInfoVO}
         *    - forwardInfo                  {object : forwardInfoVO}
         *    - metadata                     {string}
         *    - systemMetadata               {string}
         *    - time                         {long}
         *    - timeNanos                    {long}
         */

        var message = {
          id: pushMessageVO.id,
          threadId: threadId,
          ownerId: (pushMessageVO.ownerId) ? pushMessageVO.ownerId : undefined,
          uniqueId: pushMessageVO.uniqueId,
          previousId: pushMessageVO.previousId,
          message: pushMessageVO.message,
          messageType: pushMessageVO.messageType,
          edited: pushMessageVO.edited,
          editable: pushMessageVO.editable,
          deletable: pushMessageVO.deletable,
          delivered: pushMessageVO.delivered,
          seen: pushMessageVO.seen,
          participant: undefined,
          conversation: undefined,
          replyInfo: undefined,
          forwardInfo: undefined,
          metaData: pushMessageVO.metadata,
          systemMetadata: pushMessageVO.systemMetadata,
          time: (pushMessageVO.timeNanos) ? (parseInt(parseInt(pushMessageVO.time) / 1000) * 1000000000) + parseInt(pushMessageVO.timeNanos) : (parseInt(pushMessageVO.time))
        };

        if (pushMessageVO.participant) {
          message.ownerId = pushMessageVO.participant.id;
        }

        if (pushMessageVO.conversation) {
          message.conversation = formatDataToMakeConversation(pushMessageVO.conversation);
          message.threadId = pushMessageVO.conversation.id;
        }

        if (pushMessageVO.replyInfoVO) {
          message.replyInfo = formatDataToMakeReplyInfo(pushMessageVO.replyInfoVO, threadId);
        }

        if (pushMessageVO.forwardInfo) {
          message.forwardInfo = formatDataToMakeForwardInfo(pushMessageVO.forwardInfo, threadId);
        }

        if (pushMessageVO.participant) {
          message.participant = formatDataToMakeParticipant(pushMessageVO.participant, threadId);
        }

        return message;
      },

      /**
       * Format Data To Make Message Change State
       *
       * This functions reformats given JSON to proper Object
       *
       * @access private
       *
       * @param {object}  messageContent    Json object of thread taken from chat server
       *
       * @return {object} messageChangeState Object
       */
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

      /**
       * Reformat Thread History
       *
       * This functions reformats given Array of thread Messages
       * into proper chat message object
       *
       * @access private
       *
       * @param {long}    threadId         Id of Thread
       * @param {object}  historyContent   Array of Thread History Messages
       *
       * @return {object} Formatted Thread History
       */
      reformatThreadHistory = function(threadId, historyContent) {
        var returnData = [];

        for (var i = 0; i < historyContent.length; i++) {
          returnData.push(formatDataToMakeMessage(threadId, historyContent[i]));
        }

        return returnData;
      },

      /**
       * Reformat Thread Participants
       *
       * This functions reformats given Array of thread Participants
       * into proper thread participant
       *
       * @access private
       *
       * @param {object}  participantsContent   Array of Thread Participant Objects
       * @param {long}    threadId              Id of Thread
       *
       * @return {object} Formatted Thread Participant Array
       */
      reformatThreadParticipants = function(participantsContent, threadId) {
        var returnData = [];

        for (var i = 0; i < participantsContent.length; i++) {
          returnData.push(formatDataToMakeParticipant(participantsContent[i], threadId));
        }

        return returnData;
      },

      /**
       * Unset Not Seen Duration
       *
       * This functions unsets notSeenDuration property of cached objects
       *
       * @access private
       *
       * @param {object}  content   Object or Array to be modified
       *
       * @return {object}
       */
      unsetNotSeenDuration = function(content) {
        /**
         * Make a copy from original object to modify it's
         * attributes, because we don't want to change
         * the original object
         */
        var temp = cloneObject(content);

        if (temp.hasOwnProperty('notSeenDuration')) {
          temp.notSeenDuration = undefined;
        }

        if (temp.hasOwnProperty('inviter')) {
          temp.inviter.notSeenDuration = undefined;
        }

        if (temp.hasOwnProperty('participant')) {
          temp.participant.notSeenDuration = undefined;
        }

        return temp;
      },

      /**
       * Clone Object/Array
       *
       * This functions makes a deep clone of given object or array
       *
       * @access private
       *
       * @param {object}  original   Object or Array to be cloned
       *
       * @return {object} Cloned object
       */
      cloneObject = function(original) {
        var out, value, key;
        out = Array.isArray(original) ? [] : {};

        for (key in original) {
          value = original[key];
          out[key] = (typeof value === "object" && value !== null) ? cloneObject(value) : value;
        }

        return out;
      },

      /**
       * Get Treads.
       *
       * This functions gets threads list
       *
       * @access private
       *
       * @param {int}       count                 count of threads to be received
       * @param {int}       offset                offset of select query
       * @param {array}     threadIds             An array of thread ids to be received
       * @param {string}    name                  Search term to look up in thread Titles
       * @param {long}      creatorCoreUserId     SSO User Id of thread creator
       * @param {long}      partnerCoreUserId     SSO User Id of thread partner
       * @param {long}      partnerCoreContactId  Contact Id of thread partner
       * @param {function}  callback              The callback function to call after
       *
       * @return {object} Instant sendMessage result
       */
      getThreads = function(params, callback) {
        var count = 50,
          offset = 0,
          content = {},
          whereClause = {};

        if (params) {
          if (parseInt(params.count) > 0) {
            count = params.count;
          }

          if (parseInt(params.offset) > 0) {
            offset = params.offset;
          }

          if (typeof params.name === "string") {
            content.name = whereClause.name = params.name;
          }

          if (Array.isArray(params.threadIds)) {
            content.threadIds = whereClause.threadIds = params.threadIds;
          }

          if (typeof params.new === "boolean") {
            content.new = params.new;
          }

          if (parseInt(params.creatorCoreUserId) > 0) {
            content.creatorCoreUserId = whereClause.creatorCoreUserId = params.creatorCoreUserId;
          }

          // TODO: wHAT ABOUT CACHE?!

          if (parseInt(params.partnerCoreUserId) > 0) {
            content.partnerCoreUserId = whereClause.partnerCoreUserId = params.partnerCoreUserId;
          }

          if (parseInt(params.partnerCoreContactId) > 0) {
            content.partnerCoreContactId = whereClause.partnerCoreContactId = params.partnerCoreContactId;
          }
        }

        content.count = count;
        content.offset = offset;

        var sendMessageParams = {
          chatMessageVOType: chatMessageVOTypes.GET_THREADS,
          typeCode: params.typeCode,
          content: content
        };

        /**
         * Retrieve threads from cache #cache
         */
        if (cacheDb) {
          if (db) {
            var thenAble;

            if (Object.keys(whereClause).length === 0) {
              thenAble = db.threads
                .where("[owner+time]")
                .between([userInfo.id, minIntegerValue], [userInfo.id, maxIntegerValue * 1000])
                .reverse();
            } else {
              if (whereClause.hasOwnProperty("threadIds")) {
                thenAble = db.threads
                  .where("id")
                  .anyOf(whereClause.threadIds)
                  .and(function(thread) {
                    return thread.owner == userInfo.id;
                  });
              }

              if (whereClause.hasOwnProperty("name")) {
                thenAble = db.threads
                  .where("owner")
                  .equals(userInfo.id)
                  .filter(function(thread) {
                    var reg = new RegExp(whereClause.name);
                    return reg.test(Utility.decrypt(thread.title, cacheSecret, thread.salt));
                  });
              }

              if (whereClause.hasOwnProperty("creatorCoreUserId")) {
                thenAble = db.threads
                  .where("owner")
                  .equals(userInfo.id)
                  .filter(function(thread) {
                    return parseInt(thread.inviter.id) == parseInt(whereClause.creatorCoreUserId);
                  });
              }
            }

            thenAble
              .offset(offset)
              .limit(count)
              .toArray()
              .then(function(threads) {
                db.threads
                  .where("owner")
                  .equals(userInfo.id)
                  .count()
                  .then(function(threadsCount) {
                    var cacheData = [];

                    for (var i = 0; i < threads.length; i++) {
                      try {
                        var tempData = {},
                          salt = threads[i].salt;

                        cacheData.push(createThread(JSON.parse(Utility.decrypt(threads[i].data, cacheSecret, threads[i].salt)), false));
                      } catch (error) {
                        fireEvent("error", {
                          code: error.code,
                          message: error.message,
                          error: error
                        });
                      }
                    }

                    var returnData = {
                      hasError: false,
                      cache: true,
                      errorCode: 0,
                      errorMessage: '',
                      result: {
                        threads: cacheData,
                        contentCount: threadsCount,
                        hasNext: (offset + count < threadsCount && threads.length > 0),
                        nextOffset: offset + threads.length
                      }
                    };

                    if (cacheData.length > 0) {
                      callback && callback(returnData);
                    }
                  });
              }).catch(function(error) {
                fireEvent("error", {
                  code: error.code,
                  message: error.message,
                  error: error
                });
              });
          } else {
            fireEvent("error", {
              code: 6601,
              message: CHAT_ERRORS[6601],
              error: null
            });
          }
        }

        /**
         * Retrive get threads response from server
         */
        return sendMessage(sendMessageParams, {
          onResult: function(result) {
            var returnData = {
              hasError: result.hasError,
              cache: false,
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
                  nextOffset: offset + messageLength
                },
                threadData;

              for (var i = 0; i < messageLength; i++) {
                threadData = createThread(messageContent[i], false);
                if (threadData) {
                  resultData.threads.push(threadData);
                }
              }

              returnData.result = resultData;

              /**
               * Updating cache on seperated worker to find and
               * delete all messages that have been deleted from
               * thread's last section
               *
               * This option works on browser only - no Node support
               * // TODO: Implement Node Version
               */
              if (typeof Worker !== "undefined") {
                if (typeof(cacheSyncWorker) == "undefined") {
                  cacheSyncWorker = new Worker("src/browser-worker.js");
                }

                var workerCommand = {
                  type: 'getThreads',
                  userId: userInfo.id,
                  data: JSON.stringify(resultData.threads)
                };

                cacheSyncWorker.postMessage(JSON.stringify(workerCommand));

                cacheSyncWorker.onmessage = function(event) {
                  if (event.data == "terminate") {
                    cacheSyncWorker.terminate();
                    cacheSyncWorker = undefined;
                  }
                };

                cacheSyncWorker.onerror = function(event) {
                  console.log(event);
                };
              }

              /**
               * Add Threads into cache database #cache
               */
              if (cacheDb) {
                if (db) {
                  var cacheData = [];

                  for (var i = 0; i < resultData.threads.length; i++) {
                    try {
                      var tempData = {},
                        salt = Utility.generateUUID();

                      tempData.id = resultData.threads[i].id;
                      tempData.owner = userInfo.id;
                      tempData.title = Utility.crypt(resultData.threads[i].title, cacheSecret, salt);
                      tempData.time = resultData.threads[i].time;
                      tempData.data = Utility.crypt(JSON.stringify(unsetNotSeenDuration(resultData.threads[i])), cacheSecret, salt);
                      tempData.salt = salt;

                      cacheData.push(tempData);
                    } catch (error) {
                      fireEvent("error", {
                        code: error.code,
                        message: error.message,
                        error: error
                      });
                    }
                  }

                  db.threads
                    .bulkPut(cacheData)
                    .catch(function(error) {
                      fireEvent("error", {
                        code: error.code,
                        message: error.message,
                        error: error
                      });
                    });
                } else {
                  fireEvent("error", {
                    code: 6601,
                    message: CHAT_ERRORS[6601],
                    error: null
                  });
                }
              }
            }

            callback && callback(returnData);
            /**
             * Delete callback so if server pushes response before
             * cache, cache won't send data again
             */
            callback = undefined;
          }
        });
      },

      /**
       * Get History.
       *
       * This functions gets history of a thread
       *
       * @access private
       *
       * @param {int}       count             Count of threads to be received
       * @param {int}       offset            Offset of select query
       * @param {long}      threadId          Id of thread to get its history
       * @param {long}      id                Id of single message to get
       * @param {long}      userId            Messages of this SSO User
       * @param {int}       messageType       Type of messages to get (types should be set by client)
       * @param {long}      fromTime          Get messages which have bigger time than given fromTime
       * @param {int}       fromTimeNanos     Get messages which have bigger time than given fromTimeNanos
       * @param {long}      toTime            Get messages which have smaller time than given toTime
       * @param {int}       toTimeNanos       Get messages which have smaller time than given toTimeNanos
       * @param {long}      senderId          Messages of this sender only
       * @param {string}    uniqueIds         Array of unique ids to retrieve
       * @param {string}    order             Order of select query (default: DESC)
       * @param {string}    query             Serch term to be looked up in messages content
       * @param {object}    metadataCriteria  This JSON will be used to search in message metadata with GraphQL
       * @param {function}  callback          The callback function to call after
       *
       * @return {object} Instant result of sendMessage
       */
      getHistory = function(params, callback) {
        var sendMessageParams = {
            chatMessageVOType: chatMessageVOTypes.GET_HISTORY,
            typeCode: params.typeCode,
            content: {},
            subjectId: params.threadId
          },
          whereClause = {},
          offset = (parseInt(params.offset) > 0) ? parseInt(params.offset) : 0,
          count = (parseInt(params.count) > 0) ? parseInt(params.count) : config.getHistoryCount,
          order = (typeof params.order != "undefined") ? (params.order).toLowerCase() : 'desc',
          cacheResult = [],
          serverResult = [],
          cacheFirstMessage,
          cacheLastMessage,
          messages;

        sendMessageParams.content.count = count;
        sendMessageParams.content.offset = offset;
        sendMessageParams.content.order = order;

        if (parseInt(params.id) > 0) {
          sendMessageParams.content.id = whereClause.id = params.id;
        }

        if (Array.isArray(params.uniqueIds)) {
          sendMessageParams.content.uniqueIds = params.uniqueIds;
        }

        if (parseInt(params.fromTime) > 0 && parseInt(params.fromTime) < 9999999999999) {
          sendMessageParams.content.fromTime = whereClause.fromTime = parseInt(params.fromTime);
        }

        if (parseInt(params.fromTimeNanos) > 0 && parseInt(params.fromTimeNanos) < 999999999) {
          sendMessageParams.content.fromTimeNanos = whereClause.fromTimeNanos = parseInt(params.fromTimeNanos);
        }

        if (parseInt(params.toTime) > 0 && parseInt(params.toTime) < 9999999999999) {
          sendMessageParams.content.toTime = whereClause.toTime = parseInt(params.toTime);
        }

        if (parseInt(params.toTimeNanos) > 0 && parseInt(params.toTimeNanos) < 999999999) {
          sendMessageParams.content.toTimeNanos = whereClause.toTimeNanos = parseInt(params.toTimeNanos);
        }

        if (typeof params.query != "undefined") {
          sendMessageParams.content.query = whereClause.query = params.query;
        }

        if (typeof params.metadataCriteria == "object" && params.metadataCriteria.hasOwnProperty("field")) {
          sendMessageParams.content.metadataCriteria = whereClause.metadataCriteria = params.metadataCriteria;
        }

        /**
         * Get Thread Messages from cache
         *
         * Because we are not applying metadataCriteria search
         * on cached data, if this attribute has been set, we
         * should not return any results from cache
         */
        if (cacheDb && !whereClause.hasOwnProperty('metadataCriteria')) {
          if (db) {
            var thenAble,
              table = db.messages,
              collection;

            if (whereClause.hasOwnProperty("id") && whereClause.id > 0) {
              collection = table.where("id")
                .equals(params.id)
                .and(function(message) {
                  return message.owner == userInfo.id;
                })
                .reverse();
            } else {
              collection = table.where("[threadId+owner+time]")
                .between([parseInt(params.threadId), parseInt(userInfo.id), minIntegerValue], [parseInt(params.threadId), parseInt(userInfo.id), maxIntegerValue * 1000])
                .reverse();
            }

            collection
              .toArray()
              .then(function(resultMessages) {

                messages = resultMessages.sort(Utility.dynamicSort("time", !(order === "asc")));

                if (whereClause.hasOwnProperty("fromTime")) {
                  var fromTime = (whereClause.hasOwnProperty("fromTimeNanos")) ? ((whereClause.fromTime / 1000) * 1000000000) + whereClause.fromTimeNanos : whereClause.fromTime * 1000000;
                  messages = messages.filter(function(message) {
                    return message.time >= fromTime;
                  });
                }

                if (whereClause.hasOwnProperty("toTime")) {
                  // TODO: Check toTimeNanos with Server (For now we used +1)
                  var toTime = (whereClause.hasOwnProperty("toTimeNanos")) ? (((whereClause.toTime / 1000) + 1) * 1000000000) + whereClause.toTimeNanos : (whereClause.toTime + 1) * 1000000;
                  messages = messages.filter(function(message) {
                    return message.time <= toTime;
                  });
                }

                if (whereClause.hasOwnProperty("query") && typeof whereClause.query == "string") {
                  messages = messages.filter(function(message) {
                    var reg = new RegExp(whereClause.query);
                    return reg.test(Utility.decrypt(message.message, cacheSecret, message.salt));
                  });
                }

                messages = messages.slice(offset, offset + count);
                cacheFirstMessage = messages[0];
                cacheLastMessage = messages[messages.length - 1];

                collection.count().then(function(contentCount) {
                  var cacheData = [];

                  for (var i = 0; i < messages.length; i++) {
                    try {
                      var tempData = {},
                        salt = messages[i].salt;

                      cacheResult.push(messages[i].id);
                      cacheData.push(formatDataToMakeMessage(messages[i].threadId, JSON.parse(Utility.decrypt(messages[i].data, cacheSecret, messages[i].salt))));
                    } catch (error) {
                      fireEvent("error", {
                        code: error.code,
                        message: error.message,
                        error: error
                      });
                    }
                  }

                  var returnData = {
                    hasError: false,
                    cache: true,
                    errorCode: 0,
                    errorMessage: '',
                    result: {
                      history: cacheData,
                      contentCount: contentCount,
                      hasNext: (offset + count < contentCount && messages.length > 0),
                      nextOffset: offset + messages.length
                    }
                  };

                  /**
                   * Attaching sendQ and waitQ results to history
                   * Messages on sendQ haven't been sent yet, but
                   * messages on waitQ have been sent but the ack
                   * didn't received.
                   */
                  getChatSendQueue(parseInt(params.threadId), function(sendQueueMessages) {

                    for (var i = 0; i < sendQueueMessages.length; i++) {
                      var decryptedEnqueuedMessage = Utility.jsonParser(Utility.decrypt(sendQueueMessages[i].message, cacheSecret));
                      sendQueueMessages[i] = formatDataToMakeMessage(sendQueueMessages[i].threadId, {
                        uniqueId: decryptedEnqueuedMessage.uniqueId,
                        ownerId: userInfo.id,
                        message: decryptedEnqueuedMessage.content,
                        metaData: decryptedEnqueuedMessage.metaData,
                        systemMetadata: decryptedEnqueuedMessage.systemMetadata,
                        replyInfo: decryptedEnqueuedMessage.replyInfo,
                        forwardInfo: decryptedEnqueuedMessage.forwardInfo
                      });
                    }

                    returnData.result.sending = sendQueueMessages;

                    getChatWaitQueue(parseInt(params.threadId), function(waitQueueMessages) {
                      for (var i = 0; i < waitQueueMessages.length; i++) {
                        var decryptedEnqueuedMessage = Utility.jsonParser(Utility.decrypt(waitQueueMessages[i].message, cacheSecret));
                        waitQueueMessages[i] = formatDataToMakeMessage(waitQueueMessages[i].threadId, {
                          uniqueId: decryptedEnqueuedMessage.uniqueId,
                          ownerId: userInfo.id,
                          message: decryptedEnqueuedMessage.content,
                          metaData: decryptedEnqueuedMessage.metaData,
                          systemMetadata: decryptedEnqueuedMessage.systemMetadata,
                          replyInfo: decryptedEnqueuedMessage.replyInfo,
                          forwardInfo: decryptedEnqueuedMessage.forwardInfo
                        });
                      }

                      returnData.result.failed = waitQueueMessages;

                      getChatUploadQueue(parseInt(params.threadId), function(uploadQueueMessages) {
                        returnData.result.uploading = uploadQueueMessages;

                        callback && callback(returnData);
                      });
                    });

                  });

                }).catch((error) => {
                  fireEvent("error", {
                    code: error.code,
                    message: error.message,
                    error: error
                  });
                });
              }).catch(function(error) {
                fireEvent("error", {
                  code: error.code,
                  message: error.message,
                  error: error
                });
              });
          } else {
            fireEvent("error", {
              code: 6601,
              message: CHAT_ERRORS[6601],
              error: null
            });
          }
        }

        /**
         * Get Thread Messages From Server
         */
        return sendMessage(sendMessageParams, {
          onResult: function(result) {
            var returnData = {
              hasError: result.hasError,
              cache: false,
              errorMessage: result.errorMessage,
              errorCode: result.errorCode
            };

            if (!returnData.hasError) {
              var messageContent = result.result,
                messageLength = messageContent.length;

              var history = reformatThreadHistory(params.threadId, messageContent);

              if (messageLength > 0) {
                /**
                 * Calculating First and Last Messages of result
                 */
                var lastMessage = history[messageContent.length - 1],
                  firstMessage = history[0];

                /**
                 * Sending Delivery for Last Message of Thread
                 */
                if (lastMessage.id) {
                  deliver({
                    messageId: lastMessage.id,
                    ownerId: lastMessage.participant.id
                  });
                }
              }

              /**
               * Add Thread Messages into cache database
               * and remove deleted messages from cache database
               */
              if (cacheDb) {
                if (db) {

                  /**
                   * Cache Synchronization
                   *
                   * If there are some results in cache Database,
                   * we have to check if they need to be deleted
                   * or not?
                   *
                   * To do so, first of all we should make sure that
                   * metadataCriteria has not been set, cuz we are
                   * not applying it on the cache results, besides
                   * the results from cache should not be empty,
                   * otherwise there is no need to sync cache
                   */
                  if (cacheResult.length > 0 && !whereClause.hasOwnProperty('metadataCriteria')) {

                    /**
                     * Check if a condition has been applied on query
                     * or not, if there is none, the only limitations
                     * on results are count and offset
                     *
                     * whereClause == []
                     */
                    if (!whereClause || Object.keys(whereClause).length == 0) {

                      /**
                       * There is no condition applied on query
                       * and result is [], so there are no messages
                       * in this thread after this offset, and we
                       * should delete those messages from cache too
                       *
                       * result   []
                       */
                      if (messageLength == 0) {

                        /**
                         * Order is ASC, so if the server result is
                         * empty we should delete everything from
                         * cache which has bigger time than first
                         * item of cache results for this query
                         */
                        if (order == "asc") {
                          var finalMessageTime = cacheFirstMessage.time;

                          db.messages
                            .where("[threadId+owner+time]")
                            .between([parseInt(params.threadId), parseInt(userInfo.id), finalMessageTime], [parseInt(params.threadId), parseInt(userInfo.id), maxIntegerValue * 1000], true, false)
                            .delete()
                            .catch(function(error) {
                              fireEvent("error", {
                                code: error.code,
                                message: error.message,
                                error: error
                              });
                            });
                        }

                        /**
                         * Order is DESC, so if the server result is
                         * empty we should delete everything from
                         * cache which has smaller time than first
                         * item of cache results for this query
                         */
                        else {
                          var finalMessageTime = cacheFirstMessage.time;

                          db.messages
                            .where("[threadId+owner+time]")
                            .between([parseInt(params.threadId), parseInt(userInfo.id), 0], [parseInt(params.threadId), parseInt(userInfo.id), finalMessageTime], true, true)
                            .delete()
                            .catch(function(error) {
                              fireEvent("error", {
                                code: error.code,
                                message: error.message,
                                error: error
                              });
                            });
                        }
                      }

                      /**
                       * Result is not Empty or doesn't have just one single
                       * record, so we should remove everything which are
                       * between firstMessage and lastMessage of this result
                       * from cache database and insert the new result
                       * into cache, so the deleted ones would be deleted
                       *
                       * result   [..., n-1, n, n+1, ...]
                       */
                      else {

                        /**
                         * We should check for last message's previouseId
                         * if it is undefined, so it is the first message
                         * of thread and we should delete everything before
                         * it from cache
                         */
                        if (firstMessage.previousId == undefined || lastMessage.previousId == undefined) {
                          var finalMessageTime = (lastMessage.previousId == undefined) ? lastMessage.time : firstMessage.time;

                          db.messages
                            .where("[threadId+owner+time]")
                            .between([parseInt(params.threadId), parseInt(userInfo.id), 0], [parseInt(params.threadId), parseInt(userInfo.id), finalMessageTime], true, false)
                            .delete()
                            .catch(function(error) {
                              fireEvent("error", {
                                code: error.code,
                                message: error.message,
                                error: error
                              });
                            });
                        }

                        /**
                         * Offset has been set as 0 so this result is
                         * either the very beggining part of thread or
                         * the very last Depending on the sort order
                         *
                         * offset == 0
                         */
                        if (offset == 0) {

                          /**
                           * Results are sorted ASC, and the offet is 0
                           * so the first Messasge of this result is
                           * first Message of thread, everything in
                           * cache database which has smaller time
                           * than this one should be removed
                           *
                           * order    ASC
                           * result   [0, 1, 2, ...]
                           */
                          if (order === "asc") {
                            var finalMessageTime = firstMessage.time;

                            db.messages
                              .where("[threadId+owner+time]")
                              .between([parseInt(params.threadId), parseInt(userInfo.id), 0], [parseInt(params.threadId), parseInt(userInfo.id), finalMessageTime], true, false)
                              .delete()
                              .catch(function(error) {
                                fireEvent("error", {
                                  code: error.code,
                                  message: error.message,
                                  error: error
                                });
                              });
                          }

                          /**
                           * Results are sorted DESC and the offset is 0
                           * so the last Message of this result is the
                           * last Message of the thread, everything in
                           * cache database which has bigger time than
                           * this one should be removed from cache
                           *
                           * order    DESC
                           * result   [..., n-2, n-1, n]
                           */
                          else {
                            var finalMessageTime = firstMessage.time;

                            db.messages
                              .where("[threadId+owner+time]")
                              .between([parseInt(params.threadId), parseInt(userInfo.id), finalMessageTime], [parseInt(params.threadId), parseInt(userInfo.id), maxIntegerValue * 1000], false, true)
                              .delete()
                              .catch(function(error) {
                                fireEvent("error", {
                                  code: error.code,
                                  message: error.message,
                                  error: error
                                });
                              });
                          }
                        }

                        /**
                         * Server result is not Empty, so we should remove
                         * everything which are between firstMessage and
                         * lastMessage of this result from cache database
                         * and insert the new result into cache, so the
                         * deleted ones would be deleted
                         *
                         * result   [..., n-1, n, n+1, ...]
                         */
                        var boundryStartMessageTime = (firstMessage.time < lastMessage.time) ? firstMessage.time : lastMessage.time,
                          boundryEndMessageTime = (firstMessage.time > lastMessage.time) ? firstMessage.time : lastMessage.time;

                        db.messages
                          .where("[threadId+owner+time]")
                          .between([parseInt(params.threadId), parseInt(userInfo.id), boundryStartMessageTime], [parseInt(params.threadId), parseInt(userInfo.id), boundryEndMessageTime], true, true)
                          .delete()
                          .catch(function(error) {
                            fireEvent("error", {
                              code: error.code,
                              message: error.message,
                              error: error
                            });
                          });
                      }
                    }

                    /**
                     * whereClasue is not empty and we should check
                     * for every single one of the conditions to
                     * update the cache properly
                     *
                     * whereClause != []
                     */
                    else {

                      /**
                       * When user ordered a message with exact ID and
                       * server returns [] but there is something in
                       * cache database, we should delete that row
                       * from cache, because it has been deleted
                       */
                      if (whereClause.hasOwnProperty("id") && whereClause.id > 0) {
                        db.messages
                          .where("id")
                          .equals(whereClause.id)
                          .and(function(message) {
                            return message.owner == userInfo.id;
                          })
                          .delete()
                          .catch((error) => {
                            fireEvent("error", {
                              code: error.code,
                              message: error.message,
                              error: error
                            });
                          });
                      }

                      /**
                       * When user sets a query to search on messages
                       * we should delete all the results came from
                       * cache and insert new results instead, because
                       * those messages would be either removed or updated
                       */
                      if (whereClause.hasOwnProperty("query") && typeof whereClause.query == "string") {
                        db.messages
                          .where("[threadId+owner+time]")
                          .between([parseInt(params.threadId), parseInt(userInfo.id), minIntegerValue], [parseInt(params.threadId), parseInt(userInfo.id), maxIntegerValue * 1000])
                          .and(function(message) {
                            var reg = new RegExp(whereClause.query);
                            return reg.test(Utility.decrypt(message.message, cacheSecret, message.salt));
                          })
                          .delete()
                          .catch((error) => {
                            fireEvent("error", {
                              code: error.code,
                              message: error.message,
                              error: error
                            });
                          });
                      }

                      /**
                       * Users sets fromTime or toTime or both of them
                       */
                      if (whereClause.hasOwnProperty("fromTime") || whereClause.hasOwnProperty("toTime")) {

                        /**
                         * Server response is Empty []
                         */
                        if (messageLength == 0) {

                          /**
                           * User set both fromTime and toTime, so we have a
                           * boundry restriction in this case. if server result
                           * is empty, we should delete all messages from cache
                           * which are between fromTime and toTime. if there are
                           * any messages on server in this boundry, we should
                           * delete all messages which are between time of
                           * first and last message of the server result, from cache
                           * and insert new result into cache.
                           */
                          if (whereClause.hasOwnProperty("fromTime") && whereClause.hasOwnProperty("toTime")) {

                            /**
                             * Server response is Empty []
                             */
                            var fromTime = (whereClause.hasOwnProperty("fromTimeNanos")) ? ((whereClause.fromTime / 1000) * 1000000000) + whereClause.fromTimeNanos : whereClause.fromTime * 1000000,
                              toTime = (whereClause.hasOwnProperty("toTimeNanos")) ? (((whereClause.toTime / 1000) + 1) * 1000000000) + whereClause.toTimeNanos : (whereClause.toTime + 1) * 1000000;

                            db.messages
                              .where("[threadId+owner+time]")
                              .between([parseInt(params.threadId), parseInt(userInfo.id), fromTime], [parseInt(params.threadId), parseInt(userInfo.id), toTime], true, true)
                              .delete()
                              .catch(function(error) {
                                fireEvent("error", {
                                  code: error.code,
                                  message: error.message,
                                  error: error
                                });
                              });
                          }

                          /**
                           * User only set fromTime
                           */
                          else if (whereClause.hasOwnProperty("fromTime")) {

                            /**
                             * Server response is Empty []
                             */
                            var fromTime = (whereClause.hasOwnProperty("fromTimeNanos")) ? ((whereClause.fromTime / 1000) * 1000000000) + whereClause.fromTimeNanos : whereClause.fromTime * 1000000;

                            db.messages
                              .where("[threadId+owner+time]")
                              .between([parseInt(params.threadId), parseInt(userInfo.id), fromTime], [parseInt(params.threadId), parseInt(userInfo.id), maxIntegerValue * 1000], true, false)
                              .delete()
                              .catch(function(error) {
                                fireEvent("error", {
                                  code: error.code,
                                  message: error.message,
                                  error: error
                                });
                              });

                          }

                          /**
                           * User only set toTime
                           */
                          else {

                            /**
                             * Server response is Empty []
                             */
                            var toTime = (whereClause.hasOwnProperty("toTimeNanos")) ? (((whereClause.toTime / 1000) + 1) * 1000000000) + whereClause.toTimeNanos : (whereClause.toTime + 1) * 1000000;

                            db.messages
                              .where("[threadId+owner+time]")
                              .between([parseInt(params.threadId), parseInt(userInfo.id), minIntegerValue], [parseInt(params.threadId), parseInt(userInfo.id), toTime], true, true)
                              .delete()
                              .catch(function(error) {
                                fireEvent("error", {
                                  code: error.code,
                                  message: error.message,
                                  error: error
                                });
                              });
                          }
                        }

                        /**
                         * Server response is not Empty [..., n-1, n, n+1, ...]
                         */
                        else {

                          /**
                           * Server response is not Empty [..., n-1, n, n+1, ...]
                           */
                          var boundryStartMessageTime = (firstMessage.time < lastMessage.time) ? firstMessage.time : lastMessage.time,
                            boundryEndMessageTime = (firstMessage.time > lastMessage.time) ? firstMessage.time : lastMessage.time;

                          db.messages
                            .where("[threadId+owner+time]")
                            .between([parseInt(params.threadId), parseInt(userInfo.id), boundryStartMessageTime], [parseInt(params.threadId), parseInt(userInfo.id), boundryEndMessageTime], true, true)
                            .delete()
                            .catch(function(error) {
                              fireEvent("error", {
                                code: error.code,
                                message: error.message,
                                error: error
                              });
                            });
                        }
                      }
                    }
                  }

                  /**
                   * Insert new messages into cache database
                   * after deleting old messages from cache
                   */
                  var cacheData = [];

                  for (var i = 0; i < history.length; i++) {
                    try {
                      var tempData = {},
                        salt = Utility.generateUUID();
                      tempData.id = parseInt(history[i].id);
                      tempData.owner = parseInt(userInfo.id);
                      tempData.threadId = parseInt(history[i].threadId);
                      tempData.time = history[i].time;
                      tempData.message = Utility.crypt(history[i].message, cacheSecret, salt);
                      tempData.data = Utility.crypt(JSON.stringify(unsetNotSeenDuration(history[i])), cacheSecret, salt);
                      tempData.salt = salt;
                      tempData.sendStatus = "sent";

                      cacheData.push(tempData);
                    } catch (error) {
                      fireEvent("error", {
                        code: error.code,
                        message: error.message,
                        error: error
                      });
                    }
                  }

                  db.messages
                    .bulkPut(cacheData)
                    .catch(function(error) {
                      fireEvent("error", {
                        code: error.code,
                        message: error.message,
                        error: error
                      });
                    });
                } else {
                  fireEvent("error", {
                    code: 6601,
                    message: CHAT_ERRORS[6601],
                    error: null
                  });
                }
              }

              var resultData = {
                history: history,
                contentCount: result.contentCount,
                hasNext: (sendMessageParams.content.offset + sendMessageParams.content.count < result.contentCount && messageLength > 0),
                nextOffset: sendMessageParams.content.offset + messageLength
              };

              returnData.result = resultData;

              /**
               * Attaching sendQ and waitQ results to history
               * Messages on sendQ haven't been sent yet, but
               * messages on waitQ have been sent but the ack
               * didn't received.
               */
              getChatSendQueue(parseInt(params.threadId), function(sendQueueMessages) {

                for (var i = 0; i < sendQueueMessages.length; i++) {
                  var decryptedEnqueuedMessage = Utility.jsonParser(Utility.decrypt(sendQueueMessages[i].message, cacheSecret));
                  sendQueueMessages[i] = formatDataToMakeMessage(sendQueueMessages[i].threadId, {
                    uniqueId: decryptedEnqueuedMessage.uniqueId,
                    ownerId: userInfo.id,
                    message: decryptedEnqueuedMessage.content,
                    metaData: decryptedEnqueuedMessage.metaData,
                    systemMetadata: decryptedEnqueuedMessage.systemMetadata,
                    replyInfo: decryptedEnqueuedMessage.replyInfo,
                    forwardInfo: decryptedEnqueuedMessage.forwardInfo
                  });
                }

                returnData.result.sending = sendQueueMessages;

                getChatWaitQueue(parseInt(params.threadId), function(waitQueueMessages) {
                  for (var i = 0; i < waitQueueMessages.length; i++) {
                    var decryptedEnqueuedMessage = Utility.jsonParser(Utility.decrypt(waitQueueMessages[i].message, cacheSecret));
                    waitQueueMessages[i] = formatDataToMakeMessage(waitQueueMessages[i].threadId, {
                      uniqueId: decryptedEnqueuedMessage.uniqueId,
                      ownerId: userInfo.id,
                      message: decryptedEnqueuedMessage.content,
                      metaData: decryptedEnqueuedMessage.metaData,
                      systemMetadata: decryptedEnqueuedMessage.systemMetadata,
                      replyInfo: decryptedEnqueuedMessage.replyInfo,
                      forwardInfo: decryptedEnqueuedMessage.forwardInfo
                    });
                  }

                  returnData.result.failed = waitQueueMessages;

                  getChatUploadQueue(parseInt(params.threadId), function(uploadQueueMessages) {
                    returnData.result.uploading = uploadQueueMessages;

                    callback && callback(returnData);
                    callback = undefined;
                  });
                });
              });
            }
          }
        });
      },

      /**
       * Update Thread Info
       *
       * This functions updates metadata of thread
       *
       * @access private
       *
       * @param {int}       threadId      Id of thread
       * @param {string}    image         URL og thread image to be set
       * @param {string}    description   Description for thread
       * @param {string}    title         New Title for thread
       * @param {object}    metadata      New Metadata to be set on thread
       * @param {function}  callback      The callback function to call after
       *
       * @return {object} Instant sendMessage result
       */
      updateThreadInfo = function(params, callback) {
        var updateThreadInfoData = {
          chatMessageVOType: chatMessageVOTypes.UPDATE_THREAD_INFO,
          typeCode: params.typeCode,
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

      /**
       * Deliver
       *
       * This functions sends delivery messages for a message
       *
       * @access private
       *
       * @param {int}    ownerId    Id of Message owner
       * @param {long}   messageId  Id of Message
       *
       * @return {object} Instant sendMessage result
       */
      deliver = function(params) {
        if (userInfo && params.ownerId !== userInfo.id) {
          return sendMessage({
            chatMessageVOType: chatMessageVOTypes.DELIVERY,
            typeCode: params.typeCode,
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
       * @access private
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
       * @access private
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
       * @access private
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
       * @access private
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

      /**
       * Fire Event
       *
       * Fires given Event with given parameters
       *
       * @access private
       *
       * @param {string}  eventName       name of event to be fired
       * @param {object}  param           params to be sent to the event function
       *
       * @return {undefined}
       */
      fireEvent = function(eventName, param) {
        for (var id in eventCallbacks[eventName]) {
          eventCallbacks[eventName][id](param);
        }
      },

      /**
       * Delete Cache Database
       *
       * This function truncates all tables of cache Database
       * and drops whole tables
       *
       * @access private
       *
       * @return {undefined}
       */
      deleteCacheDatabases = function() {
        if (db) {
          db.close();
        }

        var cacheDb = new Dexie('podChat');
        if (cacheDb) {
          cacheDb.delete().then(() => {
            console.log("PodChat Database successfully deleted!");
          }).catch((err) => {
            console.log(err);
          });
        }

        if (queueDb) {
          queueDb.close();
        }

        var queueDb = new Dexie('podQueues');
        if (queueDb) {
          queueDb.delete().then(() => {
            console.log("PodQueues Database successfully deleted!");
          }).catch((err) => {
            console.log(err);
          });
        }
      },

      /**
       * Get Chat Send Queue
       *
       * This function checks if cache is enbled on client's
       * machine, and if it is, retrieves sendQueue from
       * cache. Otherwise returns sendQueue from RAM
       *
       * @access private
       *
       * @return {array}  An array of messages on sendQueue
       */
      getChatSendQueue = function(threadId, callback) {
        if (hasCache && typeof queueDb == "object") {
          var collection;

          if (threadId) {
            collection = queueDb.sendQ.where("threadId").equals(threadId);
          } else {
            collection = queueDb.sendQ;
          }

          collection
            .toArray()
            .then(function(sendQueueOnCache) {
              callback && callback(sendQueueOnCache);
            })
            .catch(function(error) {
              fireEvent("error", {
                code: error.code,
                message: error.message,
                error: error
              });
            });
        } else {
          if (threadId) {
            var tempSendQueue = [];

            for (var i = 0; i < chatSendQueue.length; i++) {
              if (chatSendQueue[i].threadId == threadId) {
                tempSendQueue.push(chatSendQueue[i]);
              }
            }
            callback && callback(tempSendQueue);
          } else {
            callback && callback(chatSendQueue);
          }
        }
      },

      /**
       * Get Chat Wait Queue
       *
       * This function checks if cache is enbled on client's
       * machine, and if it is, retrieves WaitQueue from
       * cache. Otherwise returns WaitQueue from RAM
       * After getting failed messages from cache or RAM
       * we should check them with server to be sure if
       * they have been sent already or not?
       *
       * @access private
       *
       * @return {array}  An array of messages on sendQueue
       */
      getChatWaitQueue = function(threadId, callback) {
        if (hasCache && typeof queueDb == "object") {
          queueDb.waitQ
            .where("threadId")
            .equals(threadId)
            .toArray()
            .then(function(waitQueueOnCache) {
              var uniqueIds = [];

              for (var i = 0; i < waitQueueOnCache.length; i++) {
                uniqueIds.push(waitQueueOnCache[i].uniqueId);
              }

              if (uniqueIds.length) {
                sendMessage({
                  chatMessageVOType: chatMessageVOTypes.GET_HISTORY,
                  content: {
                    uniqueIds: uniqueIds
                  },
                  subjectId: threadId
                }, {
                  onResult: function(result) {
                    if (!result.hasError) {
                      var messageContent = result.result;

                      for (var i = 0; i < messageContent.length; i++) {
                        for (var j = 0; j < uniqueIds.length; j++) {
                          if (uniqueIds[j] == messageContent[i].uniqueId) {
                            deleteFromChatSentQueue(messageContent[i], function() {});
                            uniqueIds.splice(j, 1);
                            waitQueueOnCache.splice(j, 1);
                          }
                        }
                      }
                      callback && callback(waitQueueOnCache);
                    }
                  }
                });
              } else {
                callback && callback([]);
              }
            })
            .catch(function(error) {
              fireEvent("error", {
                code: error.code,
                message: error.message,
                error: error
              });
            });
        } else {
          var uniqueIds = [];

          for (var i = 0; i < chatWaitQueue.length; i++) {
            uniqueIds.push(chatWaitQueue[i].uniqueId);
          }

          if (uniqueIds.length) {
            sendMessage({
              chatMessageVOType: chatMessageVOTypes.GET_HISTORY,
              content: {
                uniqueIds: uniqueIds
              },
              subjectId: threadId
            }, {
              onResult: function(result) {
                if (!result.hasError) {
                  var messageContent = result.result;

                  for (var i = 0; i < messageContent.length; i++) {
                    for (var j = 0; j < uniqueIds.length; j++) {
                      if (uniqueIds[j] == messageContent[i].uniqueId) {
                        uniqueIds.splice(j, 1);
                        chatWaitQueue.splice(j, 1);
                      }
                    }
                  }
                  callback && callback(chatWaitQueue);
                }
              }
            });
          } else {
            callback && callback([]);
          }
        }
      },

      /**
       * Get Chat Upload Queue
       *
       * This function checks if cache is enbled on client's
       * machine, and if it is, retrieves uploadQueue from
       * cache. Otherwise returns uploadQueue from RAM
       *
       * @access private
       *
       * @return {array}  An array of messages on uploadQueue
       */
      getChatUploadQueue = function(threadId, callback) {
        // if (hasCache && typeof queueDb == "object") {
        //   queueDb.uploadQ
        //     .toArray()
        //     .then(function(uploadQueueOnCache) {
        //       callback && callback(uploadQueueOnCache);
        //     })
        //     .catch(function(error) {
        //       fireEvent("error", {
        //         code: error.code,
        //         message: error.message,
        //         error: error
        //       });
        //     });
        // }
        // else {
        //   callback && callback(chatUploadQueue);
        // }

        // Temproray
        var uploadQ = [];
        for (var i = 0; i < chatUploadQueue.length; i++) {
          if (chatUploadQueue[i].threadId == threadId) {
            uploadQ.push(chatUploadQueue[i]);
          }
        }

        callback && callback(chatUploadQueue);
      },

      /**
       * Delete an Item from Chat Send Queue
       *
       * This function gets an item and deletes it
       * from Chat Send Queue, from either cached
       * queue or the queue on RAM memory
       *
       * @access private
       *
       * @return {undefined}
       */
      deleteFromChatSentQueue = function(item, callback) {
        if (hasCache && typeof queueDb == "object") {
          queueDb.sendQ
            .where("uniqueId")
            .equals(item.uniqueId)
            .delete()
            .then(function() {
              callback && callback();
            })
            .catch(function(error) {
              fireEvent("error", {
                code: error.code,
                message: error.message,
                error: error
              });
            });
        } else {
          for (var i = 0; i < chatSendQueue.length; i++) {
            if (chatSendQueue[i].uniqueId == item.uniqueId) {
              chatSendQueue.splice(i, 1);
            }
          }
          callback && callback();
        }
      },

      /**
       * Delete an Item from Chat Wait Queue
       *
       * This function gets an item and deletes it
       * from Chat Wait Queue, from either cached
       * queue or the queue on RAM memory
       *
       * @access private
       *
       * @return {undefined}
       */
      deleteFromChatWaitQueue = function(item, callback) {
        if (hasCache && typeof queueDb == "object") {
          queueDb.waitQ
            .where("uniqueId")
            .equals(item.uniqueId)
            .delete()
            .then(function() {
              callback && callback();
            })
            .catch(function(error) {
              fireEvent("error", {
                code: error.code,
                message: error.message,
                error: error
              });
            });
        } else {
          for (var i = 0; i < chatWaitQueue.length; i++) {
            if (chatWaitQueue[i].uniqueId == item.uniqueId) {
              chatWaitQueue.splice(i, 1);
            }
          }
          callback && callback();
        }
      },

      /**
       * Delete an Item from Chat Upload Queue
       *
       * This function gets an item and deletes it
       * from Chat Upload Queue, from either cached
       * queue or the queue on RAM memory
       *
       * @access private
       *
       * @return {undefined}
       */
      deleteFromChatUploadQueue = function(item, callback) {
        // if (hasCache && typeof queueDb == "object") {
        //   queueDb.uploadQ
        //     .where("uniqueId")
        //     .equals(item.uniqueId)
        //     .delete()
        //     .then(function() {
        //       callback && callback();
        //     })
        //     .catch(function(error) {
        //       fireEvent("error", {
        //         code: error.code,
        //         message: error.message,
        //         error: error
        //       });
        //     });
        // } else {
        //   for (var i = 0; i < chatUploadQueue.length; i++) {
        //     if (chatUploadQueue[i].uniqueId == item.uniqueId) {
        //       chatUploadQueue.splice(i, 1);
        //     }
        //   }
        //   callback && callback();
        // }

        // Temproray
        for (var i = 0; i < chatUploadQueue.length; i++) {
          if (chatUploadQueue[i].uniqueId == item.uniqueId) {
            chatUploadQueue.splice(i, 1);
          }
        }
        callback && callback();
      },

      /**
       * Push Message Into Send Queue
       *
       * This functions takes a message and puts it
       * into chat's send queue, If cache is available
       * on clients machine it uses cache for chat queues
       * otherwise it uses a normal array as chat queue
       *
       * @access private
       *
       * @param {object}    params    The Message and its callbacks to be enqueued
       *
       * @return {undefined}
       */
      putInChatSendQueue = function(params, callback) {
        /**
         * If cache is available n clients machine
         * we should use cache for chat queues
         */
        if (hasCache && typeof queueDb == "object") {
          queueDb.sendQ.put({
              threadId: parseInt(params.message.subjectId),
              uniqueId: (typeof params.message.uniqueId == "string") ? params.message.uniqueId : (Array.isArray(params.message.uniqueId)) ? params.message.uniqueId[0] : "",
              message: Utility.crypt(Utility.jsonStringify(params.message), cacheSecret),
              callbacks: Utility.crypt(Utility.jsonStringify(params.callbacks), cacheSecret)
            })
            .then(function() {
              callback && callback();
            })
            .catch(function(error) {
              fireEvent("error", {
                code: error.code,
                message: error.message,
                error: error
              });
            });
        }

        /**
         * There is no cache option on clinets machine
         * so we use aimple arrays as fallback
         */
        else {
          chatSendQueue.push(params);
          callback && callback();
        }
      },

      /**
       * Put an Item inside Chat Wait Queue
       *
       * This function takes an item and puts it
       * inside Chat Wait Queue, either on cached
       * wait queue or the wait queue on RAM memory
       *
       * @access private
       *
       * @return {undefined}
       */
      putInChatWaitQueue = function(item, callback) {
        if (item.uniqueId != "") {
          if (hasCache && typeof queueDb == "object") {
            queueDb.waitQ.put({
                threadId: parseInt(item.threadId),
                uniqueId: item.uniqueId,
                message: item.message,
                callbacks: item.callbacks
              })
              .then(function() {
                callback && callback();
              })
              .catch(function(error) {
                fireEvent("error", {
                  code: error.code,
                  message: error.message,
                  error: error
                });
              });
          } else {
            chatWaitQueue.push(item);
            callback && callback();
          }
        }
      },

      /**
       * Put an Item inside Chat Upload Queue
       *
       * This function takes an item and puts it
       * inside Chat upload Queue, either on cached
       * wait queue or the wait queue on RAM memory
       *
       * @access private
       *
       * @return {undefined}
       */
      putInChatUploadQueue = function(params, callback) {

        /**
         * If cache is available n clients machine
         * we should use cache for chat queues
         */
        // if (hasCache && typeof queueDb == "object") {
        //   queueDb.uploadQ.put({
        //       threadId: parseInt(params.message.subjectId),
        //       uniqueId: params.message.uniqueId,
        //       message: Utility.crypt(Utility.jsonStringify(params.message), cacheSecret),
        //       callbacks: Utility.crypt(Utility.jsonStringify(params.callbacks), cacheSecret)
        //     })
        //     .then(function() {
        //       callback && callback();
        //     })
        //     .catch(function(error) {
        //       fireEvent("error", {
        //         code: error.code,
        //         message: error.message,
        //         error: error
        //       });
        //     });
        // }

        /**
         * There is no cache option on clinets machine
         * so we use aimple arrays as fallback
         */
        // else {
        // chatUploadQueue.push(params);
        // callback && callback();
        // }

        // Temproray
        chatUploadQueue.push(params);
        callback && callback();
      },

      /**
       * Transfer an Item from uploadQueue to sendQueue
       *
       * This function takes an uniqueId, finds that item
       * inside uploadQ. takes it's uploaded metaData and
       * attachs them to the message. Finally removes item
       * from uploadQueue and pushes it inside sendQueue
       *
       * @access private
       *
       * @return {undefined}
       */
      transferFromUploadQToSendQ = function(threadId, uniqueId, metadata, callback) {
        getChatUploadQueue(threadId, function(uploadQueue) {
          for (var i = 0; i < uploadQueue.length; i++) {
            if (uploadQueue[i].message.uniqueId == uniqueId) {
              try {
                var message = uploadQueue[i].message,
                  callbacks = uploadQueue[i].callbacks;

                message.metaData = metadata;
              } catch (e) {
                console.error(e);
              }

              deleteFromChatUploadQueue(uploadQueue[i], function() {
                putInChatSendQueue({
                  message: message,
                  callbacks: callbacks
                }, function() {
                  callback && callback();
                });
              });

              break;
            }
          }
        });
      };


    /******************************************************
     *             P U B L I C   M E T H O D S            *
     ******************************************************/

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

    this.getThreads = getThreads;

    this.getHistory = getHistory;

    /**
     * Get Contacts
     *
     * Gets contacts list from chat server
     *
     * @access pubic
     *
     * @param {int}     count           Count of objects to get
     * @param {int}     offset          Offset of select Query
     * @param {string}  query           Search in contacts list to get (search LIKE firatName, lastName, email)
     *
     * @return {object} Instant Response
     */
    this.getContacts = function(params, callback) {
      var count = 50,
        offset = 0,
        content = {},
        whereClause = {};

      if (params) {
        if (parseInt(params.count) > 0) {
          count = params.count;
        }

        if (parseInt(params.offset) > 0) {
          offset = params.offset;
        }

        if (typeof params.query === "string") {
          content.query = whereClause.query = params.query;
        }
      }

      content.size = count;
      content.offset = offset;

      var sendMessageParams = {
        chatMessageVOType: chatMessageVOTypes.GET_CONTACTS,
        typeCode: params.typeCode,
        content: content
      };

      /**
       * Retrieve contacts from cache #cache
       */
      if (cacheDb) {
        if (db) {

          /**
           * First of all we delete all contacts those
           * expireTime has been expired. after that
           * we query our cache database to retrieve
           * what we wanted
           */
          db.contacts
            .where("expireTime")
            .below(new Date().getTime())
            .delete()
            .then(function() {

              /**
               * Query cache database to get contacts
               */
              var thenAble;

              if (Object.keys(whereClause).length === 0) {
                thenAble = db.contacts
                  .where("owner")
                  .equals(userInfo.id);
              } else {
                if (whereClause.hasOwnProperty("query")) {
                  thenAble = db.contacts
                    .where("owner")
                    .equals(userInfo.id)
                    .filter(function(contact) {
                      var reg = new RegExp(whereClause.query);
                      return reg.test(Utility.decrypt(contact.firstName, cacheSecret, contact.salt) + " " + Utility.decrypt(contact.lastName, cacheSecret, contact.salt) + " " + Utility.decrypt(contact.email, cacheSecret, contact.salt));
                    });
                }
              }

              thenAble
                .reverse()
                .offset(offset)
                .limit(count)
                .toArray()
                .then(function(contacts) {
                  db.contacts
                    .where("owner")
                    .equals(userInfo.id)
                    .count()
                    .then(function(contactsCount) {
                      var cacheData = [];

                      for (var i = 0; i < contacts.length; i++) {
                        try {
                          var tempData = {},
                            salt = contacts[i].salt;

                          cacheData.push(formatDataToMakeContact(JSON.parse(Utility.decrypt(contacts[i].data, cacheSecret, contacts[i].salt))));
                        } catch (error) {
                          fireEvent("error", {
                            code: error.code,
                            message: error.message,
                            error: error
                          });
                        }
                      }

                      var returnData = {
                        hasError: false,
                        cache: true,
                        errorCode: 0,
                        errorMessage: '',
                        result: {
                          contacts: cacheData,
                          contentCount: contactsCount,
                          hasNext: (offset + count < contactsCount && contacts.length > 0),
                          nextOffset: offset + contacts.length
                        }
                      };

                      if (cacheData.length > 0) {
                        callback && callback(returnData);
                      }
                    });
                }).catch(function(error) {
                  fireEvent("error", {
                    code: error.code,
                    message: error.message,
                    error: error
                  });
                });
            })
            .catch(function(error) {
              fireEvent("error", {
                code: error.code,
                message: error.message,
                error: error
              });
            });
        } else {
          fireEvent("error", {
            code: 6601,
            message: CHAT_ERRORS[6601],
            error: null
          });
        }
      }

      /**
       * Retrieve Contacts from server
       */
      return sendMessage(sendMessageParams, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            cache: false,
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
                nextOffset: offset + messageLength
              },
              contactData;

            for (var i = 0; i < messageLength; i++) {
              contactData = formatDataToMakeContact(messageContent[i]);
              if (contactData) {
                resultData.contacts.push(contactData);
              }
            }

            returnData.result = resultData;

            /**
             * Add Contacts into cache database #cache
             */
            if (cacheDb) {
              if (db) {
                var cacheData = [];

                for (var i = 0; i < resultData.contacts.length; i++) {
                  try {
                    var tempData = {},
                      salt = Utility.generateUUID();
                    tempData.id = resultData.contacts[i].id;
                    tempData.owner = userInfo.id;
                    tempData.uniqueId = resultData.contacts[i].uniqueId;
                    tempData.userId = Utility.crypt(resultData.contacts[i].userId, cacheSecret, salt);
                    tempData.cellphoneNumber = Utility.crypt(resultData.contacts[i].cellphoneNumber, cacheSecret, salt);
                    tempData.email = Utility.crypt(resultData.contacts[i].email, cacheSecret, salt);
                    tempData.firstName = Utility.crypt(resultData.contacts[i].firstName, cacheSecret, salt);
                    tempData.lastName = Utility.crypt(resultData.contacts[i].lastName, cacheSecret, salt);
                    tempData.expireTime = new Date().getTime() + cacheExpireTime;
                    tempData.data = Utility.crypt(JSON.stringify(unsetNotSeenDuration(resultData.contacts[i])), cacheSecret, salt);
                    tempData.salt = salt;

                    cacheData.push(tempData);
                  } catch (error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  }
                }

                db.contacts
                  .bulkPut(cacheData)
                  .catch(function(error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  });
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }
          }

          callback && callback(returnData);
          /**
           * Delete callback so if server pushes response before
           * cache, cache won't send data again
           */
          callback = undefined;
        }
      });
    };

    /**
     * Get Thread Participants
     *
     * Gets participants list of given thread
     *
     * @access pubic
     *
     * @param {int}     threadId        Id of thread which you want to get participants of
     * @param {int}     count           Count of objects to get
     * @param {int}     offset          Offset of select Query
     * @param {string}  name            Search in Participants list (LIKE in name, contactName, email)
     *
     * @return {object} Instant Response
     */
    this.getThreadParticipants = function(params, callback) {
      var sendMessageParams = {
          chatMessageVOType: chatMessageVOTypes.THREAD_PARTICIPANTS,
          typeCode: params.typeCode,
          content: {},
          subjectId: params.threadId
        },
        whereClause = {};

      var offset = (parseInt(params.offset) > 0) ? parseInt(params.offset) : 0,
        count = (parseInt(params.count) > 0) ? parseInt(params.count) : config.getHistoryCount;

      sendMessageParams.content.count = count;
      sendMessageParams.content.offset = offset;

      if (typeof params.name === "string") {
        sendMessageParams.content.name = whereClause.name = params.name;
      }

      /**
       * Retrieve thread participants from cache
       */
      if (cacheDb) {
        if (db) {

          db.participants
            .where("expireTime")
            .below(new Date().getTime())
            .delete()
            .then(function() {

              var thenAble;

              if (Object.keys(whereClause).length === 0) {
                thenAble = db.participants
                  .where("threadId")
                  .equals(parseInt(params.threadId))
                  .and(function(participant) {
                    return participant.owner == userInfo.id;
                  });
              } else {
                if (whereClause.hasOwnProperty("name")) {
                  thenAble = db.participants
                    .where("threadId")
                    .equals(parseInt(params.threadId))
                    .and(function(participant) {
                      return participant.owner == userInfo.id;
                    })
                    .filter(function(contact) {
                      var reg = new RegExp(whereClause.name);
                      return reg.test(Utility.decrypt(contact.contactName, cacheSecret, contact.salt) + " " + Utility.decrypt(contact.name, cacheSecret, contact.salt) + " " + Utility.decrypt(contact.email, cacheSecret, contact.salt));
                    });
                }
              }

              thenAble
                .offset(offset)
                .limit(count)
                .reverse()
                .toArray()
                .then(function(participants) {
                  db.participants
                    .where("threadId")
                    .equals(parseInt(params.threadId))
                    .and(function(participant) {
                      return participant.owner == userInfo.id;
                    })
                    .count()
                    .then(function(participantsCount) {

                      var cacheData = [];

                      for (var i = 0; i < participants.length; i++) {
                        try {
                          var tempData = {},
                            salt = participants[i].salt;

                          cacheData.push(formatDataToMakeParticipant(JSON.parse(Utility.decrypt(participants[i].data, cacheSecret, participants[i].salt)), participants[i].threadId));
                        } catch (error) {
                          fireEvent("error", {
                            code: error.code,
                            message: error.message,
                            error: error
                          });
                        }
                      }

                      var returnData = {
                        hasError: false,
                        cache: true,
                        errorCode: 0,
                        errorMessage: '',
                        result: {
                          participants: cacheData,
                          contentCount: participantsCount,
                          hasNext: (offset + count < participantsCount && participants.length > 0),
                          nextOffset: offset + participants.length
                        }
                      };

                      if (cacheData.length > 0) {
                        callback && callback(returnData);
                      }
                    });
                }).catch(function(error) {
                  fireEvent("error", {
                    code: error.code,
                    message: error.message,
                    error: error
                  });
                });
            })
            .catch(function(error) {
              fireEvent("error", {
                code: error.code,
                message: error.message,
                error: error
              });
            });
        } else {
          fireEvent("error", {
            code: 6601,
            message: CHAT_ERRORS[6601],
            error: null
          });
        }
      }

      return sendMessage(sendMessageParams, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            cache: false,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode
          };

          if (!returnData.hasError) {
            var messageContent = result.result,
              messageLength = messageContent.length,
              resultData = {
                participants: reformatThreadParticipants(messageContent, params.threadId),
                contentCount: result.contentCount,
                hasNext: (sendMessageParams.content.offset + sendMessageParams.content.count < result.contentCount && messageLength > 0),
                nextOffset: sendMessageParams.content.offset + messageLength
              };

            returnData.result = resultData;


            /**
             * Add thread participants into cache database #cache
             */
            if (cacheDb) {
              if (db) {

                var cacheData = [];

                for (var i = 0; i < resultData.participants.length; i++) {
                  try {
                    var tempData = {},
                      salt = Utility.generateUUID();

                    tempData.id = parseInt(resultData.participants[i].id);
                    tempData.owner = parseInt(userInfo.id);
                    tempData.threadId = parseInt(resultData.participants[i].threadId);
                    tempData.notSeenDuration = resultData.participants[i].notSeenDuration;
                    tempData.name = Utility.crypt(resultData.participants[i].name, cacheSecret, salt);
                    tempData.contactName = Utility.crypt(resultData.participants[i].contactName, cacheSecret, salt);
                    tempData.email = Utility.crypt(resultData.participants[i].email, cacheSecret, salt);
                    tempData.expireTime = new Date().getTime() + cacheExpireTime;
                    tempData.data = Utility.crypt(JSON.stringify(unsetNotSeenDuration(resultData.participants[i])), cacheSecret, salt);
                    tempData.salt = salt;

                    cacheData.push(tempData);
                  } catch (error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  }
                }

                db.participants
                  .bulkPut(cacheData)
                  .catch(function(error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  });
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }
          }

          callback && callback(returnData);
          /**
           * Delete callback so if server pushes response before
           * cache, cache won't send data again
           */
          callback = undefined;
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
        chatMessageVOType: chatMessageVOTypes.ADD_PARTICIPANT,
        typeCode: params.typeCode
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
            cache: false,
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
        chatMessageVOType: chatMessageVOTypes.REMOVE_PARTICIPANT,
        typeCode: params.typeCodes
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
            cache: false,
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
        chatMessageVOType: chatMessageVOTypes.LEAVE_THREAD,
        typeCode: params.typeCode
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
            cache: false,
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
       * + CreateThreadRequest      {object}
       *    - ownerSsoId            {string}
       *    + invitees              {object}
       *       -id                  {string}
       *       -idType              {int} ** inviteeVOidTypes
       *    - title                 {string}
       *    - type                  {int} ** createThreadTypes
       *    - image                 {string}
       *    - description           {string}
       *    - metadata              {string}
       *    + message               {object}
       *       -text                {string}
       *       -type                {int}
       *       -repliedTo           {long}
       *       -uniqueId            {string}
       *       -metadata            {string}
       *       -systemMetadata      {string}
       *       -forwardedMessageIds {string}
       *       -forwardedUniqueIds  {string}
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

        if (typeof params.image === "string") {
          content.image = params.image;
        }

        if (typeof params.description === "string") {
          content.description = params.description;
        }

        if (typeof params.metadata === "string") {
          content.metadata = params.metadata;
        } else if (typeof params.metadata === "object") {
          try {
            content.metadata = JSON.stringify(params.metadata);
          } catch (e) {
            console.error(e);
          }
        }

        if (typeof params.message == "object") {
          content.message = {};

          if (typeof params.message.text === "string") {
            content.message.text = params.message.text;
          }

          if (typeof params.message.uniqueId === "string") {
            content.message.uniqueId = params.message.uniqueId;
          }

          if (typeof params.message.type > 0) {
            content.message.type = params.message.type;
          }

          if (typeof params.message.repliedTo > 0) {
            content.message.repliedTo = params.message.repliedTo;
          }

          if (typeof params.message.metadata === "string") {
            content.message.metadata = params.message.metadata;
          } else if (typeof params.message.metadata === "object") {
            content.message.metadata = JSON.stringify(params.message.metadata);
          }

          if (typeof params.message.systemMetadata === "string") {
            content.message.systemMetadata = params.message.systemMetadata;
          } else if (typeof params.message.systemMetadata === "object") {
            content.message.systemMetadata = JSON.stringify(params.message.systemMetadata);
          }

          if (Array.isArray(params.message.forwardedMessageIds)) {
            content.message.forwardedMessageIds = params.message.forwardedMessageIds;
            content.message.forwardedUniqueIds = [];
            for (var i = 0; i < params.message.forwardedMessageIds.length; i++) {
              content.message.forwardedUniqueIds.push(Utility.generateUUID());
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
            cache: false,
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
      var metaData = {},
        uniqueId;

      if (typeof params.uniqueId != "undefined") {
        uniqueId = params.uniqueId;
      } else {
        uniqueId = Utility.generateUUID();
      }

      putInChatSendQueue({
        message: {
          chatMessageVOType: chatMessageVOTypes.MESSAGE,
          typeCode: params.typeCode,
          messageType: params.messageType,
          subjectId: params.threadId,
          repliedTo: params.repliedTo,
          content: params.content,
          uniqueId: uniqueId,
          systemMetadata: JSON.stringify(params.systemMetadata),
          metaData: JSON.stringify(metaData),
          pushMsgType: 5
        },
        callbacks: callbacks
      }, function() {
        chatSendQueueHandler();
      });
    };

    this.sendBotMessage = function(params, callbacks) {
      var metaData = {};

      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.BOT_MESSAGE,
        typeCode: params.typeCode,
        subjectId: params.messageId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: params.uniqueId,
        receiver: params.receiver,
        systemMetadata: JSON.stringify(params.systemMetadata),
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
            fileUploadParams.fileName = params.fileName.split(".")[0] + "." + fileExtension;
          } else {
            fileUploadParams.fileName = fileUniqueId + "." + fileExtension;
          }

          fileUploadParams.threadId = params.threadId;
          fileUploadParams.uniqueId = fileUniqueId;
          fileUploadParams.fileObject = params.file;
          fileUploadParams.originalFileName = fileName;

          putInChatUploadQueue({
            message: {
              chatMessageVOType: chatMessageVOTypes.MESSAGE,
              typeCode: params.typeCode,
              messageType: params.messageType,
              subjectId: params.threadId,
              repliedTo: params.repliedTo,
              content: params.content,
              subjectId: params.threadId,
              repliedTo: params.repliedTo,
              content: params.content,
              metaData: JSON.stringify(metaData),
              systemMetadata: JSON.stringify(params.systemMetadata),
              uniqueId: fileUniqueId,
              pushMsgType: 4
            },
            callbacks: callbacks
          }, function() {
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

                  transferFromUploadQToSendQ(parseInt(params.threadId), fileUniqueId, JSON.stringify(metaData), function() {
                    chatSendQueueHandler();
                  });
                }
              });
            } else {
              uploadFile(fileUploadParams, function(result) {
                if (!result.hasError) {
                  metaData["file"]["name"] = result.result.name;
                  metaData["file"]["hashCode"] = result.result.hashCode;
                  metaData["file"]["id"] = result.result.id;
                  metaData["file"]["link"] = SERVICE_ADDRESSES.FILESERVER_ADDRESS + SERVICES_PATH.GET_FILE + "?fileId=" + result.result.id + "&hashCode=" + result.result.hashCode;

                  transferFromUploadQToSendQ(parseInt(params.threadId), fileUniqueId, JSON.stringify(metaData), function() {
                    chatSendQueueHandler();
                  });
                }
              });
            }

            return {
              uniqueId: fileUniqueId,
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
          });
        } else {
          fireEvent("error", {
            code: 6302,
            message: CHAT_ERRORS[6302]
          });
        }
      }
    };

    this.resendMessage = function(uniqueId) {
      if (hasCache && typeof queueDb == "object") {
        queueDb.waitQ
          .where("uniqueId")
          .equals(uniqueId)
          .toArray()
          .then(function(messages) {
            if (messages.length) {
              putInChatSendQueue({
                message: Utility.jsonParser(Utility.decrypt(messages[0].message, cacheSecret)),
                callbacks: Utility.jsonParser(Utility.decrypt(messages[0].callbacks, cacheSecret))
              }, function() {
                chatSendQueueHandler();
              });
            }
          })
          .catch(function(error) {
            fireEvent("error", {
              code: error.code,
              message: error.message,
              error: error
            });
          });
      } else {
        for (var i = 0; i < chatWaitQueue.length; i++) {
          if (chatWaitQueue[i].message.uniqueId == uniqueId) {
            putInChatSendQueue({
              message: chatWaitQueue[i].message,
              callbacks: chatWaitQueue[i].callbacks
            }, function() {
              chatSendQueueHandler();
            });
            break;
          }
        }
      }
    };

    this.cancelMessage = function(uniqueId, callback) {
      deleteFromChatSentQueue({
        uniqueId: uniqueId
      }, function() {
        deleteFromChatWaitQueue({
          uniqueId: uniqueId
        }, callback);
      });
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

          deleteFromChatUploadQueue({
            uniqueId: uniqueId
          }, callback);
        }
      }
      return;
    };

    this.editMessage = function(params, callback) {
      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.EDIT_MESSAGE,
        typeCode: params.typeCode,
        messageType: params.messageType,
        subjectId: params.messageId,
        repliedTo: params.repliedTo,
        content: params.content,
        uniqueId: params.uniqueId,
        metaData: params.metaData,
        systemMetadata: params.systemMetadata,
        pushMsgType: 4
      }, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            cache: false,
            errorMessage: result.errorMessage,
            errorCode: result.errorCode
          };

          if (!returnData.hasError) {
            var messageContent = result.result,
              resultData = {
                editedMessage: formatDataToMakeMessage(undefined, messageContent)
              };

            returnData.result = resultData;

            /**
             * Update Message on cache
             */
            if (cacheDb) {
              if (db) {
                try {
                  var tempData = {},
                    salt = Utility.generateUUID();
                  tempData.id = parseInt(resultData.editedMessage.id);
                  tempData.owner = parseInt(userInfo.id);
                  tempData.threadId = parseInt(resultData.editedMessage.threadId);
                  tempData.time = resultData.editedMessage.time;
                  tempData.message = Utility.crypt(resultData.editedMessage.message, cacheSecret, salt);
                  tempData.data = Utility.crypt(JSON.stringify(unsetNotSeenDuration(resultData.editedMessage)), cacheSecret, salt);
                  tempData.salt = salt;

                  /**
                   * Insert Message into cache database
                   */
                  db.messages
                    .put(tempData)
                    .catch(function(error) {
                      fireEvent("error", {
                        code: error.code,
                        message: error.message,
                        error: error
                      });
                    });
                } catch (error) {
                  fireEvent("error", {
                    code: error.code,
                    message: error.message,
                    error: error
                  });
                }
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }
          }

          callback && callback(returnData);
        }
      });
    };

    this.deleteMessage = function(params, callback) {
      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.DELETE_MESSAGE,
        typeCode: params.typeCode,
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
            cache: false,
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

            /**
             * Remove Message from cache
             */
            if (cacheDb) {
              if (db) {
                db.messages
                  .where('id')
                  .equals(result.result)
                  .delete()
                  .catch(function(error) {
                    fireEvent("error", {
                      code: 6602,
                      message: CHAT_ERRORS[6602],
                      error: error
                    });
                  });
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }

          }

          callback && callback(returnData);
        }
      });
    };

    this.replyMessage = function(params, callbacks) {
      var uniqueId;

      if (typeof params.uniqueId != "undefined") {
        uniqueId = params.uniqueId;
      } else {
        uniqueId = Utility.generateUUID();
      }

      putInChatSendQueue({
        message: {
          chatMessageVOType: chatMessageVOTypes.MESSAGE,
          typeCode: params.typeCode,
          messageType: params.messageType,
          subjectId: params.threadId,
          repliedTo: params.repliedTo,
          content: params.content,
          uniqueId: uniqueId,
          systemMetadata: JSON.stringify(params.systemMetadata),
          metaData: JSON.stringify(params.metaData),
          pushMsgType: 5
        },
        callbacks: callbacks
      }, function() {
        chatSendQueueHandler();
      });
    };

    this.replyFileMessage = function(params, callbacks) {

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
            fileUploadParams.fileName = params.fileName.split(".")[0] + "." + fileExtension;
          } else {
            fileUploadParams.fileName = fileUniqueId + "." + fileExtension;
          }

          fileUploadParams.threadId = params.threadId;
          fileUploadParams.uniqueId = fileUniqueId;
          fileUploadParams.fileObject = params.file;
          fileUploadParams.originalFileName = fileName;

          putInChatUploadQueue({
            message: {
              chatMessageVOType: chatMessageVOTypes.MESSAGE,
              typeCode: params.typeCode,
              messageType: params.messageType,
              subjectId: params.threadId,
              repliedTo: params.repliedTo,
              content: params.content,
              subjectId: params.threadId,
              repliedTo: params.repliedTo,
              content: params.content,
              metaData: JSON.stringify(metaData),
              systemMetadata: JSON.stringify(params.systemMetadata),
              uniqueId: fileUniqueId,
              pushMsgType: 4
            },
            callbacks: callbacks
          }, function() {
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

                  transferFromUploadQToSendQ(parseInt(params.threadId), fileUniqueId, JSON.stringify(metaData), function() {
                    chatSendQueueHandler();
                  });
                }
              });
            } else {
              uploadFile(fileUploadParams, function(result) {
                if (!result.hasError) {
                  metaData["file"]["name"] = result.result.name;
                  metaData["file"]["hashCode"] = result.result.hashCode;
                  metaData["file"]["id"] = result.result.id;
                  metaData["file"]["link"] = SERVICE_ADDRESSES.FILESERVER_ADDRESS + SERVICES_PATH.GET_FILE + "?fileId=" + result.result.id + "&hashCode=" + result.result.hashCode;

                  transferFromUploadQToSendQ(parseInt(params.threadId), fileUniqueId, JSON.stringify(metaData), function() {
                    chatSendQueueHandler();
                  });
                }
              });
            }

            return {
              uniqueId: fileUniqueId,
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
          });
        } else {
          fireEvent("error", {
            code: 6302,
            message: CHAT_ERRORS[6302]
          });
        }
      }


      // var uniqueId;
      //
      // if (typeof params.uniqueId != "undefined") {
      //   uniqueId = params.uniqueId;
      // } else {
      //   uniqueId = Utility.generateUUID();
      // }
      //
      // putInChatSendQueue({
      //   message: {
      //     chatMessageVOType: chatMessageVOTypes.MESSAGE,
      //     typeCode: params.typeCode,
      //     messageType: params.messageType,
      //     subjectId: params.threadId,
      //     repliedTo: params.repliedTo,
      //     content: params.content,
      //     uniqueId: uniqueId,
      //     systemMetadata: JSON.stringify(params.systemMetadata),
      //     metaData: JSON.stringify(params.metaData),
      //     pushMsgType: 5
      //   },
      //   callbacks: callbacks
      // }, function() {
      //   chatSendQueueHandler();
      // });
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

      putInChatSendQueue({
        message: {
          chatMessageVOType: chatMessageVOTypes.FORWARD_MESSAGE,
          typeCode: params.typeCode,
          subjectId: params.subjectId,
          repliedTo: params.repliedTo,
          content: params.content,
          uniqueId: uniqueIdsList,
          metaData: JSON.stringify(params.metaData),
          pushMsgType: 5
        },
        callbacks: callbacks
      }, function() {
        chatSendQueueHandler();
      });
    };

    this.deliver = deliver(params);

    this.seen = function(params) {
      if (userInfo && params.ownerId !== userInfo.id) {
        return sendMessage({
          chatMessageVOType: chatMessageVOTypes.SEEN,
          typeCode: params.typeCode,
          content: params.messageId,
          pushMsgType: 3
        });
      }
    }

    this.getMessageDeliveredList = function(params, callback) {

      var deliveryListData = {
        chatMessageVOType: chatMessageVOTypes.GET_MESSAGE_DELEVERY_PARTICIPANTS,
        typeCode: params.typeCode,
        content: {},
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      };

      if (params) {
        if (parseInt(params.messageId) > 0) {
          deliveryListData.content.messageId = params.messageId;
        }
      }

      return sendMessage(deliveryListData, {
        onResult: function(result) {
          if (typeof result.result == "object") {
            for (var i = 0; i < result.result.length; i++) {
              result.result[i] = formatDataToMakeUser(result.result[i]);
            }
          }
          callback && callback(result);
        }
      });
    };

    this.getMessageSeenList = function(params, callback) {
      var seenListData = {
        chatMessageVOType: chatMessageVOTypes.GET_MESSAGE_SEEN_PARTICIPANTS,
        typeCode: params.typeCode,
        content: {},
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      };

      if (params) {
        if (parseInt(params.messageId) > 0) {
          seenListData.content.messageId = params.messageId;
        }
      }

      return sendMessage(seenListData, {
        onResult: function(result) {
          if (typeof result.result == "object") {
            for (var i = 0; i < result.result.length; i++) {
              result.result[i] = formatDataToMakeUser(result.result[i]);
            }
          }
          callback && callback(result);
        }
      });
    };

    this.updateThreadInfo = updateThreadInfo;

    this.muteThread = function(params, callback) {
      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.MUTE_THREAD,
        typeCode: params.typeCode,
        subjectId: params.subjectId,
        content: {},
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      }, {
        onResult: function(result) {
          callback && callback(result);
        }
      });
    }

    this.unMuteThread = function(params, callback) {
      return sendMessage({
        chatMessageVOType: chatMessageVOTypes.UNMUTE_THREAD,
        typeCode: params.typeCode,
        subjectId: params.subjectId,
        content: {},
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      }, {
        onResult: function(result) {
          callback && callback(result);
        }
      });
    }

    this.spamPvThread = function(params, callback) {
      var spamData = {
        chatMessageVOType: chatMessageVOTypes.SPAM_PV_THREAD,
        typeCode: params.typeCode,
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
        typeCode: params.typeCode,
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
        typeCode: params.typeCode,
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
        typeCode: params.typeCode,
        content: content,
        pushMsgType: 4,
        token: token,
        timeout: params.timeout
      };

      return sendMessage(getBlockedData, {
        onResult: function(result) {
          var returnData = {
            hasError: result.hasError,
            cache: false,
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
                nextOffset: offset + messageLength
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
            cache: false,
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

            /**
             * Add Contacts into cache database #cache
             */
            if (cacheDb) {
              if (db) {
                var cacheData = [];

                for (var i = 0; i < resultData.contacts.length; i++) {
                  try {
                    var tempData = {},
                      salt = Utility.generateUUID();
                    tempData.id = resultData.contacts[i].id;
                    tempData.owner = userInfo.id;
                    tempData.uniqueId = resultData.contacts[i].uniqueId;
                    tempData.userId = Utility.crypt(resultData.contacts[i].userId, cacheSecret, salt);
                    tempData.cellphoneNumber = Utility.crypt(resultData.contacts[i].cellphoneNumber, cacheSecret, salt);
                    tempData.email = Utility.crypt(resultData.contacts[i].email, cacheSecret, salt);
                    tempData.firstName = Utility.crypt(resultData.contacts[i].firstName, cacheSecret, salt);
                    tempData.lastName = Utility.crypt(resultData.contacts[i].lastName, cacheSecret, salt);
                    tempData.expireTime = new Date().getTime() + cacheExpireTime;
                    tempData.data = Utility.crypt(JSON.stringify(unsetNotSeenDuration(resultData.contacts[i])), cacheSecret, salt);
                    tempData.salt = salt;

                    cacheData.push(tempData);
                  } catch (error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  }
                }

                db.contacts
                  .bulkPut(cacheData)
                  .catch(function(error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  });
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }

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
            cache: false,
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

            /**
             * Add Contacts into cache database #cache
             */
            if (cacheDb) {
              if (db) {
                var cacheData = [];

                for (var i = 0; i < resultData.contacts.length; i++) {
                  try {
                    var tempData = {},
                      salt = Utility.generateUUID();
                    tempData.id = resultData.contacts[i].id;
                    tempData.owner = userInfo.id;
                    tempData.uniqueId = resultData.contacts[i].uniqueId;
                    tempData.userId = Utility.crypt(resultData.contacts[i].userId, cacheSecret, salt);
                    tempData.cellphoneNumber = Utility.crypt(resultData.contacts[i].cellphoneNumber, cacheSecret, salt);
                    tempData.email = Utility.crypt(resultData.contacts[i].email, cacheSecret, salt);
                    tempData.firstName = Utility.crypt(resultData.contacts[i].firstName, cacheSecret, salt);
                    tempData.lastName = Utility.crypt(resultData.contacts[i].lastName, cacheSecret, salt);
                    tempData.expireTime = new Date().getTime() + cacheExpireTime;
                    tempData.data = Utility.crypt(JSON.stringify(unsetNotSeenDuration(resultData.contacts[i])), cacheSecret, salt);
                    tempData.salt = salt;

                    cacheData.push(tempData);
                  } catch (error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  }
                }

                db.contacts
                  .bulkPut(cacheData)
                  .catch(function(error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  });
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }

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
            cache: false,
            errorMessage: responseData.message,
            errorCode: responseData.errorCode
          };

          if (!responseData.hasError) {
            returnData.result = responseData.result;
          }

          /**
           * Remove the contact from cache
           */
          if (cacheDb) {
            if (db) {
              db.contacts
                .where('id')
                .equals(params.id)
                .delete()
                .catch(function(error) {
                  fireEvent("error", {
                    code: 6602,
                    message: CHAT_ERRORS[6602],
                    error: error
                  });
                });
            } else {
              fireEvent("error", {
                code: 6601,
                message: CHAT_ERRORS[6601],
                error: null
              });
            }
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
        },
        whereClause = {};

      if (params) {
        if (typeof params.firstName === "string") {
          data.firstName = whereClause.firstName = params.firstName;
        }

        if (typeof params.lastName === "string") {
          data.lastName = whereClause.lastName = params.lastName;
        }

        if (parseInt(params.cellphoneNumber) > 0) {
          data.cellphoneNumber = whereClause.cellphoneNumber = params.cellphoneNumber;
        }

        if (typeof params.email === "string") {
          data.email = whereClause.email = params.email;
        }

        if (typeof params.q === "string") {
          data.q = whereClause.q = params.q;
        }

        if (typeof params.uniqueId === "string") {
          data.uniqueId = whereClause.uniqueId = params.uniqueId;
        }

        if (parseInt(params.id) > 0) {
          data.id = whereClause.id = params.id;
        }

        if (parseInt(params.typeCode) > 0) {
          data.typeCode = whereClause.typeCode = params.typeCode;
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

      /**
       * Search contacts in cache #cache
       */
      if (cacheDb) {
        if (db) {

          /**
           * First of all we delete all contacts those
           * expireTime has been expired. after that
           * we query our cache database to retrieve
           * what we wanted
           */
          db.contacts
            .where("expireTime")
            .below(new Date().getTime())
            .delete()
            .then(function() {

              /**
               * Query cache database to get contacts
               */

              var thenAble;

              if (Object.keys(whereClause).length === 0) {
                thenAble = db.contacts
                  .where("owner")
                  .equals(userInfo.id);
              } else {
                if (whereClause.hasOwnProperty("id")) {
                  thenAble = db.contacts
                    .where("owner")
                    .equals(userInfo.id)
                    .and(function(contact) {
                      return contact.id == whereClause.id;
                    });
                } else if (whereClause.hasOwnProperty("uniqueId")) {
                  thenAble = db.contacts
                    .where("owner")
                    .equals(userInfo.id)
                    .and(function(contact) {
                      return contact.uniqueId == whereClause.uniqueId;
                    });
                } else {
                  if (whereClause.hasOwnProperty("firstName")) {
                    thenAble = db.contacts
                      .where("owner")
                      .equals(userInfo.id)
                      .filter(function(contact) {
                        var reg = new RegExp(whereClause.firstName);
                        return reg.test(Utility.decrypt(contact.firstName, cacheSecret, contact.salt));
                      });
                  }

                  if (whereClause.hasOwnProperty("lastName")) {
                    thenAble = db.contacts
                      .where("owner")
                      .equals(userInfo.id)
                      .filter(function(contact) {
                        var reg = new RegExp(whereClause.lastName);
                        return reg.test(Utility.decrypt(contact.lastName, cacheSecret, contact.salt));
                      });
                  }

                  if (whereClause.hasOwnProperty("email")) {
                    thenAble = db.contacts
                      .where("owner")
                      .equals(userInfo.id)
                      .filter(function(contact) {
                        var reg = new RegExp(whereClause.email);
                        return reg.test(Utility.decrypt(contact.email, cacheSecret, contact.salt));
                      });
                  }

                  if (whereClause.hasOwnProperty("q")) {
                    thenAble = db.contacts
                      .where("owner")
                      .equals(userInfo.id)
                      .filter(function(contact) {
                        var reg = new RegExp(whereClause.q);
                        return reg.test(Utility.decrypt(contact.firstName, cacheSecret, contact.salt) + " " + Utility.decrypt(contact.lastName, cacheSecret, contact.salt) + " " + Utility.decrypt(contact.email, cacheSecret, contact.salt));
                      });
                  }
                }
              }

              thenAble
                .offset(data.offset)
                .limit(data.size)
                .toArray()
                .then(function(contacts) {
                  db.contacts
                    .where("owner")
                    .equals(userInfo.id)
                    .count()
                    .then(function(contactsCount) {
                      var cacheData = [];

                      for (var i = 0; i < contacts.length; i++) {
                        try {
                          var tempData = {},
                            salt = contacts[i].salt;

                          cacheData.push(formatDataToMakeContact(JSON.parse(Utility.decrypt(contacts[i].data, cacheSecret, contacts[i].salt))));
                        } catch (error) {
                          fireEvent("error", {
                            code: error.code,
                            message: error.message,
                            error: error
                          });
                        }
                      }

                      var returnData = {
                        hasError: false,
                        cache: true,
                        errorCode: 0,
                        errorMessage: '',
                        result: {
                          contacts: cacheData,
                          contentCount: contactsCount,
                          hasNext: (data.offset + data.size < contactsCount && contacts.length > 0),
                          nextOffset: data.offset + contacts.length
                        }
                      };

                      if (cacheData.length > 0) {
                        callback && callback(returnData);
                      }
                    }).catch((error) => {
                      fireEvent("error", {
                        code: error.code,
                        message: error.message,
                        error: error
                      });
                    });
                }).catch(function(error) {
                  fireEvent("error", {
                    code: error.code,
                    message: error.message,
                    error: error
                  });
                });
            })
            .catch(function(error) {
              fireEvent("error", {
                code: error.code,
                message: error.message,
                error: error
              });
            });
        } else {
          fireEvent("error", {
            code: 6601,
            message: CHAT_ERRORS[6601],
            error: null
          });
        }
      }

      /**
       * Get Search Contacts Result From Server
       */
      httpRequest(requestParams, function(result) {
        if (!result.hasError) {
          var responseData = JSON.parse(result.result.responseText);

          var returnData = {
            hasError: responseData.hasError,
            cache: false,
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

            /**
             * Add Contacts into cache database #cache
             */
            if (cacheDb) {
              if (db) {
                var cacheData = [];

                for (var i = 0; i < resultData.contacts.length; i++) {
                  try {
                    var tempData = {},
                      salt = Utility.generateUUID();

                    tempData.id = resultData.contacts[i].id;
                    tempData.owner = userInfo.id;
                    tempData.uniqueId = resultData.contacts[i].uniqueId;
                    tempData.userId = Utility.crypt(resultData.contacts[i].userId, cacheSecret, salt);
                    tempData.cellphoneNumber = Utility.crypt(resultData.contacts[i].cellphoneNumber, cacheSecret, salt);
                    tempData.email = Utility.crypt(resultData.contacts[i].email, cacheSecret, salt);
                    tempData.firstName = Utility.crypt(resultData.contacts[i].firstName, cacheSecret, salt);
                    tempData.lastName = Utility.crypt(resultData.contacts[i].lastName, cacheSecret, salt);
                    tempData.expireTime = new Date().getTime() + cacheExpireTime;
                    tempData.data = crypt(JSON.stringify(unsetNotSeenDuration(resultData.contacts[i])), cacheSecret, salt);
                    tempData.salt = salt;

                    cacheData.push(tempData);
                  } catch (error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  }
                }

                db.contacts
                  .bulkPut(cacheData)
                  .catch(function(error) {
                    fireEvent("error", {
                      code: error.code,
                      message: error.message,
                      error: error
                    });
                  });
              } else {
                fireEvent("error", {
                  code: 6601,
                  message: CHAT_ERRORS[6601],
                  error: null
                });
              }
            }
          }

          callback && callback(returnData);
          /**
           * Delete callback so if server pushes response before
           * cache, cache won't send data again
           */
          callback = undefined;

        } else {
          fireEvent("error", {
            code: result.errorCode,
            message: result.errorMessage,
            error: result
          });
        }
      });
    }

    this.mapReverse = function(params, callback) {
      var data = {};

      if (params) {
        if (parseFloat(params.lat) > 0) {
          data.lat = params.lat;
        }

        if (parseFloat(params.lng) > 0) {
          data.lng = params.lng;
        }

        data.uniqueId = Utility.generateUUID();
      }

      var requestParams = {
        url: SERVICE_ADDRESSES.MAP_ADDRESS + SERVICES_PATH.REVERSE,
        method: "GET",
        data: data,
        headers: {
          "Api-Key": mapApiKey
        }
      };

      httpRequest(requestParams, function(result) {
        if (!result.hasError) {
          var responseData = JSON.parse(result.result.responseText);

          var returnData = {
            hasError: result.hasError,
            cache: result.cache,
            errorMessage: result.message,
            errorCode: result.errorCode,
            result: responseData
          };

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

    this.mapSearch = function(params, callback) {
      var data = {};

      if (params) {
        if (typeof params.term === "string") {
          data.term = params.term;
        }

        if (parseFloat(params.lat) > 0) {
          data.lat = params.lat;
        }

        if (parseFloat(params.lng) > 0) {
          data.lng = params.lng;
        }

        data.uniqueId = Utility.generateUUID();
      }

      var requestParams = {
        url: SERVICE_ADDRESSES.MAP_ADDRESS + SERVICES_PATH.SEARCH,
        method: "GET",
        data: data,
        headers: {
          "Api-Key": mapApiKey
        }
      };

      httpRequest(requestParams, function(result) {
        if (!result.hasError) {
          var responseData = JSON.parse(result.result.responseText);

          var returnData = {
            hasError: result.hasError,
            cache: result.cache,
            errorMessage: result.message,
            errorCode: result.errorCode,
            result: responseData
          };

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

    this.mapRouting = function(params, callback) {
      var data = {};

      if (params) {
        if (typeof params.alternative === "boolean") {
          data.alternative = params.alternative;
        } else {
          data.alternative = true;
        }

        if (typeof params.origin === "object") {
          if (parseFloat(params.origin.lat) > 0 && parseFloat(params.origin.lng)) {
            data.origin = params.origin.lat + "," + parseFloat(params.origin.lng);
          } else {
            // Throw Error
          }
        }

        if (typeof params.destination === "object") {
          if (parseFloat(params.destination.lat) > 0 && parseFloat(params.destination.lng)) {
            data.destination = params.destination.lat + "," + parseFloat(params.destination.lng);
          } else {
            // Throw Error
          }
        }

        data.uniqueId = Utility.generateUUID();
      }

      var requestParams = {
        url: SERVICE_ADDRESSES.MAP_ADDRESS + SERVICES_PATH.ROUTING,
        method: "GET",
        data: data,
        headers: {
          "Api-Key": mapApiKey
        }
      };

      httpRequest(requestParams, function(result) {
        if (!result.hasError) {
          var responseData = JSON.parse(result.result.responseText);

          var returnData = {
            hasError: result.hasError,
            cache: result.cache,
            errorMessage: result.message,
            errorCode: result.errorCode,
            result: responseData
          };

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

    this.mapStaticImage = function(params, callback) {
      var data = {},
        url = SERVICE_ADDRESSES.MAP_ADDRESS + SERVICES_PATH.STATIC_IMAGE,
        hasError = false;

      if (params) {
        if (typeof params.type === "string") {
          data.type = params.type;
        } else {
          data.type = "standard-night";
        }

        if (parseInt(params.zoom) > 0) {
          data.zoom = params.zoom;
        } else {
          data.zoom = 15;
        }

        if (parseInt(params.width) > 0) {
          data.width = params.width;
        } else {
          data.width = 800;
        }

        if (parseInt(params.height) > 0) {
          data.height = params.height;
        } else {
          data.height = 600;
        }

        if (typeof params.center === "object") {
          if (parseFloat(params.center.lat) > 0 && parseFloat(params.center.lng)) {
            data.center = params.center.lat + "," + parseFloat(params.center.lng);
          } else {
            hasError = true;
            fireEvent("error", {
              code: 6700,
              message: CHAT_ERRORS[6700],
              error: undefined
            });
          }
        } else {
          hasError = true;
          fireEvent("error", {
            code: 6700,
            message: CHAT_ERRORS[6700],
            error: undefined
          });
        }

        data.key = mapApiKey;
      }

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

      var returnData = {
        hasError: hasError,
        cache: false,
        errorMessage: (hasError) ? CHAT_ERRORS[6700] : "",
        errorCode: (hasError) ? 6700 : undefined,
        result: {
          link: (!hasError) ? url : ""
        }
      };

      callback && callback(returnData);
    };

    this.generateUUID = Utility.generateUUID;

    this.logout = function() {
      asyncClient.logout();
    };

    this.clearChatServerCaches = clearChatServerCaches;

    this.deleteCacheDatabases = deleteCacheDatabases;

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
