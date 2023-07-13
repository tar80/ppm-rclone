//!*script
/*
 * Change file modification time
 */

'use strict';

/* Import modules */
const st = PPx.CreateObject('ADODB.stream');
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
module = null;

/* main */
const AUX_PATH = 'aux://S_auxRCLONE/';
const title = PPx.Arguments.length ? PPx.Arguments.Item(0) : 'Change modification time';
const drivePath = PPx.Extract('%FDC').substring(AUX_PATH.length);
const modDate = new Date(PPx.Entry.DateLastModified).toLocaleString();
const nowDate = PPx.Extract('%*now').replace(' ', 'T');
const updateTime = PPx.Extract(`%*input("${nowDate}" -title:"${title}  [ ${modDate} ]")`);
const passcmd = PPx.getProcessValue(rc.name.passcmd);

PPx.Execute(`%Onb *ppb -c %(rclone ${passcmd} touch ${drivePath} --localtime -Ct ${updateTime} %& %KC"@F5"%)`);
