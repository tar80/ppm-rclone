var st = PPx.CreateObject('ADODB.stream');
var module = function (filepath) {
  st.Open;
  st.Type = 2;
  st.Charset = 'UTF-8';
  st.LoadFromFile(filepath);
  var data = st.ReadText(-1);
  st.Close;

  return Function(' return ' + data)();
};
var rc = module(PPx.Extract('%*getcust(S_ppm#plugins:ppm-rclone)\\script\\jscript\\mod_rc.js'));
module = null;

describe('createPasscmd', function () {
  it('No decrypt', function () {
    assert.equal('', rc.createPasscmd('0'));
  });
  it('Decrypt', function () {
    var word = '--password-command="echo 1"';
    PPx.setValue(rc.name.passcmd, word);
    assert.equal(word, rc.createPasscmd('1'));
    PPx.setValue(rc.name.passcmd, '');
  });
});
