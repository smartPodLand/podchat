var assert = require('assert'),
  Chat = require('../src/chat.js');

var TOKENS = {
    TOKEN_1: "7cba09ff83554fc98726430c30afcfc6", // Zizi
    TOKEN_2: "f53f39a1893e4c4da18e59822290a552", // Jiji
    TOKEN_3: "1fcecc269a8949d6b58312cab66a4926" // Fifi
  },
  params1 = {
    socketAddress: "ws://172.16.106.26:8003/ws",
    ssoHost: "http://172.16.110.76",
    ssoGrantDevicesAddress: "/oauth2/grants/devices",
    serverName: "chat-server",
    token: TOKENS.TOKEN_1,
    asyncLogging: {
      onFunction: true,
      onMessageReceive: true,
      onMessageSend: true
    }
  },
  params2 = Object.assign({}, params1),
  params3 = Object.assign({}, params1);

params2.token = TOKENS.TOKEN_2;
params3.token = TOKENS.TOKEN_3;

/**
 * CONNECTING AND GETTING READY
 */
describe("Connecting and getting ready", function() {
  var chatAgent = new Chat(params1);

  beforeEach(() => {});

  afterEach(() => {});

  it("Should connect to server and get ready", function() {
    chatAgent.on("chatReady", function() {
      done();
    });
  });

  it("Should get User Info", function() {});
});
