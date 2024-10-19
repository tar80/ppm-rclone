import {isEmptyStr} from '@ppmdev/modules/guard.ts';
import {getStaymodeId} from '@ppmdev/modules/staymode.ts';
import type {Error_String} from '@ppmdev/modules/types.ts';

export const DRIVE_LIST_NAME = 'Drives';
export const WORKER_NAME = 'workerRclone';
export const PLUGIN_NAME = 'ppm-rclone';
export const USER_ENCRYPT = 'rc_encrypt';
export const STAYMODE_ID = getStaymodeId(WORKER_NAME) || 80110;

export const getRemotePath = (macro: string): string => {
  const wd = PPx.Extract(macro);

  return wd.slice(wd.indexOf(DRIVE_LIST_NAME) + DRIVE_LIST_NAME.length + 1);
};

export const getPassCmd = (): Error_String => {
  const hasEncrypt = PPx.Extract(`%*getcust(S_ppm#user:${USER_ENCRYPT})`) === '1';

  if (!hasEncrypt) {
    return [false, ''];
  }

  const keyEmu = isEmptyStr(PPx.Extract(`%*getcust(_IDpwd:${DRIVE_LIST_NAME})`)) ? '%k"&s&p"%:' : '';
  const pswd = PPx.Extract(`${keyEmu}%*pass`);

  return isEmptyStr(pswd) ? [true, ''] : [false, `--password-command="echo ${pswd}"`];
};
