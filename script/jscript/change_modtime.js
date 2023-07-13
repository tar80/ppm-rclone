//!*script
/*
 * Change file modification time
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

var AUX_PATH = 'aux://S_auxRCLONE/';
var title = PPx.Arguments.length ? PPx.Arguments.Item(0) : 'Change modification time';
var drivePath = PPx.Extract('%FDC').substring(AUX_PATH.length);
var modDate = new Date(PPx.Entry.DateLastModified).toLocaleString();
var nowDate = PPx.Extract('%*now').replace(' ', 'T');
var updateTime = PPx.Extract(
  '%*input("' + nowDate + '" -title:"' + title + ' [ ' + modDate + ' ]")'
);
var passcmd = PPx.getProcessValue(rc.name.passcmd);

PPx.Execute(
  '%Onb *ppb -c %(rclone ' + passcmd + ' touch ' + drivePath + ' --no-create --localtime -Ct ' + updateTime + ' %& %KC"@F5"%)'
);
