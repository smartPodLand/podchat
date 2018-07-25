(function() {
  function ChatUtility() {
    /**
     * Checks if Client is using NodeJS or not
     * @return  {boolean}
     */
    this.isNode = function() {
      return (typeof module !== 'undefined' && typeof module.exports != "undefined");
    }

    /**
     * Generates Random String
     * @param   {int}     sectionCount
     * @return  {string}
     */
    this.generateUUID = function(sectionCount) {
      var d = new Date().getTime();
      var textData = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';

      if (sectionCount == 1) {
        textData = 'xxxxxxxx';
      }

      if (sectionCount == 2) {
        textData = 'xxxxxxxx-xxxx';
      }

      if (sectionCount == 3) {
        textData = 'xxxxxxxx-xxxx-4xxx';
      }

      if (sectionCount == 4) {
        textData = 'xxxxxxxx-xxxx-4xxx-yxxx';
      }

      var uuid = textData.replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);

        return (
          c == 'x'
          ? r
          : (r & 0x7 | 0x8)).toString(16);
      });
      return uuid;
    };

    /**
     * Returns data in ordered structure
     * @param   {boolean}     hasError
     * @param   {string}      errorMessage
     * @param   {string}      errorCode
     * @param   {object}      result
     * @param   {int}         contentCount
     * @return  {object}
     */
    this.createReturnData = function(hasError, errorMessage, errorCode, result, contentCount) {
      var returnData = {
        hasError: hasError,
        errorMessage: typeof errorMessage == "string"
          ? errorMessage
          : "",
        errorCode: typeof errorCode == "number"
          ? errorCode
          : 0,
        result: result
      };

      if (typeof contentCount == "number") {
        returnData.contentCount = contentCount;
      }

      return returnData;
    };

    /**
     * Prints Custom Message in console
     * @param {string} title Title of message to be logged in terminal
     * @param {string} message Message to be logged in terminal
     * @return
     */
    this.chatStepLogger = function(title, message) {
      if (typeof navigator == "undefined") {
        console.log("\x1b[90m    ☰ %s \x1b[0m \x1b[90m(%sms)\x1b[0m", title, message);
      } else {
        console.log("%c   " + title + " (" + message + "ms)", 'border-left: solid #666 10px; color: #666;');
      }
    }
  }

  if (typeof module !== 'undefined' && typeof module.exports != "undefined") {
    module.exports = ChatUtility;
  } else {
    if (!window.POD) {
      window.POD = {};
    }
    window.POD.ChatUtility = ChatUtility;
  }
})();
