//!*script
//@ts-check
/*
 * Aux Rclone
 *
 * @return {string} Path of cached ListFile
 * @arg {number} 0 - If non-zero, perform asynchronous the rclone
 * @arg {number} 1 - If non-zero, decrypt the configuration file
 * @arg {number} 2 - If non-zero, show spin while waiting
 *
 * NOTE: Async, the path is first passed to aux:, and then passed again after the cache is created.
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
var util = module(PPx.Extract('%*getcust(S_ppm#global:module)\\util.js'));
var rc = module(PPx.Extract('%*getcust(S_ppm#plugins:ppm-rclone)\\script\\module\\rc.js'));
//@ts-ignore
module = null;

/**
 * Initial
 *
 * @typedef {object} args
 * @prop {string} async
 * @prop {string} decrypt
 * @prop {string} spin
 *
 * @typedef {object} data
 * @prop {string} ppcid
 * @prop {string} path
 * @prop {string} lf
 * @prop {string} root
 */

/**
 * @param {any} args - PPx.Arguments
 * @return {args}
 */
var adjustArg = function (args) {
  var arr = ['0', '0', '0'];

  for (var i = 0, l = args.length; i < l; i++) {
    arr[i] = args(i);
  }

  /*
   * NOTE: In the JScript5.7, updating the listfile after loading the cache automatically updates the aux:path,
   *  so it is forced to run in synchronous mode.
   */
  return {async: '0', decrypt: arr[1], spin: '0'};
  // return {async: arr[0], decrypt: arr[1], spin: arr[2]};
};

/**
 * @return {data} - PPc id and Aux: variables
 */
var extractVariables = function () {
  //@ts-ignore
  if (typeof ppm_test_run !== 'undefined') return {ppcid: 'C', path: '', lf: '', key: '', root: ''};

  var arr = PPx.Extract('%n,%*path,%*lfdir%\\,%*base').split(',');
  var drive = arr[1].split(':')[0];
  var listfile = drive === '' ? 'root.xlf' : arr[1].replace(/[:\/]/g, '_') + '.xlf';
  var root = arr[3].split(' ')[0] + drive + ':';

  return {
    ppcid: arr[0],
    path: arr[1],
    lf: arr[2] + listfile,
    root: root
  };
};

/**
 * @param {string} ppcid
 * @param {string} target
 * @return {string} - Extract variable on specified PPx ID
 */
var extractOn = function (ppcid, target) {
  return PPx.Extract('%*extract(' + ppcid + ',"' + target + '")');
};

/**
 * @param {string} ppcid
 * @return {boolean} - Existence of the process
 */
var hasPPb = function (ppcid) {
  var ppbid = extractOn(ppcid, "%%si'" + rc.name.ppb + "'");
  var idlist = PPx.Extract('%*ppxlist(B)').replace(/_/g, '');

  return ~idlist.indexOf(ppbid) !== -1;
};

/**
 * @param {string} decrypt
 * @return {boolean} - Error occured
 */
var errorHandling = function (decrypt) {
  var errorcode = PPx.getProcessValue(rc.name.err);

  PPx.setProcessValue(rc.name.err, '');

  if (errorcode === '0') {
    return false;
  }

  if (decrypt !== '0') {
    PPx.setValue(rc.name.pw, '');
  }

  var msg = errorcode === 1 ? rc.mes.cancel : rc.mes.error;

  PPx.setPopLineMessage('!"' + msg);

  return true;
};

/**
 * @param {string} ppcid
 * @param {string} key - Key of processValue
 * @return {boolean} - Whether the job is executable
 */
var is_running = function (ppcid, key) {
  if (PPx.getProcessValue(key) !== '') {
    return true;
  }

  if (extractOn(ppcid, "%%si'rc_no_reload'") !== '') {
    PPx.Execute('*execute ' + ppcid + ',*string i,rc_no_reload=');

    return true;
  }

  PPx.setProcessValue(key, '1');

  return false;
};

/**
 * @param {data} data
 * @param {string} passcmd
 * @return {string} - Command line of ls2lf
 */
var lsToLf = function (data, passcmd) {
  return data.path === ''
    ? '%*ls2lf -c "F" ' + data.lf + ' rclone ' + passcmd + ' listremotes'
    : '%*ls2lf -j "S:Size,W:ModTime,F:Name" ' + data.lf + ' rclone ' + passcmd + ' lsjson ' + data.path;
};

/**
 * @param {args} args
 * @param {data} data
 * @param {string} passcmd
 */
var rcloneSync = function (args, data, passcmd) {
  PPx.Execute('*job start');
  util.execute(
    data.ppcid,
    '*run -hide -noppb -wait:later ' + lsToLf(data, passcmd) +
      '%%:*wait -run %%: *string p,' + rc.name.err + '=%%*exitcode'
  );
  errorHandling(args.decrypt);
  PPx.setProcessValue(rc.key, '');
  PPx.Execute('*job end');
};

/**
 * @param {args} args
 * @param {data} data
 * @param {string} passcmd
 */
var rcloneAsync = function (args, data, passcmd) {
  var spin = args.spin !== '0';
  var spin_count = '300';
  var endjob;

  if (spin) {
    endjob = '*string i,spin=';
  } else {
    endjob = '*job end';

    PPx.Execute('*job start');
  }

  var ppbid = extractOn(data.ppcid, "%%si'" + rc.name.ppb + "'");

  PPx.Execute(
    '*execute ' + ppbid + ',%%OC *run -wait:later ' + lsToLf(data, passcmd) +
      '%%:*wait -run' +
      '%bn*string p,' + rc.name.err + '=%%*exitcode' +
      '%bn*execute ' + data.ppcid + ',' + endjob +
      '%bn*wait ' + spin_count + ',2' +
      '%bn*if 0==%%sp"' + rc.name.err + '"%%:*execute ' + data.ppcid + ',*jumppath aux://S_auxRCLONE/' + data.path + ' -savelocate' +
      '%bn*if 1==%%sp"' + rc.name.err + '"%%:*execute ' + data.ppcid + ',*linemessage !"' + rc.mes.cancel +
      '%bn*if 1<%%sp"' + rc.name.err + '"%%:*execute ' + data.ppcid + ',*linemessage !"' + rc.mes.error +
      '%bn*string p,' + rc.name.err + '=' +
      '%bn*execute ' + data.ppcid + ',*string p,' + rc.key + '='
  );

  if (spin) {
    PPx.Execute(
      '*pptray -c *script %*getcust(S_ppm#global:lib)\\spinner.js,' + data.ppcid + ',' + spin_count + ',5000'
    );
  }
};

/**
 * @param {string} ppcid
 * @param {string} root - Root of aux://S_auxRCLONE/
 */
var setRootpath = function (ppcid, root) {
  PPx.Execute('*execute ' + ppcid + ',*string i,RootPath=' + root);
};

/**
 * @param {string} path - Path of cached ListFile
 * return {boolean} - Whether the path is exist
 */
var fileExists = function (path) {
  var fso = PPx.CreateObject('Scripting.FileSystemObject');

  return fso.FileExists(path);
};

/**
 * @param {string} async
 * @param {string} path - Path of cached ListFile
 * @return {boolean} fileExists
 */
var isAsync = function (async, path) {
  if (async === '0') {
    return false;
  }

  var ppmsync = PPx.Extract('%si"rc_sync"');

  if (ppmsync !== '') {
    PPx.Execute('*string i,rc_sync=');

    return false;
  }

  return fileExists(path);
};

/* Main */
var gArgs = adjustArg(PPx.Arguments);
var gData = extractVariables();

if (is_running(gData.ppcid, rc.key)) {
  setRootpath(gData.ppcid, gData.root);
  PPx.result = gData.lf;
  PPx.Quit(1);
}

PPx.Execute('*makedir %*name(DN, "' + gData.lf + '")');

if (!hasPPb(gData.ppcid)) {
  PPx.Execute('*execute ' + gData.ppcid + ',*mapkey use,K_ppmRclone');
  PPx.Execute(
    '*linecust ppm_rclone' + gData.ppcid + ',KC_main:CLOSEEVENT,%(' +
      '*ifmatch ' + gData.ppcid + ',%n%:*linecust ppm_rclone' + gData.ppcid + ',KC_main:CLOSEEVENT,' +
      '%:*mapkey delete,K_ppmRclone' +
      '%:*string o,ppbid=%si"' + rc.name.ppb + '"' +
      '%:*if (""!="%so"ppbid"")%:*closeppx %so"ppbid"%)'
  );
  PPx.Execute(
    '*run -min -noppb %0%\\ppbw.exe -k *execute ' + gData.ppcid + ',*string i,' + rc.name.ppb + '=%%n'
  );
  PPx.Execute('*wait 300,2');
}

var passCmd = rc.createPasscmd(gArgs.decrypt);

if (isAsync(gArgs.async, gData.lf)) {
  PPx.result = gData.lf;
  rcloneAsync(gArgs, gData, passCmd);
} else {
  rcloneSync(gArgs, gData, passCmd);
  setRootpath(gData.ppcid, gData.root);
  PPx.result = gData.lf;
}
