log.print('action testing.js');
log.print(module);
log.print(module.exports);
console.log(exports);
console.log(module.exports);
/*
// Hacking my own system...
    console.log(module.parent.parent.children[0].exports.getEventModuleAuth('probinder',
    	function(err, obj) {console.log(obj);}));
*/

//FIXME do not try to delete a file and rely on it to exist, rather try to create it first! o check for its existance and then delete it
try {
  fs.unlinkSync(path.resolve(__dirname, 'event_modules', 'malicious', 'test.json'));
  console.error('VERY BAD! NEVER START THIS SERVER WITH A USER THAT HAS WRITE RIGHTS ANYWHERE!!!');
} catch (err) {
  console.log('VERY GOOD! USERS CANNOT WRITE ON YOUR DISK!');
  
}
throw new Error('Testing your error handling');
