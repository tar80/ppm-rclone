/* @file Ensure rclone configuration is encrypted and set variable */

import {ppmTable} from '@ppmdev/modules/data.ts';
import {USER_ENCRYPT} from './mod/core.ts';

const RCLONE_COMMAND = 'rclone config encryption check';
const ERROR_MESSEGE = 'config file is NOT encrypted';

const main = (): void => {
  const result = PPx.Extract(`%*run(-hide -nostartmsg ${RCLONE_COMMAND})`);
  const encrypt = ~result.indexOf(ERROR_MESSEGE) ? '' : '1';
  PPx.Execute(`*setcust ${ppmTable.user}:${USER_ENCRYPT}=${encrypt}`);
};

main();
