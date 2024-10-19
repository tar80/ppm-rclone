/* @file Execute StackPPb or return a command line, depending on a condition
 * @arg 0 {string} - If 1 is specified, use stackPPb
 * @arg 1 {string} - Specify the command to execute
 * @arg 2 {number} - If 1 is specified, move entries
 * @return {string} - Aux command line or empty string
 */

import {validArgs} from '@ppmdev/modules/argument.ts';
import {ppmTable} from '@ppmdev/modules/data.ts';
import debug from '@ppmdev/modules/debug.ts';
import {userEvent} from '@ppmdev/modules/event.ts';
import {isEmptyStr} from '@ppmdev/modules/guard.ts';
import {extractFileName, pathSelf} from '@ppmdev/modules/path.ts';
import {DRIVE_LIST_NAME, STAYMODE_ID, getRemotePath} from './mod/core.ts';

const STACK_PPB_DONE = 'DoneStackPPb';

const main = (): string => {
  const [stackPPb, cmdSpec, move] = validArgs();
  const useStackPPb = stackPPb === '1';
  const isMove = move === '1';
  const [update, cmdline, ppcid] = rclone[cmdSpec as keyof Rclone](isMove);
  let pswd = PPx.Extract(`%*getcust(_IDpwd:${DRIVE_LIST_NAME})`);

  if (!isEmptyStr(pswd)) {
    pswd = '--password-command="echo %*pass" ';
  }

  if (!isEmptyStr(cmdline)) {
    if (useStackPPb) {
      const noEvent = isEmptyStr(PPx.Extract(`%*getcust(${ppmTable.event}:${STACK_PPB_DONE})`));

      if (update && noEvent) {
        const [current, pair] = [PPx.Extract('%n'), PPx.Extract('%~n')];
        const [fd, pfd] = [PPx.Extract('%*extract(%n,"%%FD")'), PPx.Extract('%~FD')];
        userEvent.set(STACK_PPB_DONE, `%Obd *ppb -c *script ${pathSelf().parentDir}\\updateEntries.js,${current},${pair},${fd},${pfd}`);
      }

      PPx.Execute(`*execute ${ppcid},*script %sgu'ppmlib'\\stackPPb.stay.js,%*stackwidth,%*stackdirection,rclone ${pswd}${cmdline}`);
    } else {
      update && PPx.Execute(`*execute ${ppcid},*js ":${STAYMODE_ID},ppx_SetValue",regenerate,1`);
      cmdSpec === 'transfer' && PPx.Execute(`*execute %~n,*js ":${STAYMODE_ID},ppx_SetValue",regenerate,1`);

      return PPx.Extract(`rclone ${pswd}${cmdline}`);
    }
  }

  return '';
};

type RcloneOperations = 'modtime' | 'rename' | 'get' | 'store' | 'transfer' | 'mkdir' | 'delete';
type Rclone = {[key in RcloneOperations]: (isMode: boolean) => [boolean, string, string]};
const rclone = {} as Rclone;

rclone.rename = () => {
  const currentName = getRemotePath('%*path');
  const newName = getRemotePath('%*dest');

  return [false, `moveto -P "${currentName}" "${newName}"`, '%n'];
};

rclone.transfer = (isMove) => {
  const srcPath = `${getRemotePath('%*path')}%*addchar(/)%*src`;
  const dirName = PPx.GetFileInformation(srcPath) === ':DIR' ? extractFileName(srcPath) : '';
  const destPath = `${getRemotePath('%*dest')}%*addchar(/)${dirName}`;
  const cmd = isMove ? 'move' : 'copy';

  return [true, `${cmd} -P "${srcPath}" "${destPath}"`, '%n'];
};

rclone.get = (isMove) => {
  const srcPath = `${getRemotePath('%*path')}%*addchar(/)%*src`;
  const destPath = '%*name(D,"%*dest")';
  const cmd = isMove ? 'move' : 'copy';

  return [isMove, `${cmd} -P "${srcPath}" "${destPath}"`, '%n'];
};

rclone.store = (isMove) => {
  const srcPath = PPx.Extract('%*src');
  const dirName = PPx.GetFileInformation(srcPath) === ':DIR' ? extractFileName(srcPath) : '';
  const destPath = getRemotePath(`%*path%*addchar(/)${dirName}`);
  const cmd = isMove ? 'move' : 'copy';
  const hasInstance = PPx.Extract(`%*extract(%~n,"%%*stayinfo(${STAYMODE_ID})")`) === '1';

  return [hasInstance, `${cmd} -P "${srcPath}" "${destPath}"`, '%~n'];
};

rclone.mkdir = () => {
  const srcPath = getRemotePath('%*path');

  return [true, `mkdir -P "${srcPath}"`, '%n'];
};

rclone.delete = (isDirs) => {
  const srcPath = getRemotePath('%*path');
  const cmd = isDirs ? 'rmdirs' : 'delete';

  return [true, `${cmd} -P "${srcPath}"`, '%n'];
};

PPx.result = main();
