//!*script
//@ts-check
/*
 * View file contents on the PPv
 *
 * @arg {number} 0 - Maximum number of bytes allowed to get
 */

'use strict';

/* Import modules */
const st = PPx.CreateObject('ADODB.stream');
//@ts-ignore
let module = function (filepath) {
  st.Open;
  st.Type = 2;
  st.Charset = 'UTF-8';
  st.LoadFromFile(filepath);
  const data = st.ReadText(-1);
  st.Close;

  return Function(' return ' + data)();
};
const rc = module(PPx.Extract('%*getcust(S_ppm#plugins:ppm-rclone)\\script\\module\\rc.js'));
//@ts-ignore
module = null;

/** @param {string} msg - Warning message */
const quitMsg = (msg) => {
  PPx.setPopLineMessage(`!"${msg}`);
  PPx.Quit(1);
};

/* main */
const root = PPx.Extract('%si"RootPath"');

if (root === '') {
  quitMsg(rc.mes.noroot);
}

const fileSize = PPx.Entry.Size;
const limitSize = PPx.Arguments.length ? PPx.Arguments.Item(0) | 0 : 1048576;

if (fileSize > limitSize) {
  quitMsg(rc.mes.limit);
}

const drive = root.substring(root.lastIndexOf('/') + 1);
const filePath = PPx.Extract('%FDC').substring(root.length + 1);
const passcmd = PPx.getProcessValue(rc.name.passcmd);

PPx.Execute(
  `%Onq *ppb -c %(
	*job start
	rclone ${passcmd} cat ${drive}${filePath} | %0ppvw
	*job end%)`
);
