/* @file One-line editor for rclone */

import {isZero} from '@ppmdev/modules/guard.ts';
import {ppm} from '@ppmdev/modules/ppm.ts';
import {WORKER_NAME} from './mod/core.ts';

const COMP_TEXT_NAME = 'rclone.txt';

const main = (): void => {
  const complist = `%sgu'ppmcache'\\complist\\${COMP_TEXT_NAME}`;
  ppm.setkey(
    '^V_H31',
    `%(*insert %*extract(%n,"%%*js("":%%si'${WORKER_NAME}',ppx_GetValue"",wd)")%)`,
    false,
    'Insert current working directory path'
  );
  ppm.setkey(
    '^V_H32',
    `%(*if !0%*extract(%~n,"%%*stayinfo(%si'${WORKER_NAME}')")%:*insert %2%:*stop%)%bn` +
      `%bt%(*insert %*extract(%~n,"%%*js("":%%si'${WORKER_NAME}',ppx_GetValue"",wd)")%)`,
    true,
    'Insert paired working directory path'
  );
  ppm.setkey('^O', `*edit %(${complist}%&*completelist -set -file:"${complist}"%)`, false, 'Edit completion list');
  const [errorlevel, cmdline] = ppm.getinput({
    title: 'ppm-rclone',
    mode: 'h',
    leavecancel: true,
    autoselect: true,
    k: `*completelist -set -module:off -detail:"user" -file:${complist}`
  });

  if (isZero(errorlevel)) {
    /* NOTE: As of version199, input is no longer possible for cli commands
     * executed from *execute command.
     */
    // const ppbid = PPx.Extract(`%*js(":%si'${WORKER_NAME}',ppx_GetValue",ppbid)`);
    // const message = `${colorlize({message: `[RUN] rclone ${cmdline}`, fg: 'yellow'})}%%bn`;
    // PPx.Execute(`*focus ${ppbid}`);
    PPx.Execute(`*ppb -k rclone ${cmdline}`);
  }
};

main();
