/* @file update entry lists
 * @arg 0 {string} - Current ppcid
 * @arg 1 {string} - Paired ppcid
 * @arg 2 {string} - Current directory path
 * @arg 3 {string} - Paired diretory path
 */

import {validArgs} from '@ppmdev/modules/argument.ts';
import debug from '@ppmdev/modules/debug.ts';
import {isEmptyStr} from '@ppmdev/modules/guard.ts';
import {WORKER_NAME} from './mod/core.ts';

const main = (): void => {
  type Details = {id: string; dir: string; worker: string; target?: string};
  const current = {} as Details;
  const paired = {} as Details;
  [current.id, paired.id, current.target, paired.target] = validArgs();
  current.worker = PPx.Extract(`%*extract(${current.id},"%%si'${WORKER_NAME}'")`);
  paired.worker = PPx.Extract(`%*extract(${paired.id},"%%si'${WORKER_NAME}'")`);
  current.dir = PPx.Extract(`%*extract(${current.id},"%%FD")`);
  paired.dir = PPx.Extract(`%*extract(${paired.id},"%%FD")`);

  if (!isEmptyStr(current.worker) && current.target === current.dir) {
    PPx.Execute(`*execute ${current.id},*js ":${current.worker},ppx_RegenScore",1%%:*jumppath -update -savelocate`);
  }

  if (!isEmptyStr(paired.worker) && paired.target === paired.dir) {
    PPx.Execute(`*execute ${paired.id},*js ":${paired.worker},ppx_RegenScore",1%%:*jumppath -update -savelocate`);
  }
};

main();
