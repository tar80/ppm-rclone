describe('hasPPb', function () {
  it('check variable', function () {
    assert.equal(true, hasPPb('CA'));
  });
});
describe('errorHandling', function () {
  it('no errors', function () {
    PPx.setProcessValue(rc.name.err, '0');
    assert.equal(false, errorHandling());
    assert.equal('', PPx.Extract('%sp"' + rc.err + '"'));
  });
  it('error occured', function () {
    PPx.setProcessValue(rc.name.err, '1');
    assert.equal(true, errorHandling());
    assert.equal('', PPx.Extract('%sp"' + rc.err + '"'));
  });
});
describe('is_running', function () {
  var key = 'utp_job';
  it('Script is not running', function () {
    assert.equal(false, is_running('C', key));
  });
  it('Script is running', function () {
    PPx.setValue(key, '1');
    assert.equal(true, is_running('C', key));
    PPx.setValue(key, '');
  });
  it('Prevent duplicate executions', function () {
    PPx.Execute('*execute C,*string i,rc_no_reload=1');
    assert.equal(true, is_running('C', key));
    PPx.Execute('*execute C,*string i,rc_no_reload=');
  });
});
describe('isAsync', function () {
  it('not async', function () {
    assert.equal(false, isAsync('0', ''));
  });
  it('variable %%si"ppmsync"', function () {
    PPx.Execute('*string i,rc_sync=1');
    assert.equal(false, isAsync('1', ''));
    assert.equal('', PPx.Extract('%si"rc_sync'));
  });
  it('path is not exist', function () {
    assert.equal(false, isAsync('1', 'c:\\not\\exist\\path'));
  });
});
PPx.Execute('*closeppx %*extract(CA,"%%si""' + rc.name.ppb + '""")');
PPx.Execute('*execute C,*string i,' + rc.name.ppb + '=');
PPx.Execute('*execute C,*mapkey delete,K_ppmRclone');
