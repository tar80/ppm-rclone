(function () {
  var rc = {};
  var ppmLang = PPx.Extract('%*getcust(S_ppm#global:language)');
  ppmLang = ppmLang !== '' ? ppmLang : 'ja';
  rc.key = 'ppm_rc' + PPx.Extract('%*extract(C,"%%n")');
  rc.mes = {
    ja: {
      cancel: '中止しました',
      error: 'エラーが発生しました',
      title: 'コンフィグパスワードを入力',
      noroot: 'ルートパスを取得できませんでした',
      limit: 'ファイルサイズが大き過ぎます'
    },
    en: {
      cancel: 'Aborted',
      error: 'An error occured',
      title: 'Enter config password',
      noroot: 'Could not get root path',
      limit: 'File size too large'
    }
  }[ppmLang];
  rc.name = {
    err: 'rc_error',
    pid: 'rc_ppb_pid',
    ppb: 'rc_ppb',
    passcmd: 'rc_passcmd'
  };
  /**
   * @param {string} decrypt
   * @return {string} - rclone option(--password=command)
   */
  rc.createPasscmd = function (decrypt) {
    if (decrypt === '0') return '';
    var option;
    if (PPx.getValue(rc.name.passcmd) === '') {
      var password = PPx.Extract('%*input(-title:"ppm-rclone ' + rc.mes.title + '" -mode:e)');
      option = '--password-command="echo ' + password + '"';
      if (password === '') {
        PPx.setProcessValue(rc.key, '');
        PPx.Quit(-1);
      }
      PPx.setValue(rc.name.passcmd, option);
    }
    return PPx.getValue(rc.name.passcmd);
  };
  return rc;
})();
