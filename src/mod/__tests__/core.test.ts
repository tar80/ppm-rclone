import PPx from '@ppmdev/modules/ppx.ts';
global.PPx = Object.create(PPx);
import {getPassCmd} from '../core.ts';

describe('getPassCmd()', function () {
  let extract = jest.spyOn(PPx, 'Extract');
  afterEach(() => extract.mockClear());
  it('no emcryption', () => {
    expect(getPassCmd()).toEqual([false, ''])
  })
  it('emcryption, no password registered ', () => {
    extract.mockImplementation((param = '') => {
      if (~param?.indexOf('S_ppm#user:')) {
        return '1'
      } else if (~param.indexOf('_IDpwd')) {
        return ''
      }
      return ''
    })
    expect(getPassCmd()).toEqual([true, ''])
  })
  it('emcryption, password registered ', () => {
    extract.mockImplementation((param = '') => {
      if (~param?.indexOf('S_ppm#user:')) {
        return '1'
      } else if (~param.indexOf('_IDpwd')) {
        return 'hasPassword'
      }
      return 'password'
    })
    expect(getPassCmd()).toEqual([false, '--password-command="echo password"'])
  });
});
