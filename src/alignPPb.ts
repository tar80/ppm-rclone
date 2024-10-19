/* @file Align multiple Rclone host PPb windows
 * @arg 0 {string} - Specify direction. "NW" | "NE" | "SW" | "SE"(default)
 * @arg 1 {number} - Specify PPb width
 */

import {safeArgs} from '@ppmdev/modules/argument.ts';
import {isEmptyStr} from '@ppmdev/modules/guard.ts';
import {WORKER_NAME} from './mod/core.ts';
import debug from '@ppmdev/modules/debug.ts';

type Direction = 'NE' | 'NW' | 'SE' | 'SW';
const PPB_WIDTH = 500;
const PPB_PADDING = 10;
const TASKBAR_MARGIN = 50;

const dispWidth = Number(PPx.Extract('%*getcust(S_ppm#global:disp_width)'));
const dispHeight = Number(PPx.Extract('%*getcust(S_ppm#global:disp_height)')) - TASKBAR_MARGIN;

const main = (): void => {
  const [direction, ppbWidth] = safeArgs('NW', PPB_WIDTH);
  const currentWoker = PPx.Extract(`%si'${WORKER_NAME}'`);
  const pairedWorker = PPx.Extract(`%*extract(~,"%%si'${WORKER_NAME}'")`);
  let [hasCurrent, hasPair] = [false, false];
  let instance = '';

  if (!isEmptyStr(currentWoker)) {
    hasCurrent = true;
    instance = currentWoker;
  }

  if (!isEmptyStr(pairedWorker)) {
    hasPair = true;
    instance = pairedWorker;
  }

  align(instance, ppbWidth, direction as Direction, hasCurrent, hasPair);
  PPx.Execute('*focus %n');
};

const align = (instance: string, width: number, direction: Direction, hasCurrent: boolean, hasPair: boolean): void => {
  const halfHeight = dispHeight / 2;

  if (hasCurrent) {
    const id = PPx.Extract('%n');
    const ppbid = PPx.Extract(`%*extract(${id},"%%*js("":${instance},ppx_GetValue"",ppbid)")`);
    const height = hasPair ? halfHeight : Number(PPx.Extract(`%*windowrect(%N${ppbid},h)`));
    PPx.Execute(`*windowsize %N${ppbid},${width},${height}`);
    _reposition(ppbid, direction, width, height, hasCurrent);
  }

  if (hasPair) {
    const id = PPx.Extract('%~n');
    const ppbid = PPx.Extract(`%*extract(${id},"%%*js("":${instance},ppx_GetValue"",ppbid)")`);
    const height = hasCurrent ? halfHeight : Number(PPx.Extract(`%*windowrect(%N${ppbid},h)`));
    PPx.Execute(`*windowsize %N${ppbid},${width},${height}`);
    _reposition(ppbid, direction, width, height, hasCurrent, hasPair);
  }
};

let firstId: string;
const _reposition = (ppbid: string, direction: Direction, width: number, height: number, hasCurrent: boolean, hasPair?: boolean): void => {
  if (hasCurrent && hasPair == null) {
    const pos = _screenAlignment[direction](width, height);
    PPx.Execute(`*windowposition %N${ppbid},${pos.join(',')}`);
    firstId = ppbid;
  } else if (hasPair != null) {
    const pos = _screenAlignment[direction](width, height);
    const type = ~direction.indexOf('N') ? '4' : '3';
    hasCurrent ? PPx.Execute(`*fitwindow %N${firstId},%N${ppbid},${type}`) : PPx.Execute(`*windowposition %N${ppbid},${pos.join(',')}`);
  }
};

const _screenAlignment = {
  NW(_width: number, _height: number) {
    const posX = 0;
    const posY = 0;

    return [posX, posY];
  },
  NE(width: number, _height: number) {
    const posX = dispWidth - width - PPB_PADDING;
    const posY = 0;

    return [posX, posY];
  },
  SW(_width: number, height: number) {
    const posX = 0;
    const posY = dispHeight - height;

    return [posX, posY];
  },
  SE(width: number, height: number) {
    const posX = dispWidth - width - PPB_PADDING;
    const posY = dispHeight - height;

    return [posX, posY];
  }
};

main();
