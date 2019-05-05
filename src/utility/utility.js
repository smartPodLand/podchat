(function() {

    /**
     * Global Variables
     */
    var CryptoJS;

    function ChatUtility() {

        if (typeof(require) !== 'undefined' && typeof(exports) !== 'undefined') {
            CryptoJS = require('crypto-js');
        }
        else {
            CryptoJS = window.CryptoJS;
        }

        /**
         * Checks if Client is using NodeJS or not
         * @return  {boolean}
         */
        this.isNode = function() {
            return (typeof global !== 'undefined' && ({}).toString.call(global) === '[object global]');
        };

        /**
         * Generate UUID
         *
         * Generates Random String
         *
         * @access public
         *
         * @param {int}     sectionCount    Sections of created unique code
         *
         * @return {string}
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
                    c == 'x' ? r : (r & 0x7 | 0x8)).toString(16);
            });
            return uuid;
        };

        /**
         * Create Return data
         *
         * Returns data in ordered structure
         *
         * @param {boolean}     hasError
         * @param {string}      errorMessage
         * @param {string}      errorCode
         * @param {object}      result
         * @param {int}         contentCount
         *
         * @return  {object}
         */
        this.createReturnData = function(hasError, errorMessage, errorCode, result, contentCount) {
            var returnData = {
                hasError: hasError,
                errorMessage: typeof errorMessage == 'string'
                    ? errorMessage
                    : '',
                errorCode: typeof errorCode == 'number' ? errorCode : 0,
                result: result
            };

            if (typeof contentCount == 'number') {
                returnData.contentCount = contentCount;
            }

            return returnData;
        };

        /**
         * Chat Step Logger
         *
         * Prints Custom Message in console
         *
         * @param {string}    title      Title of message to be logged in
         *     terminal
         * @param {string}    message    Message to be logged in terminal
         *
         * @return {undefined}
         */
        this.chatStepLogger = function(title, message) {
            if (typeof navigator == 'undefined') {
                console.log('\x1b[90m    ☰ %s \x1b[0m \x1b[90m(%sms)\x1b[0m',
                    title, message);
            }
            else {
                console.log('%c   ' + title + ' (' + message + 'ms)',
                    'border-left: solid #666 10px; color: #666;');
            }
        };

        /**
         * MD5 (Message-Digest Algorithm)
         *
         * @param {string}  string    String to be digested
         *
         * @link  http://www.webtoolkit.info
         *
         * @return {string}  Digested hash string
         */
        this.MD5 = function(string) {
            function RotateLeft(lValue, iShiftBits) {
                return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
            }

            function AddUnsigned(lX, lY) {
                var lX4, lY4, lX8, lY8, lResult;
                lX8 = (lX & 0x80000000);
                lY8 = (lY & 0x80000000);
                lX4 = (lX & 0x40000000);
                lY4 = (lY & 0x40000000);
                lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
                if (lX4 & lY4) {
                    return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
                }
                if (lX4 | lY4) {
                    if (lResult & 0x40000000) {
                        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                    }
                    else {
                        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
                    }
                }
                else {
                    return (lResult ^ lX8 ^ lY8);
                }
            }

            function F(x, y, z) {
                return (x & y) | ((~x) & z);
            }

            function G(x, y, z) {
                return (x & z) | (y & (~z));
            }

            function H(x, y, z) {
                return (x ^ y ^ z);
            }

            function I(x, y, z) {
                return (y ^ (x | (~z)));
            }

            function FF(a, b, c, d, x, s, ac) {
                a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
                return AddUnsigned(RotateLeft(a, s), b);
            };

            function GG(a, b, c, d, x, s, ac) {
                a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
                return AddUnsigned(RotateLeft(a, s), b);
            };

            function HH(a, b, c, d, x, s, ac) {
                a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
                return AddUnsigned(RotateLeft(a, s), b);
            };

            function II(a, b, c, d, x, s, ac) {
                a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
                return AddUnsigned(RotateLeft(a, s), b);
            };

            function ConvertToWordArray(string) {
                var lWordCount;
                var lMessageLength = string.length;
                var lNumberOfWords_temp1 = lMessageLength + 8;
                var lNumberOfWords_temp2 = (lNumberOfWords_temp1 -
                    (lNumberOfWords_temp1 % 64)) / 64;
                var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
                var lWordArray = Array(lNumberOfWords - 1);
                var lBytePosition = 0;
                var lByteCount = 0;
                while (lByteCount < lMessageLength) {
                    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                    lBytePosition = (lByteCount % 4) * 8;
                    lWordArray[lWordCount] = (lWordArray[lWordCount] |
                    (string.charCodeAt(lByteCount) << lBytePosition));
                    lByteCount++;
                }
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = lWordArray[lWordCount] |
                    (0x80 << lBytePosition);
                lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
                lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
                return lWordArray;
            };

            function WordToHex(lValue) {
                var WordToHexValue = '',
                    WordToHexValue_temp = '',
                    lByte, lCount;

                for (lCount = 0; lCount <= 3; lCount++) {
                    lByte = (lValue >>> (lCount * 8)) & 255;
                    WordToHexValue_temp = '0' + lByte.toString(16);
                    WordToHexValue = WordToHexValue +
                        WordToHexValue_temp.substr(
                            WordToHexValue_temp.length - 2, 2);
                }

                return WordToHexValue;
            };

            function Utf8Encode(string) {
                string = string.replace(/\r\n/g, '\n');
                var utftext = '';
                for (var n = 0; n < string.length; n++) {
                    var c = string.charCodeAt(n);
                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    }
                    else if ((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                    else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                }

                return utftext;
            };

            var x = Array();
            var k, AA, BB, CC, DD, a, b, c, d;
            var S11 = 7,
                S12 = 12,
                S13 = 17,
                S14 = 22;

            var S21 = 5,
                S22 = 9,
                S23 = 14,
                S24 = 20;

            var S31 = 4,
                S32 = 11,
                S33 = 16,
                S34 = 23;

            var S41 = 6,
                S42 = 10,
                S43 = 15,
                S44 = 21;

            string = Utf8Encode(string);
            x = ConvertToWordArray(string);
            a = 0x67452301;
            b = 0xEFCDAB89;
            c = 0x98BADCFE;
            d = 0x10325476;

            for (k = 0; k < x.length; k += 16) {
                AA = a;
                BB = b;
                CC = c;
                DD = d;

                a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
                d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
                c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
                b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
                a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
                d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
                c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
                b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
                a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
                d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
                c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
                b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
                a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
                d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
                c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
                b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
                a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
                d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
                c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
                b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
                a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
                d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
                c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
                b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
                a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
                d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
                c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
                b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
                a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
                d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
                c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
                b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
                a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
                d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
                c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
                b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
                a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
                d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
                c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
                b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
                a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
                d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
                c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
                b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
                a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
                d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
                c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
                b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
                a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
                d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
                c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
                b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
                a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
                d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
                c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
                b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
                a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
                d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
                c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
                b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
                a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
                d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
                c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
                b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
                a = AddUnsigned(a, AA);
                b = AddUnsigned(b, BB);
                c = AddUnsigned(c, CC);
                d = AddUnsigned(d, DD);
            }

            var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) +
                WordToHex(d);

            return temp.toLowerCase();
        };

        /**
         * RC4 (Encryption/Decryption Algorithm)
         *
         * @param {string}  key     key fo encryption/decryption
         * @param {string}  str     String to be encrypted/decrypted
         *
         * @return {string}  Encrypted String
         */
        this.RC4 = function(key, str) {
            var s = [],
                j = 0,
                x, res = '';
            for (var i = 0; i < 256; i++) {
                s[i] = i;
            }
            for (i = 0; i < 256; i++) {
                j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
                x = s[i];
                s[i] = s[j];
                s[j] = x;
            }
            i = 0;
            j = 0;
            for (var y = 0; y < str.length; y++) {
                i = (i + 1) % 256;
                j = (j + s[i]) % 256;
                x = s[i];
                s[i] = s[j];
                s[j] = x;
                res += String.fromCharCode(
                    str.charCodeAt(y) ^ s[(s[i] + s[j]) % 256]);
            }
            return res;
        };

        /**
         * Dynamic Sort
         *
         * Dynamically sorts given Array in given order
         *
         * @param {object}    property    Given array to be sorted
         * @param {boolean}   reverse     Default order is ASC, if reverse is
         *     true, Array will be sorted in DESC
         *
         * @return {object}   Sorted Array
         */
        this.dynamicSort = function(property, reverse) {
            var sortOrder = 1;
            if (reverse) {
                sortOrder = -1;
            }
            return function(a, b) {
                var result = (a[property] < b[property]) ? -1 : (a[property] >
                b[property]) ? 1 : 0;
                return result * sortOrder;
            };
        };

        /**
         * Crypt
         *
         * This function uses AES Algorithm to encrypt given string with
         * encryption key and in order to avoid generating same hash
         * for same given strings, it uses a random salt everytime
         *
         * @param {string}  str        Given string to be encrypted
         * @param {string}  key        Secret Encryption Key
         * @param {string}  salt       Encryption salt
         *
         * @return {string} Encrypted string
         */
        this.crypt = function(str, key, salt) {
            if (typeof str !== 'string') {
                str = JSON.stringify(str);
            }

            if (str == undefined || str == 'undefined') {
                str = '';
            }

            return CryptoJS.AES.encrypt(str, key + salt)
                .toString();
        };

        /**
         * Decrypt
         *
         * This function uses AES Algorithm to decrypt given string with
         * encryption key
         *
         * @param {string}  str        Given string to be decrypted
         * @param {string}  key        Secret Encryption Key
         * @param {string}  salt       Encryption salt
         *
         * @return {string} Decrypted string
         */
        this.decrypt = function(str, key, salt) {
            var bytes = CryptoJS.AES.decrypt(str, key + salt);

            try {
                bytes = bytes.toString(CryptoJS.enc.Utf8);

                return {
                    hasError: false,
                    result: bytes
                };
            }
            catch (error) {
                return {
                    hasError: true,
                    result: error
                };
            }
        };

        /**
         * Json Stringify
         *
         * This function takes a Json object including functions
         * and etc. and returns a string containing all of that
         *
         * @param {object}  json   Given JSON to be strigified
         *
         * @return {string} Stringified object
         */
        this.jsonStringify = function(json) {
            return JSON.stringify(json, function(k, v) {
                if (typeof v === 'function') {
                    return '' + v;
                }
                else {
                    return v;
                }
            });
        };

        /**
         * Json Parser
         *
         * This function takes a stringified json object including functions
         * and etc. and returns equaled object containing all of main jsons
         * attributes
         *
         * @param {string}  json   Given Json String to be parsed
         *
         * @return {object} Parsed JSON object
         */
        this.jsonParser = function(string) {
            try {
                return JSON.parse(string, function(k, v) {
                    if (typeof v === 'string') {
                        return (v.startsWith('function') ? eval('(' + v + ')') : v);
                    }
                    else {
                        return v;
                    }
                });
            } catch(e) {
                console.log("Error happened at Utility.jsonParser function()", e);
            }
        };
    }

    if (typeof module !== 'undefined' && typeof module.exports != 'undefined') {
        module.exports = ChatUtility;
    }
    else {
        if (!window.POD) {
            window.POD = {};
        }
        window.POD.ChatUtility = ChatUtility;
    }
})();
