
var objj = require('./preprocessor')

/*var lex = new objj.Lexer('@import <Foundation>')
console.log(lex)

var lex2 = new objj.Lexer(require('fs').readFileSync('address.j', 'utf8'))
console.log(lex2)*/

//var pre = new objj.Preprocessor('@import <Foundation>')
//console.log(pre._buffer.toString())

var pre2 = new objj.Preprocessor(require('fs').readFileSync('address.j', 'utf8'))
console.log(pre2._buffer.toString())
