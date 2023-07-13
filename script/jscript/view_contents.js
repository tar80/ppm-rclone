//!*script
//@ts-check
/*
 * View file contents on the PPv
 *
 * @arg {number} 0 - Maximum number of bytes allowed to get
 */

/* Import modules */
var st = PPx.CreateObject('ADODB.stream');
//@ts-ignore
var module = function (filepath) {
  st.Open;
  st.Type = 2;
  st.Charset = 'UTF-8';
  st.LoadFromFile(filepath);
  var data = st.ReadText(-1);
  st.Close;

  return Function(' return ' + data)();
};
var rc = module(PPx.Extract('%*getcust(S_ppm#plugins:ppm-rclone)\\script\\module\\rc.js'));
//@ts-ignore
module = null;

/** @param {string} msg - Warning message */
var quitMsg = function (msg) {
  PPx.setPopLineMessage('!"' + msg);
  PPx.Quit(1);
};

/* main */
var root = PPx.Extract('%si"RootPath"');

if (root === '') {
  quitMsg(rc.mes.noroot);
}

var fileSize = PPx.Entry.Size;
var limitSize = PPx.Arguments.length ? PPx.Arguments.Item(0) | 0 : 1048576;

if (fileSize > limitSize) {
  quitMsg(rc.mes.limit);
}

var drive = root.substring(root.lastIndexOf('/') + 1);
var filePath = PPx.Extract('%FDC').substring(root.length + 1);
var passcmd = PPx.getProcessValue(rc.name.passcmd);

PPx.Execute(
  '%Onq *ppb -c %(*job start%:' +
    ['rclone', passcmd, 'cat', drive + filePath, '|', '%0ppvw'].join(' ') +
    '%:*job end%)'
);
