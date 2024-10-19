/* @file Create a ListFile from the output of Rclone
 * @arg 0 {string} - Starup size of the background PPb. 'bottom'(default) | 'min' | 'max' | 'noactive'
 * @arg 1 {number} - If specified, display spinner during waiting time. 0=dot | 1=star | 2=box | 3=toggle
 * @return - Path to ListFile
 */

import {cursorMove} from '@ppmdev/modules/ansi.ts';
import {validArgs} from '@ppmdev/modules/argument.ts';
import {staymodeID, useLanguage} from '@ppmdev/modules/data.ts';
import debug from '@ppmdev/modules/debug.ts';
import fso from '@ppmdev/modules/filesystem.ts';
import {isEmptyStr, isZero} from '@ppmdev/modules/guard.ts';
import {runPPb} from '@ppmdev/modules/run.ts';
import {DRIVE_LIST_NAME, PLUGIN_NAME, STAYMODE_ID, USER_ENCRYPT, WORKER_NAME, getPassCmd, getRemotePath} from './mod/core.ts';
import {langWorkerRclone} from './mod/language.ts';

const MAX_CAT_SIZE = 1048576;
const KEY_TABLE_NAME = 'K_ppmRclone';
const SI_SPIN_STOP = 'ppm_rclone_spin';
const REMOTES_FILE_NAME = 'remotes.xlf';
const RESULT_FILE_NAME = 'tmp.xlf';
const SPINNER_SCRIPT_PATH = '%sgu"ppmlib"\\spinner.js';
const LAUNCH_PPB_OPTS = '-nostartmsg -breakjob -wait:no';

type StartWith = 'min' | 'max' | 'noactive' | 'bottom';
type Spinner = '0' | '1' | '2' | '3' | '4' | '5';
type CacheKeys = Extract<keyof Cache, string>;
type Cache = {
  base: string;
  ls2lf: string;
  lfdir: string;
  ppvid: string;
  ppcid: string;
  ppbid: string;
  passcmd: string;
  startwith: StartWith;
  ttl: number;
  stackdirection: string;
  stackwidth: string;
  regenerate: string;
  wd: string;
  spinner?: Spinner;
  running?: 'setup' | 'prog' | 'ppv';
};

const cache = {
  base: PPx.Extract('%*base').split(' ')[0],
  ls2lf: PPx.Extract('%*ls2lf'),
  lfdir: PPx.Extract('%*lfdir'),
  ttl: Number(PPx.Extract('%*ttl')) * 60000,
  stackdirection: PPx.Extract('%*stackdirection'),
  stackwidth: PPx.Extract('%*stackwidth'),
  ppvid: PPx.Extract('%*ppvid') ?? 'R',
  ppcid: PPx.Extract('%n'),
  regenerate: ''
} as Cache;

const lang = langWorkerRclone[useLanguage()];

const main = (): string => {
  if (!fso.FolderExists(cache.lfdir)) {
    PPx.Execute(`*makedir ${cache.lfdir}`);
  }

  let error: boolean;
  [error, cache.passcmd] = getPassCmd();

  if (error) {
    statusMsg(lang.couldNotGetPass);
    clearAuthentication();

    return '';
  }

  const [ppb, spinner] = validArgs();
  cache.startwith = (ppb as StartWith) ?? 'bottom';
  cache.spinner = !isEmptyStr(spinner) ? (spinner as Spinner) : undefined;
  cache.running = 'setup';

  PPx.StayMode = STAYMODE_ID;
  executeAt(cache.ppcid, `*string i,${WORKER_NAME}=${STAYMODE_ID}%:*mapkey use,${KEY_TABLE_NAME}`);

  return ppx_resume();
};

const ppx_resume = (): string => {
  if (!cache.ppbid || isEmptyStr(PPx.Extract(`%N${cache.ppbid}`))) {
    startPPb();
  }

  executeAt(cache.ppcid, `*string i,RootPath=${cache.base}`);
  cache.wd = PPx.Extract('%*path').slice(DRIVE_LIST_NAME.length + 1);
  const isRemotes = cache.wd.indexOf(':') === -1;
  const lfPath = getListFilePath(isRemotes);

  if (!cache.running && isEmptyStr(cache.regenerate)) {
    return lfPath;
  }

  ppx_StopRunning();

  const cmdline = generateLs2lfCmd(isRemotes);

  if (!fso.FileExists(lfPath)) {
    PPx.Extract(`%*extract(${cache.ppbid},"echo ;ListFile>${lfPath}%%&")`);
  } else if (isEmptyStr(cache.regenerate) && withinMinutes(lfPath)) {
    return lfPath;
  }

  asyncRclone(cmdline, lfPath);

  return lfPath;
};

const ppx_GetValue = <T extends CacheKeys>(key: T): Cache[T] => cache[key];

const ppx_SetValue = <T extends CacheKeys>(key: T, value: any): void => {
  cache[key] = value;
};

const ppx_RegenScore = (score: string | number): void => {
  cache.regenerate = !isZero(score) ? `${cache.regenerate}1` : cache.regenerate.slice(0, -1);
};

const ppx_StopRunning = (): void => {
  showSpinner(false);
  PPx.Execute(`*signal ${cache.ppbid},kill`);

  if (cache.running === 'ppv') {
    PPx.Execute(`*closeppx V${cache.ppvid}`);
  }

  cache.running = undefined;
};

const ppx_Resolve = (exitcode: string, lfPath: string): void => {
  showSpinner(false);

  if (exitcode === '0') {
    PPx.Execute(`*launch -noppb -hide -nostartmsg -wait copy /Y ${cache.lfdir}\\${cache.ppcid}${RESULT_FILE_NAME} ${lfPath}`);
    PPx.Execute('*jumppath -savelocate');
    executeAt(cache.ppbid, `*linemessage ${cursorMove('u', 3)}`);
  } else {
    statusMsg(lang.error);
    // executeAt(cache.ppbid, `*linemessage ${cursorMove('u', 4)}`);
  }

  cache.running = undefined;
};

const ppx_ChangeModTime = (): void => {
  const modTime = new Date(PPx.Entry.DateLastModified).toLocaleString();
  const currentTime = PPx.Extract('%*now').replace(' ', 'T');
  const newTime = PPx.Extract(`%*input("${currentTime}" -title:"${lang.changeModTime} [ ${modTime} ]" -mode:g)`);

  if (!isEmptyStr(newTime)) {
    ppx_RegenScore(1);
    const path = getRemotePath('%FDC');
    const cmdline = `rclone ${cache.passcmd} touch "${path}" --localtime -Ct ${newTime}%:%K${cache.ppcid}"@F5"`;
    PPx.Execute(`*script %sgu'ppmlib'\\stackPPb.stay.js,${cache.stackwidth},${cache.stackdirection},%(${cmdline}%)`);
  }
};

const ppx_CatFile = (maximum: string): void => {
  if (!isEmptyStr(PPx.getIValue(SI_SPIN_STOP)) || !isZero(PPx.Extract(`%*stayinfo(${staymodeID.stackPPb})`))) {
    return;
  }

  const fileSize = PPx.Entry.Size;
  const maxCatSize = !isEmptyStr(maximum) ? Number(maximum) : MAX_CAT_SIZE;

  if (fileSize > maxCatSize) {
    statusMsg(lang.overCatSize);

    return;
  }

  showSpinner(true);

  const path = getRemotePath('%1%\\%R');
  PPx.Execute(
    `*launch ${LAUNCH_PPB_OPTS} rclone ${cache.passcmd} cat ${path}|` +
      `%0ppvw.exe -bootid:${cache.ppvid} -k *execute ${cache.ppcid},*string i,${SI_SPIN_STOP}=`
  );
  cache.running = 'ppv';
};

const ppx_Config = (...subcmd: string[]): void => {
  if (subcmd[0] === 'encryption') {
    const isRemove = subcmd?.[1] === 'remove';
    let newPswd = '';

    if (!isRemove) {
      newPswd = PPx.Extract(`%*input(-title:"${lang.inputTitle}" -mode:e)`);

      if (isEmptyStr(newPswd)) {
        return;
      }
    }

    PPx.Execute(`rclone ${cache.passcmd} config encryption remove%&`);
    clearAuthentication();
    let encrypt: string;

    if (isEmptyStr(newPswd)) {
      encrypt = '0';
      cache.passcmd = '';
    } else {
      encrypt = '1';
      cache.passcmd = `--password-command="echo ${newPswd}"`;
      PPx.Execute(`rclone ${cache.passcmd} config encryption set`);
    }

    PPx.Execute(`*setcust S_ppm#user:${USER_ENCRYPT}=${encrypt}`);
  } else {
    const launchOpts = '-noppb -nostartmsg -breakjob';
    PPx.Execute(`*launch ${launchOpts} %0ppbw -c @rclone ${cache.passcmd} config ${subcmd.join(' ')}`);
  }
};

const ppx_Discard = (): void => {
  showSpinner(false);
  PPx.StayMode = 0;
  cache.running === 'prog' && ppx_StopRunning();
  cache.running = undefined;
  executeAt(cache.ppcid, `*string i,${WORKER_NAME}=%:*mapkey delete,${KEY_TABLE_NAME}`);
  closePPb();
};

const ppx_finally = (): void => {
  showSpinner(false);
  closePPb();
  debug && PPx.Echo(`[DEBUG] ${PPx.StayMode}: finally`);
};

const statusMsg = (msg: string): void => executeAt(cache.ppcid, `*linemessage !"${msg}`);
const executeAt = (id: string, cmdline: string): void => {
  PPx.Execute(`*execute ${id},%(${cmdline}%)`);
};

const getListFilePath = (isRemotes: boolean): string => {
  const fileName = isRemotes ? REMOTES_FILE_NAME : `${cache.wd.replace(/[:\/]/g, '_')}.xlf`;

  return `${cache.lfdir}\\${fileName}`;
};

const withinMinutes = (path: string): boolean => {
  const st = fso.GetFile(path);
  const lastModDate = st.DateLastModified;
  const currentDate = new Date();

  return 0 > Number(currentDate) - Number(lastModDate) - cache.ttl;
};

const showSpinner = (action: boolean): void => {
  if (cache.spinner) {
    if (action) {
      PPx.Execute(`%Obdq *ppb -c *script ${SPINNER_SCRIPT_PATH},${cache.ppcid},${cache.spinner},${SI_SPIN_STOP}`);
    } else {
      executeAt(cache.ppcid, `*string i,${SI_SPIN_STOP}=`);
    }
  }
};

const startPPb = (): void => {
  const version = PPx.Extract(`%*script("%sgu'ppmlib'\\expandSource.js",ppm-rclone,version)`);
  runPPb({
    startwith: cache.startwith,
    wd: cache.lfdir,
    x: 10,
    y: 10,
    k: `*execute ${cache.ppcid},*js ":${STAYMODE_ID},ppx_SetValue",ppbid,%%n`,
    desc: `${PLUGIN_NAME}[${cache.ppcid}] version ${version}`,
    fg: 'cyan'
  });
};

const closePPb = (): void => {
  PPx.Execute(`*closeppx ${cache.ppbid}`);
};

const clearAuthentication = (): void => {
  PPx.Execute(`*clearauth%:*deletecust _IDpwd:${DRIVE_LIST_NAME}`);
};

const generateLs2lfCmd = (isRemotes: boolean): string => {
  const lfPath = `${cache.lfdir}\\${cache.ppcid}${RESULT_FILE_NAME}`;

  return isRemotes
    ? `${cache.ls2lf} -c "F" ${lfPath} rclone ${cache.passcmd} listremotes`
    : `${cache.ls2lf} -j "A:Attr,d:IsDir,S:Size,W:ModTime,F:Name" ${lfPath} rclone ${cache.passcmd} lsjson ${cache.wd}`;
};

const asyncRclone = (cmdline: string, lfPath: string) => {
  const message = '*linemessage loading...';
  cache.running = 'prog';
  cache.regenerate = '';
  showSpinner(true);
  executeAt(
    cache.ppbid,
    `${message}%:*launch ${LAUNCH_PPB_OPTS} ${cmdline}%:*execute ${cache.ppcid},*js ":${STAYMODE_ID},ppx_Resolve",%*exitcode,"${lfPath}"`
  );
};

PPx.result = main();
