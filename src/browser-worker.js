(function() {
  /**
   * Import DexieDb files into worker environment
   */
  self.importScripts('../node_modules/dexie/dist/dexie.js');

  /**
   * Define db and declare database schema
   */
  db = new Dexie('podChat');
  db.version(1).stores({
    users: "&id, name, cellphoneNumber",
    contacts: "[owner+id], id, owner, uniqueId, userId, cellphoneNumber, email, firstName, lastName",
    threads: "[owner+id] ,id, owner, title, time, [owner+time]",
    participants: "[owner+id], id, owner, threadId, notSeenDuration, name, contactName, email",
    messages: "[owner+id], id, owner, threadId, time, [threadId+id], [threadId+owner+time]"
  });

  /**
   * Listen to messages received inside worker
   */
  self.addEventListener("message", function(event) {
    var data = JSON.parse(event.data);
    postMessage(data);

    switch (data.type) {
      /**
       * Whenever user calls getThreads function
       * after getting threads, we should check for
       * recently deleted messages from thread's
       * last section with offset 0
       */
      case "getThreads":
        var content = JSON.parse(data.data),
          userId = parseInt(data.userId);

        for (var i = 0; i < content.length; i++) {
          var lastMessageTime = (content[i].lastMessageVO) ? content[i].lastMessageVO.time : 0,
            threadId = parseInt(content[i].id);

          db.messages
            .where("[threadId+owner+time]")
            .between([threadId, userId, lastMessageTime], [threadId, userId, Number.MAX_SAFE_INTEGER * 1000], false, true)
            .delete();
        }
        break;
    }
  }, false);
})();
