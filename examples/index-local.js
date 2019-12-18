var Chat = require('../src/chat.js');

var params = {
    appId: new Date().getTime(),

    /**
     * ActiveMQ Config
     */
    // protocol: "queue",
    // queueHost: "10.56.16.25",
    // queuePort: "61613",
    // queueUsername: "root",
    // queuePassword: "zalzalak",
    // queueReceive: "queue-in-amjadi-stomp",
    // queueSend: "queue-out-amjadi-stomp",
    // queueConnectionTimeout: 20000,
    // serverName: "chat-server",

    /**
     * ActiveMQ Config - Sheikh
     */
    // protocol: "queue",
    // queueHost: "192.168.112.23",
    // queuePort: "61613",
    // queueUsername: "root",
    // queuePassword: "j]Bm0RU8gLhbPUG",
    // queueReceive: "queue-in-local_chat",
    // queueSend: "queue-out-local_chat",
    // queueConnectionTimeout: 20000,

    // protocol: "queue",
    // queueHost: "172.16.0.248",
    // queuePort: "61613",
    // queueUsername: "root",
    // queuePassword: "zalzalak",
    // queueReceive: "queue-in-wepod",
    // queueSend: "queue-out-wepod",
    // queueConnectionTimeout: 20000,
    // serverName: "chat-server",

    /**
     * Main Server
     */
    // socketAddress: 'wss://msg.pod.ir/ws', // {**REQUIRED**} Socket Address
    // ssoHost: 'https://accounts.pod.ir', // {**REQUIRED**} Socket Address
    // platformHost: 'https://api.pod.ir/srv/core', // {**REQUIRED**} Platform Core Address
    // fileServer: 'https://core.pod.ir', // {**REQUIRED**} File Server Address
    // serverName: 'chat-server', // {**REQUIRED**} Server to to register on

    /**
     * Hamed Mehrara
     */
    // socketAddress: 'ws://172.16.106.26:8003/ws', // {**REQUIRED**} Socket Address
    // ssoHost: 'http://172.16.110.76', // {**REQUIRED**} Socket Address
    // platformHost: 'http://172.16.106.26:8080/hamsam', // {**REQUIRED**} Platform Core Address
    // fileServer: 'http://172.16.106.26:8080/hamsam', // {**REQUIRED**} File Server Address
    // serverName: 'chat-server', // {**REQUIRED**} Server to to register on

    /**
     * Mehdi Sheikh Hosseini
     */
    // socketAddress: 'ws://172.16.110.235:8003/ws', // {**REQUIRED**} Socket Address
    // ssoHost: 'http://172.16.110.76', // {**REQUIRED**} Socket Address
    // platformHost: 'http://172.16.110.76:8080', // {**REQUIRED**} Platform Core Address
    // fileServer: 'http://172.16.110.76:8080', // {**REQUIRED**} File Server Address
    // serverName: 'chat-server', // {**REQUIRED**} Server to to register on


    /**
     * Leila Nemati
     */
    // socketAddress: 'ws://172.16.110.235:8003/ws', // {**REQUIRED**} Socket Address
    // ssoHost: 'http://172.16.110.76', // {**REQUIRED**} Socket Address
    // platformHost: 'http:///172.16.110.76:8080', // {**REQUIRED**} Platform Core Address
    // fileServer: 'http:///172.16.110.76:8080', // {**REQUIRED**} File Server Address
    // serverName: 'sheikh_chat', // {**REQUIRED**} Server to to

    /**
     * Sand Box
     */
    socketAddress: "wss://chat-sandbox.pod.ir/ws", // {**REQUIRED**} Socket Address
    ssoHost: "https://accounts.pod.ir", // {**REQUIRED**} Socket Address
    platformHost: "https://sandbox.pod.ir:8043/srv/basic-platform", // {**REQUIRED**} Platform Core Address
    fileServer: "https://sandbox.pod.ir:8443", // {**REQUIRED**} File Server Address
    serverName: "chat-server", // {**REQUIRED**} Server to to register on

    grantDeviceIdFromSSO: false,
    enableCache: false, // Enable Client side caching
    fullResponseObject: false,
    mapApiKey: '8b77db18704aa646ee5aaea13e7370f4f88b9e8c',
    // typeCode: "talk",
    token: "824b3d3ca8404da794cfd10632fa48de",
    // token: "7cba09ff83554fc98726430c30afcfc6", // {**REQUIRED**} SSO Token ZiZi
    // token: "fbd4ecedb898426394646e65c6b1d5d1", //  {**REQUIRED**} SSO Token JiJi
    // token: "5fb88da4c6914d07a501a76d68a62363", // {**REQUIRED**} SSO Token FiFi
    // token: "bebc31c4ead6458c90b607496dae25c6", // {**REQUIRED**} SSO Token Alexi
    // token: "e4f1d5da7b254d9381d0487387eabb0a", // {**REQUIRED**} SSO Token Felfeli
    wsConnectionWaitTime: 500, // Time out to wait for socket to get ready after open
    connectionRetryInterval: 5000, // Time interval to retry registering device or registering server
    connectionCheckTimeout: 10000, // Socket connection live time on server
    messageTtl: 24 * 60 * 60, // Message time to live (1 day in seonds)
    reconnectOnClose: true, // auto connect to socket after socket close
    httpRequestTimeout: 30000,
    httpUploadRequestTimeout: 0, // 0 means No timeout
    asyncLogging: {
        onFunction: true, // log main actions on console
        onMessageReceive: true, // log received messages on console
        onMessageSend: true, // log sent messaged on console
        actualTiming: true // log actual functions running time
    }
};

var chatAgent = new Chat(params),
    PID;

chatAgent.on('chatReady', function () {
    /*******************************************************
     *                  I S    T Y P I N G                 *
     *******************************************************/
    // chatAgent.startTyping({threadId: 1431});
    //
    // setTimeout(function() {
    //     chatAgent.stopTyping();
    // }, 15000);

    /*******************************************************
     *                       U S E R                       *
     *******************************************************/
    // chatAgent.deleteCacheDatabase();
    /**
     *  Get User Info
     */
    // getUserInfo();

    /**
     * Get Unseen Duration of users
     */
    // chatAgent.getNotSeenDuration({
    //     userIds: [122, 123]
    // }, function(result) {
    //     console.log(result);
    // });

    /*******************************************************
     *                    T H R E A D S                    *
     *******************************************************/

    /**
     * GET THREADS
     * @param count
     * @param offset
     * @param threadIds
     * @param name
     */
    // getThreads({
    //   count: 10,
    //   offset: 0,
    //   //   partnerCoreContactId: 63533و
    //   // threadIds: [1576],
    //   // name: "تست"
    // });

    // chatAgent.getAllThreadList({
    //     summary: true,
    //     cache: false
    // }, function(result) {
    //     // console.log(result);
    // });

    /**
     * CREATE THREAD (Creates Group)
     * @param invitees
     * @param threadType
     */
    // createThread([{
    //   id: 902,
    //   type: "TO_BE_USER_CONTACT_ID"
    // }, {
    //   id: 7741,
    //   type: "TO_BE_USER_CONTACT_ID"
    // }], "NORMAL");

    /**
     * CREATE THREAD (Creates P2P Chat with a specific user)
     * @param contactId
     */
    // createThread({id: 18514, type: "TO_BE_USER_CONTACT_ID"});

    /**
     * GET THREAD PARTICIPANTS
     * @param threadId
     */
    // getThreadParticipants(6609);

    // chatAgent.getThreadAdmins({threadId: 6292}, function(result){
    //     console.log("Get Thread Admins result", result.result.participants);
    // });

    /**
     * ADD PARTICIPANTS
     * @param threadId
     * @param contacts {Array}  CONTACT ID
     */
    // addParticipants(6609, [4702]);

    /**
     * REMOVE PARTICIPANTS
     * @param threadId
     * @param participants {Array}  USER ID
     */
    // removeParticipants(10349, [123]);

    /**
     * LEAVE THREAD
     * @param threadId
     */
    // leaveThread(2673);

    /**
     * CLEAR THREAD HISTORY
     * @param threadId
     */
    // chatAgent.clearHistory({
    //     threadId: 15
    // }, function(result) {
    //     console.log("Clear history result", result);
    // });

    /**
     * GET THREAD HISTORY
     * @param count
     * @param offset
     * @param threadId
     * @param firstMessageId
     * @param lastMessageId
     * @param metaQuery
     * @param query
     */
    // getHistory({
    //     count: 20,
    //     offset: 0,
    //     threadId: 6653
    // });

    // getHistory({
    //     count: 10,
    //     offset: 0,
    //     threadId: 9481,
    //     // uniqueIds: ["5fc5b138-498c-4da4-d440-5c8bfc7159ee", "93d7991c-add1-4227-d792-ad1bfb03e094", "ad0ae288-6e11-4621-fe50-ea1b634e80c7", "d9aa1833-5f27-4a1d-f5bd-5ae298d2bfa3", "f50fda14-ef88-4071-b3f2-248a18b4ffcf", "redsf233f23rfdsfsdfs"],
    //     // id: 34890,
    //     // order: "ASC",
    //     // query: "Helllo",
    //     // fromTime: 1557037111638,
    //     // fromTimeNanos: 638489000,
    //     // toTime: 1557037111638,
    //     // toTimeNanos: 638489000,
    //     // metadataCriteria: {
    //     //     'field': 'id',
    //     //     'gt': 667,
    //     //     'and': [
    //     //         {
    //     //             'field': 'name',
    //     //             'has': 'Mas'
    //     //         },
    //     //         {
    //     //             'field': 'active',
    //     //             'is': 1
    //     //         },
    //     //         {
    //     //             'field': 'address.building.age',
    //     //             'lte': 11
    //     //         }
    //     //     ],
    //     // }
    // });

    // chatAgent.resendMessage("0c00552d-c291-4c0c-bec9-81f870edf170");

    /**
     * GET SINGLE MESSAGE
     * @param threadId
     * @param messageId
     */
    // getSingleMessage(312, 16955);

    /**
     * MUTE THREAD
     * @param threadId
     */
    // muteThread(1431);

    /**
     * UNMUTE THREAD
     * @param threadId
     */
    // unMuteThread(1431);

    /**
     * PIN THREAD
     * @param threadId
     */
    // pinThread(6292);

    /**
     * UNPIN THREAD
     * @param threadId
     */
    // unPinThread(6292);

    /**
     * UPDATE THREAD INFO
     * @param threadId
     */
    // chatAgent.updateThreadInfo({
    //   threadId: 10349,
    //   image: "https://static2.farakav.com/files/pictures/thumb/01330672.jpg",
    //   description: "توضیحات ترد",
    //   title: "عنوان ترد",
    //   metadata: {
    //     id: 1152,
    //     owner: "masoudmanson",
    //     name: "John Doe"
    //   }
    // }, function(result) {
    //   console.log(result);
    // });

    /**
     * SPAM P2P THREAD
     * @param threadId
     */
    // chatAgent.spamPvThread({
    //   threadId: 4441
    // }, function(result) {
    //   console.log(result);
    // });

    /**
     * SET ADMIN
     * @param threadId
     * @param userId
     * @param roles
     */
    // chatAgent.setAdmin({
    //     threadId: 6292,
    //     admins: [
    //         {
    //             userId: 6862,
    //             roles: [
    //                 'post_channel_message',
    //                 'edit_message_of_others',
    //                 'delete_message_of_others',
    //                 'add_new_user',
    //                 'remove_user',
    //                 'thread_admin',
    //                 'add_rule_to_user',
    //                 'remove_role_from_user',
    //                 'read_thread',
    //                 'edit_thread'
    //             ]
    //         }]
    // }, function(result) {
    //     console.log(result);
    // });

    // chatAgent.removeAdmin({
    //     threadId: 6292,
    //     admins: [
    //         {
    //             userId: 6862,
    //             roles: [
    //                 'post_channel_message',
    //                 'edit_message_of_others',
    //                 'delete_message_of_others',
    //                 'add_new_user',
    //                 'remove_user',
    //                 'thread_admin',
    //                 'add_rule_to_user',
    //                 'remove_role_from_user',
    //                 // 'read_thread',
    //                 'edit_thread'
    //             ]
    //         }]
    // }, function(result) {
    //     console.log(result);
    //     console.log(result.result[0]);
    // });

    /*******************************************************
     *                   M E S S A G E S                   *
     *******************************************************/

    /**
     * SEND MESSAGE IN THREAD
     * @param threadId
     * @param newMessage
     * @param metadata
     */
    // setInterval(() => {
    //     sendMessage(6609, '@h.amouzegar @ma.amjadi Message From PodDraw at ' + new Date(), {
    //         id: 672,
    //         type: 'message',
    //         name: 'Masoud',
    //         address: {
    //             street: 'shariati',
    //             plaque: 13,
    //             building: {
    //                 color: 'black',
    //                 age: 11
    //             }
    //         },
    //         active: 0
    //     });
    // }, 1000);

    /**
     * SEND FILE MESSAGE IN THREAD
     * @param threadId
     * @param file
     * @param caption
     * @param metadata
     */
    // sendFileMessage(6653, __dirname + "/../test/test.txt", "Sample file description", {
    //     custom_name: "John Doe"
    // });

    createThreadWithFile(
        __dirname + "/../test/test.jpg",
        [{
            id: 902,
            type: "TO_BE_USER_CONTACT_ID"
        }, {
            id: 7741,
            type: "TO_BE_USER_CONTACT_ID"
        }],
        "NORMAL");

    /**
     * Send Location Message
     *
     * @param  {string}   type           Map style (default standard-night)
     * @param  {int}      zoom           Map zoom (default 15)
     * @param  {object}   center         Lat & Lng of Map center as a JSON
     * @param  {int}      width          width of image in pixels (default 800px)
     * @param  {int}      height         height of image in pixels (default 600px)
     * @param  {int}      threadId       Thread Id
     * @param  {string}   caption        Image Caption
     * @param  {string}   metadata       Message MetaData
     */
    // chatAgent.sendLocationMessage({
    //     type: "standard-night",
    //     zoom: 15,
    //     center: {
    //         lat: 35.7003508,
    //         lng: 51.3376462
    //     },
    //     width: 800,
    //     height: 500,
    //     threadId: 293,
    //     caption: "This is the Address on map!",
    //     systemMetadata: {
    //         time: new Date()
    //     }
    // }, function(result) {
    //     console.log(result);
    // });

    /**
     * SEND BOT MESSAGE IN THREAD
     * @param messageId
     * @param receiverId
     * @param newMessage
     */
    // sendBotMessage(14954, 121, {
    //   command: "reverse",
    //   lat: "35.7003510",
    //   lng: "51.3376472"
    // });

    /**
     * EDIT MESSAGE IN THREAD
     * @param messageId  325 editable: false
     * @param newMessage
     */
    // editMessage(66439, "*****************************************" + new Date());

    /**
     * DELETE MESSAGE IN THREAD
     * @param {int}      messageId
     * @param {boolean}  deleteForAll
     */
    // deleteMessage(55221, false);

    // chatAgent.deleteMultipleMessages({
    //     // threadId: 15,
    //     messageIds: [56165, 56166, 56167],
    //     deleteForAll: true
    // }, function(result) {
    //     console.log("Delete Multiple Message Result", result);
    // });

    /**
     * REPLY TO MESSAGE
     * @param threadId
     * @param replyToMessageId
     * @param file
     * @param content
     */
    // replyMessage(1431, 32174, "This is a reply to message #31558 at " + new Date());

    /**
     * REPLY FILE MESSAGE
     * @param threadId
     * @param messageId
     */
    // replyFileMessage(1431, 19671, __dirname + "/test/test.jpg", "This is a reply to message #19671 at " + new Date());

    /**
     * FORWARD MESSAGE
     * @param destination
     * @param messageIds
     */
    // forwardMessage(1, [55902, 55901]);

    /**
     * GET MESSAGE SEEN LIST
     * @param messageId
     */
    // chatAgent.getMessageSeenList({
    //   messageId: 6972
    // }, function(seenList) {
    //   console.log("Seen list", seenList);
    // });

    /**
     * GET MESSAGE DELIVERED LIST
     * @param messageId
     */
    // chatAgent.getMessageDeliveredList({
    //   messageId: 19623
    // }, function(seenList) {
    //   console.log("Delivery list", seenList);
    // });

    /*******************************************************
     *                   C O N T A C T S                   *
     *******************************************************/

    /**
     * GET CONTACTS
     */
    // getContacts({
    //     count: 50,
    //     offset: 0,
    //     // query: "masodi"
    // });

    /**
     * BLOCK CONTACT
     * @param contactId
     */
    // chatAgent.block({
    //   contactId: 2704,
    //   // threadId: 293,
    //   // userId: 221
    // }, function(result) {
    //   console.log(result);
    //   if (!result.hasError)
    //     console.log("Contact has been successfully Blocked!");
    // });

    /**
     * GET BLOCKED CONTACTS LIST
     * @param count
     * @param offset
     */
    // getBlockedList();

    /**
     * UNBLOCK CONTACT
     * @param blockId
     */
    // chatAgent.unblock({
    //   // blockId: 425,
    //   // contactId: 2247,
    //   threadId: 293,
    //   // userId: 221
    // }, function(result) {
    //   if (!result.hasError)
    //     console.log("Contact has been successfully unBlocked!");
    //   console.log(result);
    // });

    /**
     * ADD CONTACTS
     * @param firstName
     * @param lastName
     * @param cellphoneNumber
     * @param email
     */
    // var addContactInstantResult = chatAgent.addContacts({
    //     firstName: "علیرضا",
    //     lastName: "غفاری",
    //     cellphoneNumber: "",
    //     email: "a.ghafari@gmail.com",
    //     typeCode: 'poddraw'
    // }, function (result) {
    //     console.log(result);
    //     console.log(result.contacts);
    // });
    /**
     * UPDATE CONTACTS
     * @param id
     * @param firstName
     * @param lastName
     * @param cellphoneNumber
     * @param email
     */
    // chatAgent.updateContacts({
    //   id: "2313",
    //     firstName: "Nigul",
    //     lastName: "Niguli",
    //     cellphoneNumber: "09044661263",
    //     email: "niguli@fanap.ir"
    // }, function(result) {
    //   console.log(result.result);
    // });

    /**
     * REMOVE CONTACTS
     * @param id
     */
    // chatAgent.removeContacts({
    //   id: "842"
    // }, function(result) {
    //   console.log(result);
    // });

    /**
     * SEARCH CONTACTS
     * @link http://sandbox.pod.ir:8080/apidocs/swagger-ui.html?srv=/nzh/listContacts
     */
    // chatAgent.searchContacts({
    //   // cellphoneNumber: "0912", // LIKE
    //   id: 563, // EXACT
    //   // firstName: "m", // LIKE
    //   // lastName: "ra", // LIKE
    //   // email: "ish", // LIKE
    //   // uniqueId: "2653b39d-85f0-45cf-e1a2-38fbd811872c", // EXACT
    //   // q: "m" // LIKE in firstName, lastName, email
    // }, function(result){
    //   if (!result.hasError) {
    //     console.log(result);
    //     console.log(result.result);
    //   }
    // });

    /*******************************************************
     *               F I L E   U P L O A D S               *
     *******************************************************/

    /**
     * UPLOAD IMAGE
     * @param  {string}  image     Image path
     * @param  {int}     xC        Crop start x coordinates
     * @param  {int}     yC        Crop start y coordinates
     * @param  {int}     hC        Crop height
     * @param  {int}     wC        Crop width
     */
    // uploadImage(__dirname + "/../test/test.jpg", 0, 0, 400, 400);

    /**
     * GET IMAGE
     * @param  {int}     imageId     Image ID
     * @param  {string}  hashCode    Hash Code
     */
    // getImage(67545, '16f0df1947c-0.1837058008746586');

    /**
     * UPLOAD FILE
     * @param  {string}  file     File path
     */
    // uploadFile(__dirname + "/test/test.txt");

    /**
     * GET FILE
     * @param  {int}     fileId          Image ID
     * @param  {string}  hashCode        Hash Code
     * @param  {boolean} downloadable    Downloadable link or not?
     */
    // getFile(344, '196CHI61NUROW8S1', true);

    /*******************************************************
     *                 N E S H A N   M A P                 *
     *******************************************************/

    /**
     * Get Address of a GeoLocation point
     *
     * @param  {float}   lat     Latitute of the Location
     * @param  {float}   lng     Longtitute of the Location
     */
    // chatAgent.mapReverse({
    //   lat: 35.7003508,
    //   lng: 51.3376460
    // }, function(result) {
    //   console.log(result);
    // });

    /**
     * Get nearby places names as "term" keyword
     * around the given GeoLocation
     *
     * @param  {float}   lat     Latitute of the Location
     * @param  {float}   lng     Longtitute of the Location
     * @param  {string}  term    Search term to be searched
     */
    // chatAgent.mapSearch({
    //   lat: 35.7003508,
    //   lng: 51.3376460,
    //   term: "فروشگاه"
    // }, function(result) {
    //   console.log(result);
    // });

    /**
     * Get routing between two given GeoLocations
     *
     * @param  {object}   origin         Lat & Lng of Origin as a JSON
     * @param  {object}   destination    Lat & Lng of Destination as a JSON
     * @param  {boolean}  alternative    Give Alternative Routs too
     */
    // chatAgent.mapRouting({
    //   origin: {
    //     lat: 35.7003508,
    //     lng: 51.3376460
    //   },
    //   destination: {
    //     lat: 35.7343510,
    //     lng: 50.3376472
    //   },
    //   alternative: true
    // }, function(result) {
    //   console.log(result);
    // });

    /**
     * Get Static Image of a GeoLocation
     *
     * @param  {string}   type           Map style (default standard-night)
     * @param  {int}      zoom           Map zoom (default 15)
     * @param  {object}   center         Lat & Lng of Map center as a JSON
     * @param  {int}      width          width of image in pixels (default 800px)
     * @param  {int}      height         height of image in pixels (default 600px)
     */
    // chatAgent.mapStaticImage({
    //   type: "standard-night",
    //   zoom: 15,
    //   center: {
    //     lat: 35.7003508,
    //     lng: 51.3376462
    //   },
    //   width: 800,
    //   height: 500
    // }, function(result) {
    //   console.log(result);
    // });
});

/**
 * Listen to Error Messages
 */
chatAgent.on('error', function (error) {
    console.log('Error ', error);
    console.log(error.lineNumber);
});

/**
 * Listen to Chat State Changes
 */
chatAgent.on('chatState', function (chatState) {
    // console.log(chatState);
});

/**
 * Listen to File Upload Events
 */
chatAgent.on('fileUploadEvents', function (event) {
    var type = event.type;
    console.log(event);
});

/**
 * Listen to Thread Events
 */
chatAgent.on('threadEvents', function (event) {
    var type = event.type;

    console.log(event);

    switch (type) {
        case 'THREAD_LAST_ACTIVITY_TIME':
            break;

        case 'THREAD_NEW':

            break;

        case 'THREAD_ADD_PARTICIPANTS':
            break;

        case 'THREAD_REMOVE_PARTICIPANTS':
            break;

        case 'THREAD_LEAVE_PARTICIPANT':
            break;

        case 'THREAD_REMOVED_FROM':
            break;

        case 'THREAD_RENAME':
            break;

        case 'THREAD_MUTE':
            break;

        case 'THREAD_UNMUTE':
            break;

        case 'THREAD_PIN':
            break;

        case 'THREAD_UNPIN':
            break;

        case 'THREAD_INFO_UPDATED':
            break;

        case 'THREAD_UNREAD_COUNT_UPDATED':
            break;

        default:
            break;
    }
});

/**
 * Listen to Message Events
 */
chatAgent.on('messageEvents', function (event) {
    var type = event.type,
        message = event.result.message;

    // console.log(event);

    switch (type) {
        case 'MESSAGE_NEW':
            /**
             * Sending Message Seen to Sender after 5 secs
             */
            setTimeout(function () {
                chatAgent.seen({
                    messageId: message.id,
                    ownerId: message.ownerId
                });
            }, 5000);

            break;

        case 'MESSAGE_EDIT':
            break;

        case 'MESSAGE_DELIVERY':
            break;

        case 'MESSAGE_SEEN':
            console.log("Some message seen has been  dfgdgd", event);
            break;

        default:
            break;
    }
});

/**
 * Listen to System Events
 */
chatAgent.on('systemEvents', function (event) {
    var type = event.type;
    console.log(event);

    switch (type) {
        case 'IS_TYPING':
            console.log(event.result.user.user + ' is typing in thread #' + event.result.thread);
            break;

        default:
            break;
    }
});

/**
 * Listen to Disconnection Error Events
 */
chatAgent.on('disconnect', function (event) {
    console.log('Socket Disconnected');
    console.log(event);
});

/**
 * Local Functions
 */

function getUserInfo() {
    chatAgent.getUserInfo(function (userInfo) {
        console.log(userInfo);
    });
}

function getThreads(params) {
    var instantResult = chatAgent.getThreads(params, function (threadsResult) {
        if (!threadsResult.hasError) {
            console.log(threadsResult);
            console.log(threadsResult.result.threads);
        }
    });
    // console.log(instantResult);
}

function getThreadParticipants(threadId) {
    var getParticipantsParams = {
        count: 50,
        offset: 0,
        threadId: threadId
        // name: "gmail"
    };

    chatAgent.getThreadParticipants(getParticipantsParams, function (participantsResult) {
        if (!participantsResult.hasError) {
            var participantsCount = participantsResult.result.contentCount;
            var participants = participantsResult.result.participants;
            console.log(participantsResult);
            console.log(participants);
        }
    });
}

function addParticipants(threadId, contacts) {
    chatAgent.addParticipants({
        threadId: threadId,
        contacts: contacts
    }, function (result) {
        console.log(result);
    });

}

function removeParticipants(threadId, participants) {
    chatAgent.removeParticipants({
        threadId: threadId,
        participants: participants
    }, function (result) {
        // console.log(result);
    });

}

function leaveThread(threadId) {
    chatAgent.leaveThread({
        threadId: threadId
    }, function (result) {
        console.log(result);
    });
}

function getContacts(params) {
    var getContactsParams = {
        count: params.count,
        offset: params.offset
    };

    if (params) {
        if (typeof params.query === 'string') {
            getContactsParams.query = params.query;
        }
    }
    chatAgent.getContacts(getContactsParams, function (contactsResult) {
        if (!contactsResult.hasError) {
            console.log(contactsResult);
            console.log(contactsResult.result);
        }
    });
}

function getSingleMessage(threadId, messageId) {
    chatAgent.getHistory({
        offset: 0,
        threadId: threadId,
        id: messageId
    }, function (historyResult) {
        if (!historyResult.hasError) {
            console.log(historyResult);
            console.log(historyResult.result.history);
        }
    });
}

function getHistory(params) {
    var test = chatAgent.getHistory(params, function (historyResult) {
        if (!historyResult.hasError) {
            console.log('Cache:\t', historyResult.cache, '\n');
            // console.log(historyResult.result.history);
            var mim = [];
            for (var i = 0; i < historyResult.result.history.length; i++) {
                mim.push({
                    id: historyResult.result.history[i].id,
                    time: historyResult.result.history[i].time
                });
            }
            console.log(mim);
        }
    });
    // console.log(test);
}

function sendMessage(threadId, message, metadata) {
    sendChatParams = {
        threadId: threadId,
        content: message,
        messageType: 0,
        systemMetadata: metadata
    };

    var sentMesageUniqueId = chatAgent.sendTextMessage(sendChatParams, {
        onSent: function (result) {
            console.log(result.uniqueId + ' \t has been Sent!');
        },
        onDeliver: function (result) {
            console.log(result.uniqueId + ' \t has been Delivered!');
        },
        onSeen: function (result) {
            console.log(result.uniqueId + ' \t has been Seen!');
        }
    });
}

function sendFileMessage(threadId, file, caption, metadata) {
    var instantResult = chatAgent.sendFileMessage({
        threadId: threadId,
        file: file,
        content: caption,
        systemMetadata: metadata
    }, {
        onSent: function (result) {
            console.log(result.uniqueId + ' \t has been Sent!');
        },
        onDeliver: function (result) {
            console.log(result.uniqueId + ' \t has been Delivered!');
        },
        onSeen: function (result) {
            console.log(result.uniqueId + ' \t has been Seen!');
        }
    });

    // console.log("Should cancel file upload after 100ms. (uid = " + instantResult.content.file.uniqueId + ")")
    // setTimeout(() => {
    //   chatAgent.cancelFileUpload({
    //     uniqueId: instantResult.content.file.uniqueId
    //   }, function() {
    //     console.log("Upload has been Canceled!");
    //   });
    // }, 100);

    console.log('\nInstant Result For sendFileMessage:\n', instantResult);
}

function sendBotMessage(messageId, receiverId, message, metadata) {
    sendChatParams = {
        messageId: messageId,
        content: message,
        receiver: receiverId,
        metadata: metadata
    };

    var mim = chatAgent.sendBotMessage(sendChatParams, {
        onSent: function (result) {
            console.log(result.uniqueId + ' \t has been Sent!');
        },
        onDeliver: function (result) {
            console.log(result.uniqueId + ' \t has been Delivered!');
        }
    });

    console.log(mim);
}

function editMessage(messageId, newMessage) {
    editChatParams = {
        messageId: messageId,
        content: newMessage
    };

    chatAgent.editMessage(editChatParams, function (result) {
        console.log(result);
    });
}

function deleteMessage(messageId, deleteForAll) {
    if (typeof deleteForAll == 'undefined') {
        deleteForAll = false;
    }

    chatAgent.deleteMessage({
        messageId: messageId,
        deleteForAll: deleteForAll
    }, function (result) {
        console.log(result);
    });
}

function replyMessage(threadId, messageId, message) {
    replyChatParams = {
        threadId: threadId,
        repliedTo: messageId,
        content: message
    };

    chatAgent.replyMessage(replyChatParams, {
        onSent: function (result) {
            console.log(result.uniqueId + ' \t has been Sent! (Reply)');
        },
        onDeliver: function (result) {
            console.log(result.uniqueId + ' \t has been Delivered! (Reply)');
        },
        onSeen: function (result) {
            console.log(result.uniqueId + ' \t has been Seen! (Reply)');
        }
    });
}

function replyFileMessage(threadId, messageId, file, message) {
    replyChatParams = {
        threadId: threadId,
        repliedTo: messageId,
        content: message,
        file: file
    };

    chatAgent.replyFileMessage(replyChatParams, {
        onSent: function (result) {
            console.log(result.uniqueId + ' \t has been Sent! (Reply)');
        },
        onDeliver: function (result) {
            console.log(result.uniqueId + ' \t has been Delivered! (Reply)');
        },
        onSeen: function (result) {
            console.log(result.uniqueId + ' \t has been Seen! (Reply)');
        }
    });
}

function forwardMessage(destination, messageIds) {
    chatAgent.forwardMessage({
        subjectId: destination,
        content: JSON.stringify(messageIds)
    }, {
        onSent: function (result) {
            console.log(result.uniqueId + ' \t has been Sent! (FORWARD)');
        },
        onDeliver: function (result) {
            console.log(result.uniqueId + ' \t has been Delivered! (FORWARD)');
        },
        onSeen: function (result) {
            console.log(result.uniqueId + ' \t has been Seen! (FORWARD)');
        }
    });
}

function createThread(invitees, threadType) {
    if (typeof threadType == 'string') {
        threadTypeText = threadType;
    }
    else {
        threadTypeText = 'NORMAL';
    }

    createThreadParams = {
        title: 'Thread Title Sample',
        type: threadTypeText,
        invitees: [],
        image: 'https://core.pod.ir/nzh/image?imageId=333415&hashCode=16e37b412fe-0.9111035145050199',
        description: 'This is some Description.',
        metadata: {
          time: new Date()
        },
        message: {
          uniqueId: "9766b140-24a9-49fb-a02e-6aff708645a6",
          text: "This is a new Mesage",
          metadata: {
            messageTime: new Date()
          },
          systemMetadata: {
            id: new Date().getTime()
          },
          // forwardedMessageIds: [19633, 19632, 19631]
        }
    };

    if (Array.isArray(invitees)) {
        for (var i = 0; i < invitees.length; i++) {
            invitee = formatDataToMakeInvitee({
                id: invitees[i].id,
                type: invitees[i].type
            });
            if (invitee) {
                createThreadParams.invitees.push(invitee);
            }
        }
    }
    else {
        invitee = formatDataToMakeInvitee({
            id: invitees.id,
            type: invitees.type
        });
        if (invitee) {
            createThreadParams.invitees.push(invitee);
        }
    }

    chatAgent.createThread(createThreadParams, function (createThreadResult) {
        console.log(createThreadResult);
    });
}

function createThreadWithFile(file, invitees, threadType) {
    if (typeof threadType == 'string') {
        threadTypeText = threadType;
    }
    else {
        threadTypeText = 'NORMAL';
    }

    createThreadParams = {
        threadId: 0,
        title: 'Thread Title Sample',
        type: threadTypeText,
        invitees: [],
        file: file,
        caption: 'Create thread with file message',
        image: 'https://core.pod.ir/nzh/image?imageId=333415&hashCode=16e37b412fe-0.9111035145050199',
        description: 'This is some Description.'
        // metadata: {
        //   time: new Date()
        // },
        // message: {
        //   uniqueId: "9766b140-24a9-49fb-a02e-6aff708645a6",
        //   text: "This is a new Mesage",
        //   metadata: {
        //     messageTime: new Date()
        //   },
        //   systemMetadata: {
        //     id: new Date().getTime()
        //   },
        //   // forwardedMessageIds: [19633, 19632, 19631]
        // }
    };

    if (Array.isArray(invitees)) {
        for (var i = 0; i < invitees.length; i++) {
            invitee = formatDataToMakeInvitee({
                id: invitees[i].id,
                type: invitees[i].type
            });
            if (invitee) {
                createThreadParams.invitees.push(invitee);
            }
        }
    }
    else {
        invitee = formatDataToMakeInvitee({
            id: invitees.id,
            type: invitees.type
        });
        if (invitee) {
            createThreadParams.invitees.push(invitee);
        }
    }

    chatAgent.crateThreadWithFile(createThreadParams, function (createThreadResult) {
        console.log(createThreadResult);
    });
}

function renameThread(threadId, newName) {
    renameThreadParams = {
        title: newName,
        threadId: threadId
    };

    chatAgent.renameThread(renameThreadParams, function (renameThreadResult) {
        console.log(renameThreadResult);
    });
}

function muteThread(threadId) {
    var data = {
        subjectId: threadId
    };
    chatAgent.muteThread(data, function (result) {
        if (!result.hasError) {
            console.log('Threaded has been successfully muted!');
        }
        console.log(result);
    });
}

function getBlockedList() {
    var data = {
        count: 50,
        offset: 0
    };
    chatAgent.getBlocked(data, function (result) {
        if (!result.hasError) {
            console.log(result.result.blockedUsers);
        }
    });
}

function unMuteThread(threadId) {
    var data = {
        subjectId: threadId
    };
    chatAgent.unMuteThread(data, function (result) {
        if (!result.hasError) {
            console.log('Threaded has been successfully unMuted!');
        }
        console.log(result);
    });
}

function formatDataToMakeInvitee(messageContent) {
    var inviteeData = {
        id: messageContent.id,
        idType: messageContent.type
    };

    return inviteeData;
}

function uploadImage(image, xC, yC, hC, wC) {
    chatAgent.uploadImage({
        image: image,
        xC: xC,
        yC: yC,
        hC: hC,
        wC: wC
    }, function (result) {
        console.log(result);
        if (!result.hasError) {
            var image = result.result;
            console.log('Image has been Successfully Uploaded => \n\n', image);
        }
    });
}

function getImage(imageId, hashCode) {
    chatAgent.getImage({
        imageId: imageId,
        hashCode: hashCode
    }, function (result) {
        if (!result.hasError) {
            console.log('Image has been successfully received => \n', result.result);
        }
    });
}

function uploadFile(file) {
    chatAgent.uploadFile({
        file: file
    }, function (result) {
        console.log(result);
        if (!result.hasError) {
            var file = result.result;
            console.log('File has been Successfully Uploaded => \n', file);
        }
    });
}

function getFile(fileId, hashCode, downloadable) {
    chatAgent.getFile({
        fileId: fileId,
        hashCode: hashCode,
        downloadable: downloadable
    }, function (result) {
        if (!result.hasError) {
            console.log('File has been successfully received => \n', result.result);
        }
    });
}

function pinThread(threadId) {
    var data = {
        subjectId: threadId
    };
    chatAgent.pinThread(data, function (result) {
        if (!result.hasError) {
            console.log('Thread has been successfully pinned to top!');
        }
        console.log(result);
    });
}

function unPinThread(threadId) {
    var data = {
        subjectId: threadId
    };
    chatAgent.unPinThread(data, function (result) {
        if (!result.hasError) {
            console.log('Thread has been successfully unpinned from top!');
        }
        console.log(result);
    });
}
