var assert = require('assert'),
  faker = require('faker'),
  Chat = require('../src/chat.js'),
  fs = require('fs'),
  FormData = require('form-data'),
  path = require('path');

var TOKENS = {
    TOKEN_1: "7cba09ff83554fc98726430c30afcfc6", // Zizi
    TOKEN_2: "f53f39a1893e4c4da18e59822290a552" // Jiji
  },
  params1 = {
    socketAddress: "ws://172.16.106.26:8003/ws",
    ssoHost: "http://172.16.110.76",
    ssoGrantDevicesAddress: "/oauth2/grants/devices",
    serverName: "chat-server",
    token: TOKENS.TOKEN_1,
    asyncLogging: {
      // onFunction: true,
      // onMessageReceive: true,
      // onMessageSend: true
    }
  },
  params2 = Object.assign({}, params1);

params2.token = TOKENS.TOKEN_2;

/**
 * CONNECTING AND GETTING READY
 */
describe("Connecting and getting ready", function(done) {
  var chatAgent;

  beforeEach(() => {
    chatAgent = new Chat(params1);
  });

  afterEach(() => {
    chatAgent.logout();
  });

  it("Should connect to server and get ready", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.logout();
      done();
    });
  });
});

/**
 * GETTING CURRENT USER'S INFO
 */
describe("Get current user's info", function(done) {
  var chatAgent;

  beforeEach(() => {
    chatAgent = new Chat(params1);
  });

  afterEach(() => {
    chatAgent.logout();
  });

  it("Should get User Info", function(done) {
    chatAgent.on("chatReady", function() {
      var currentUser = chatAgent.getCurrentUser();
      if (currentUser && typeof currentUser.id === "number") {
        done();
      }
    });
  });
});

/**
 * CONTACTS FUNCTIONALITY
 */
describe("Working with contacts", function(done) {
  this.timeout(10000);

  var chatAgent,
    newContactId;

  beforeEach(() => {
    chatAgent = new Chat(params1);
  });

  afterEach(() => {
    chatAgent.logout();
  });

  it("Should GET contacts list", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getContacts({
        count: 50,
        offset: 0
      }, function(contactsResult) {
        if (!contactsResult.hasError) {
          done();
        }
      });
    });
  });

  it("Should ADD a new contact", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.addContacts({
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        cellphoneNumber: "09" + Math.floor((Math.random() * 100000000) + 1),
        email: faker.internet.email()
      }, function(result) {
        if (!result.hasError) {
          newContactId = result.result.contacts[0].id;
          done();
        }
      });
    });
  });

  it("Should UPDATE an existing contact", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.updateContacts({
        id: newContactId,
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        cellphoneNumber: "09" + Math.floor((Math.random() * 100000000) + 1),
        email: faker.internet.email()
      }, function(result) {
        if (!result.hasError) {
          done();
        }
      });
    });
  });

  it("Should REMOVE an existing contact", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.removeContacts({
        id: newContactId
      }, function(result) {
        if (!result.hasError && result.result) {
          done();
        }
      });
    });
  });

});

/**
 * THREADS FUNCTIONALITY
 */
describe("Working with threads", function(done) {
  this.timeout(15000);

  var chatAgent,
    p2pThreadId,
    groupThreadId,
    muteThreadId;

  beforeEach(() => {
    chatAgent = new Chat(params1);
  });

  afterEach(() => {
    chatAgent.logout();
  });

  it("Should GET Threads list", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getThreads({
        count: 50,
        offset: 0
      }, function(threadsResult) {
        if (!threadsResult.hasError) {
          done();
        }
      });
    });
  });

  it("Should GET a single thread", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getThreads({
        threadIds: [293]
      }, function(threadsResult) {
        if (!threadsResult.hasError) {
          done();
        }
      });
    });
  });

  it("Should SEARCH in Thread names and return result", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getThreads({
        count: 50,
        name: 'thread'
      }, function(threadsResult) {
        if (!threadsResult.hasError) {
          done();
        }
      });
    });
  });

  it("Should CREATE a P2P thread with a contact (TYPE = NORMAL)", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getContacts({
        count: 50,
        offset: 0
      }, function(contactsResult) {
        if (!contactsResult.hasError) {
          for (var i = 0; i < contactsResult.result.contacts.length; i++) {
            if (contactsResult.result.contacts[i].hasUser) {
              var p2pContactId = contactsResult.result.contacts[i].id;

              chatAgent.createThread({
                type: "NORMAL",
                invitees: [
                  {
                    id: p2pContactId,
                    idType: "TO_BE_USER_CONTACT_ID"
                  }
                ]
              }, function(createThreadResult) {
                if (!createThreadResult.hasError && createThreadResult.result.thread.id > 0) {
                  p2pThreadId = createThreadResult.result.thread.id;
                  done();
                }
              });
              break;
            }
          }
        }
      });
    });
  });

  it("Should CREATE a Group thread with a contact (TYPE = NORMAL)", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getContacts({
        count: 50,
        offset: 0
      }, function(contactsResult) {
        if (!contactsResult.hasError) {
          var groupInvitees = [];

          for (var i = 0; i < contactsResult.result.contacts.length; i++) {
            if (contactsResult.result.contacts[i].hasUser) {
              groupInvitees.push({id: contactsResult.result.contacts[i].id, idType: "TO_BE_USER_CONTACT_ID"});

              if (groupInvitees.length > 2) {
                break;
              }
            }
          }

          chatAgent.createThread({
            title: faker.lorem.word(),
            type: "NORMAL",
            invitees: groupInvitees
          }, function(createThreadResult) {
            if (!createThreadResult.hasError && createThreadResult.result.thread.id > 0) {
              groupThreadId = createThreadResult.result.thread.id;
              done();
            }
          });
        }
      });
    });
  });

  it("Should GET Thread participants", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getThreadParticipants({
        count: 50,
        offset: 0,
        threadId: groupThreadId
      }, function(participantsResult) {
        if (!participantsResult.hasError) {
          done();
        }
      });
    });
  });

  it("Should ADD A PARTICIPANT to newly created group Thread", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getContacts({
        count: 50,
        offset: 0
      }, function(contactsResult) {
        if (!contactsResult.hasError) {
          var groupInvitees = [];

          for (var i = 0; i < contactsResult.result.contacts.length; i++) {
            if (contactsResult.result.contacts[i].hasUser) {
              groupInvitees.push({id: contactsResult.result.contacts[i].id, idType: "TO_BE_USER_CONTACT_ID"});

              if (groupInvitees.length > 2) {
                break;
              }
            }
          }

          var lastInvitee = groupInvitees.pop();

          chatAgent.createThread({
            title: faker.lorem.word(),
            type: "NORMAL",
            invitees: groupInvitees
          }, function(createThreadResult) {
            if (!createThreadResult.hasError && createThreadResult.result.thread.id > 0) {
              var newGroupThreadId = createThreadResult.result.thread.id;

              chatAgent.addParticipants({
                threadId: newGroupThreadId,
                contacts: [lastInvitee.id]
              }, function(result) {
                if (!result.hasError) {
                  done();
                }
              });
            }
          });
        }
      });
    });
  });

  it("Should REMOVE A PARTICIPANT from newly created group Thread", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getContacts({
        count: 50,
        offset: 0
      }, function(contactsResult) {
        if (!contactsResult.hasError) {
          var groupInvitees = [];

          for (var i = 0; i < contactsResult.result.contacts.length; i++) {
            if (contactsResult.result.contacts[i].hasUser) {
              groupInvitees.push({id: contactsResult.result.contacts[i].id, idType: "TO_BE_USER_CONTACT_ID"});

              if (groupInvitees.length > 2) {
                break;
              }
            }
          }

          chatAgent.createThread({
            title: faker.lorem.word(),
            type: "NORMAL",
            invitees: groupInvitees
          }, function(createThreadResult) {
            if (!createThreadResult.hasError && createThreadResult.result.thread.id > 0) {
              var newGroupThreadId = createThreadResult.result.thread.id;

              chatAgent.getThreadParticipants({
                count: 50,
                offset: 0,
                threadId: newGroupThreadId
              }, function(participantsResult) {
                if (!participantsResult.hasError) {
                  var userId = participantsResult.result.participants[0];
                  chatAgent.removeParticipants({
                    threadId: newGroupThreadId,
                    participants: [userId.id]
                  }, function(result) {
                    if (!result.hasError) {
                      done();
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  });

  it("Should LEAVE a newly created group Thread", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getContacts({
        count: 50,
        offset: 0
      }, function(contactsResult) {
        if (!contactsResult.hasError) {
          var groupInvitees = [];

          for (var i = 0; i < contactsResult.result.contacts.length; i++) {
            if (contactsResult.result.contacts[i].hasUser) {
              groupInvitees.push({id: contactsResult.result.contacts[i].id, idType: "TO_BE_USER_CONTACT_ID"});

              if (groupInvitees.length > 2) {
                break;
              }
            }
          }

          chatAgent.createThread({
            title: faker.lorem.word(),
            type: "NORMAL",
            invitees: groupInvitees
          }, function(createThreadResult) {
            if (!createThreadResult.hasError && createThreadResult.result.thread.id > 0) {
              var newGroupThreadId = createThreadResult.result.thread.id;
              chatAgent.leaveThread({
                threadId: newGroupThreadId
              }, function(result) {
                if (!result.hasError) {
                  done();
                }
              });
            }
          });
        }
      });
    });
  });

  it("Should GET HISTORY of lastest active thread", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getThreads({
        count: 1,
        offset: 0
      }, function(threadsResult) {
        if (!threadsResult.hasError) {
          var threadId = threadsResult.result.threads[0].id;

          chatAgent.getHistory({
            threadId: threadId
          }, function(historyResult) {
            if (!historyResult.hasError) {
              done();
            }
          });
        }
      });
    });
  });

  it("Should MUTE a thread", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getContacts({
        count: 50,
        offset: 0
      }, function(contactsResult) {
        if (!contactsResult.hasError) {
          var groupInvitees = [];

          for (var i = 0; i < contactsResult.result.contacts.length; i++) {
            if (contactsResult.result.contacts[i].hasUser) {
              groupInvitees.push({id: contactsResult.result.contacts[i].id, idType: "TO_BE_USER_CONTACT_ID"});

              if (groupInvitees.length > 2) {
                break;
              }
            }
          }

          chatAgent.createThread({
            title: faker.lorem.word(),
            type: "NORMAL",
            invitees: groupInvitees
          }, function(createThreadResult) {
            if (!createThreadResult.hasError && createThreadResult.result.thread.id > 0) {
              muteThreadId = createThreadResult.result.thread.id;
              chatAgent.muteThread({
                subjectId: muteThreadId
              }, function(result) {
                if (!result.hasError) {
                  done();
                }
              });
            }
          });
        }
      });
    });
  });

  it("Should UNMUTE a muted thread", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.unMuteThread({
        subjectId: muteThreadId
      }, function(result) {
        if (!result.hasError) {
          done();
        }
      });
    });
  });

  it("Should RENAME a newly created thread", function(done) {
    chatAgent.on("chatReady", function() {
      chatAgent.getContacts({
        count: 50,
        offset: 0
      }, function(contactsResult) {
        if (!contactsResult.hasError) {
          var groupInvitees = [];

          for (var i = 0; i < contactsResult.result.contacts.length; i++) {
            if (contactsResult.result.contacts[i].hasUser) {
              groupInvitees.push({id: contactsResult.result.contacts[i].id, idType: "TO_BE_USER_CONTACT_ID"});

              if (groupInvitees.length > 2) {
                break;
              }
            }
          }

          chatAgent.createThread({
            title: faker.lorem.word(),
            type: "NORMAL",
            invitees: groupInvitees
          }, function(createThreadResult) {
            if (!createThreadResult.hasError && createThreadResult.result.thread.id > 0) {
              var newGroupThreadId = createThreadResult.result.thread.id;

              chatAgent.renameThread({
                title: faker.lorem.sentence(),
                threadId: newGroupThreadId
              }, function(renameThreadResult) {
                done();
              });
            }
          });
        }
      });
    });
  });

});

/**
 * MESSAGING FUNCTIONS
 */
describe("Messaging Functionality", function(done) {
  this.timeout(10000);

  var chatAgent1,
    chatAgent2;

  beforeEach(() => {
    chatAgent1 = new Chat(params1);
    chatAgent2 = new Chat(params2);
  });

  afterEach(() => {
    chatAgent1.logout();
    chatAgent2.logout();
  });

  it("Should SEND a text message to a newly created P2P thread", function(done) {
    chatAgent1.on("chatReady", function() {
      chatAgent1.sendTextMessage({
        threadId: 293,
        content: faker.lorem.paragraph(),
        metaData: {
          custom_name: "John Doe"
        }
      }, {
        onSent: function(result) {
          done();
        },
        onDeliver: function(result) {
          console.log(result.uniqueId + " \t has been Delivered!");
        },
        onSeen: function(result) {
          console.log(result.uniqueId + " \t has been Seen!");
        }
      });
    });
  });

  it("Should SEND a FILE message to a newly created P2P thread", function(done) {
    chatAgent1.on("chatReady", function() {
      chatAgent1.sendTextMessage({
        threadId: 293,
        content: faker.lorem.paragraph(),
        file: __dirname + "/test.jpg",
        metaData: {
          custom_name: "John Doe"
        }
      }, {
        onSent: function(result) {
          done();
        },
        onDeliver: function(result) {
          console.log(result.uniqueId + " \t has been Delivered!");
        },
        onSeen: function(result) {
          console.log(result.uniqueId + " \t has been Seen!");
        }
      });
    });
  });

  it("Should RECEIVE a DELIVERY message for a newly message sent to a P2P thread", function(done) {
    chatAgent1.on("chatReady", function() {
      chatAgent1.sendTextMessage({
        threadId: 293,
        content: faker.lorem.paragraph()
      }, {
        onSent: function(result) {},
        onDeliver: function(result) {
          done();
        },
        onSeen: function(result) {}
      });
    });
  });

  it("Should RECEIVE a SEEN message for a newly message sent to a P2P thread", function(done) {
    chatAgent1.on("chatReady", function() {
      chatAgent1.sendTextMessage({
        threadId: 293,
        content: faker.lorem.paragraph()
      }, {
        onSent: function(result) {},
        onDeliver: function(result) {},
        onSeen: function(result) {
          done();
        }
      });
    });

    chatAgent2.on("chatReady", function() {
      chatAgent2.on("messageEvents", function(event) {
        var type = event.type,
          message = event.result.message;

        if (type == "MESSAGE_NEW") {
          chatAgent2.seen({messageId: message.id, ownerId: message.ownerId});
        }
      });
    });

  });

  it("Should sent a message to a P2P thread then EDIT the sent message afterwards", function(done) {
    var sentMessageID;

    chatAgent1.on("chatReady", function() {
      chatAgent1.sendTextMessage({
        threadId: 293,
        content: faker.lorem.paragraph()
      }, {
        onSent: function(result) {},
        onDeliver: function(result) {
          chatAgent1.editMessage({
            messageId: sentMessageID,
            content: faker.lorem.paragraph()
          }, function(result) {
            if (!result.hasError) {
              done();
            }
          });
        },
        onSeen: function(result) {}
      });
    });

    chatAgent2.on("chatReady", function() {
      chatAgent2.on("messageEvents", function(event) {
        var type = event.type,
          message = event.result.message;

        if (type == "MESSAGE_NEW") {
          sentMessageID = message.id;
        }
      });
    });

  });

  it("Should receive a message from a P2P thread then REPLY to the message", function(done) {
    var sentMessageID,
      sentMessageUID;

    chatAgent1.on("chatReady", function() {
      chatAgent1.sendTextMessage({
        threadId: 293,
        content: faker.lorem.paragraph()
      }, {
        onSent: function(result) {},
        onDeliver: function(result) {},
        onSeen: function(result) {
          chatAgent2.replyMessage({
            threadId: 293,
            repliedTo: sentMessageID,
            content: faker.lorem.paragraph()
          }, {
            onSent: function(result) {},
            onDeliver: function(result) {
              done();
            },
            onSeen: function(result) {}
          });
        }
      });
    });

    chatAgent2.on("chatReady", function() {
      chatAgent2.on("messageEvents", function(event) {
        var type = event.type,
          message = event.result.message;

        if (type == "MESSAGE_NEW") {
          sentMessageID = message.id;
          chatAgent2.seen({messageId: message.id, ownerId: message.ownerId});
        }
      });
    });

  });

  it("Should send a messages to a P2P thread then FORWARD it into another thread", function(done) {
    var sentMessageID,
      sentMessageUID;

    chatAgent1.on("chatReady", function() {
      chatAgent1.sendTextMessage({
        threadId: 293,
        content: faker.lorem.paragraph()
      }, {
        onSent: function(result) {},
        onDeliver: function(result) {},
        onSeen: function(result) {
          chatAgent2.forwardMessage({
            subjectId: 312,
            content: JSON.stringify([sentMessageID])
          }, {
            onSent: function(result) {},
            onDeliver: function(result) {
              done();
            },
            onSeen: function(result) {}
          });
        }
      });
    });

    chatAgent2.on("chatReady", function() {
      chatAgent2.on("messageEvents", function(event) {
        var type = event.type,
          message = event.result.message;

        if (type == "MESSAGE_NEW") {
          sentMessageID = message.id;
          chatAgent2.seen({messageId: message.id, ownerId: message.ownerId});
        }
      });
    });

  });

});

/**
 * FILE FUNCTIONS
 */
describe("Uploading & Getting File Functionality", function(done) {
  this.timeout(10000);

  var chatAgent1,
    chatAgent2,
    imageId,
    imageHashCode,
    fileId,
    fileHashCode;

  beforeEach(() => {
    chatAgent1 = new Chat(params1);
    chatAgent2 = new Chat(params2);
  });

  afterEach(() => {
    chatAgent1.logout();
    chatAgent2.logout();
  });

  it("Should UPLOAD an image file to image server", function(done) {
    chatAgent1.on("chatReady", function() {
      chatAgent1.uploadImage({
        image: __dirname + "/test.jpg",
        xC: 0,
        yC: 0,
        hC: 400,
        wC: 400
      }, function(result) {
        if (!result.hasError) {
          imageId = result.result.id;
          imageHashCode = result.result.hashCode;
          done();
        }
      });
    });
  });

  it("Should UPLOAD an file to file server", function(done) {
    chatAgent1.on("chatReady", function() {
      chatAgent1.uploadFile({
        file: __dirname + "/test.txt"
      }, function(result) {
        if (!result.hasError) {
          fileId = result.result.id;
          fileHashCode = result.result.hashCode;
          done();
        }
      });
    });
  });

  it("Should GET an uploaded image from image server", function(done) {
    chatAgent1.on("chatReady", function() {
      chatAgent1.getImage({
        imageId: imageId,
        hashCode: imageHashCode
      }, function(result) {
        if (!result.hasError) {
          done();
        }
      });
    });
  });

  it("Should GET an uploaded file from file server", function(done) {
    chatAgent1.on("chatReady", function() {
      chatAgent1.getFile({
        fileId: fileId,
        hashCode: fileHashCode
      }, function(result) {
        if (!result.hasError) {
          done();
        }
      });
    });
  });

});
