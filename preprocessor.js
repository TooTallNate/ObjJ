/*
 * Preprocessor.js
 * Objective-J
 *
 * Created by Francisco Tolmasky.
 * Copyright 2008-2010, 280 North, Inc.
 *
 * Modified to output NodObjC syntax by Nathan Rajlich
 * Copyright 2012
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
 */

var TOKEN_ACCESSORS         = "accessors",
    TOKEN_CLASS             = "class",
    TOKEN_END               = "end",
    TOKEN_FUNCTION          = "function",
    TOKEN_IMPLEMENTATION    = "implementation",
    TOKEN_IMPORT            = "import",
    TOKEN_EACH              = "each",
    TOKEN_OUTLET            = "outlet",
    TOKEN_ACTION            = "action",
    TOKEN_NEW               = "new",
    TOKEN_SELECTOR          = "selector",
    TOKEN_SUPER             = "super",
    TOKEN_VAR               = "var",
    TOKEN_IN                = "in",
    TOKEN_PRAGMA            = "pragma",
    TOKEN_MARK              = "mark",

    TOKEN_EQUAL             = '=',
    TOKEN_PLUS              = '+',
    TOKEN_MINUS             = '-',
    TOKEN_COLON             = ':',
    TOKEN_COMMA             = ',',
    TOKEN_PERIOD            = '.',
    TOKEN_ASTERISK          = '*',
    TOKEN_SEMICOLON         = ';',
    TOKEN_LESS_THAN         = '<',
    TOKEN_OPEN_BRACE        = '{',
    TOKEN_CLOSE_BRACE       = '}',
    TOKEN_GREATER_THAN      = '>',
    TOKEN_OPEN_BRACKET      = '[',
    TOKEN_DOUBLE_QUOTE      = '"',
    TOKEN_PREPROCESSOR      = '@',
    TOKEN_HASH              = '#',
    TOKEN_CLOSE_BRACKET     = ']',
    TOKEN_QUESTION_MARK     = '?',
    TOKEN_OPEN_PARENTHESIS  = '(',
    TOKEN_CLOSE_PARENTHESIS = ')',

    TOKEN_WHITESPACE        = /^(?:(?:\s+$)|(?:\/(?:\/|\*)))/,
    TOKEN_NUMBER            = /^[+-]?\d+(([.]\d+)*([eE][+-]?\d+))?$/,
    TOKEN_IDENTIFIER        = /^[a-zA-Z_$](\w|$)*$/;

function IS_WORD (token) {
  return /^\w+$/.test(token);
}

function Lexer(/*String*/ aString)
{
    this._index = -1;
    // FIXME: Used fixed regex
    this._tokens = (aString + '\n').match(/\/\/.*(\r|\n)?|\/\*(?:.|\n|\r)*?\*\/|\w+\b|[+-]?\d+(([.]\d+)*([eE][+-]?\d+))?|"[^"\\]*(\\[\s\S][^"\\]*)*"|'[^'\\]*(\\[\s\S][^'\\]*)*'|\s+|./g);
    this._context = [];

    return this;
}

Lexer.prototype.push = function()
{
    this._context.push(this._index);
}

Lexer.prototype.pop = function()
{
    this._index = this._context.pop();
}

Lexer.prototype.peek = function(shouldSkipWhitespace)
{
    if (shouldSkipWhitespace)
    {
        this.push();
        var token = this.skip_whitespace();
        this.pop();

        return token;
    }

    return this._tokens[this._index + 1];
}

Lexer.prototype.next = function()
{
    return this._tokens[++this._index];
}

Lexer.prototype.previous = function()
{
    return this._tokens[--this._index];
}

Lexer.prototype.last = function()
{
    if (this._index < 0)
        return null;

    return this._tokens[this._index - 1];
}

Lexer.prototype.skip_whitespace = function(shouldMoveBackwards)
{
    var token;

    if (shouldMoveBackwards)
        while ((token = this.previous()) && TOKEN_WHITESPACE.test(token)) ;
    else
        while ((token = this.next()) && TOKEN_WHITESPACE.test(token)) ;

    return token;
}

exports.Lexer = Lexer;

function IS_NOT_EMPTY (buffer) {
  return buffer.atoms.length !== 0;
}
function CONCAT (buffer, atom) {
  return buffer.atoms[buffer.atoms.length] = atom;
}

function StringBuffer()
{
    this.atoms = [];
}

StringBuffer.prototype.toString = function()
{
    return this.atoms.join("");
}

exports.preprocess = function(/*String*/ aString, /*CFURL*/ aURL, /*unsigned*/ flags)
{
    return new Preprocessor(aString, aURL, flags).executable();
}

exports.eval = function(/*String*/ aString)
{
    return eval(exports.preprocess(aString).code());
}

var Preprocessor = function(/*String*/ aString, /*CFURL|String*/ aURL, /*unsigned*/ flags)
{
    this._URL = aURL;

    // Remove the shebang.
    aString = aString.replace(/^#[^\n]+\n/, "\n");

    this._currentSelector = "";
    this._currentClass = "";
    this._currentSuperClass = "";
    this._currentSuperMetaClass = "";

    this._buffer = new StringBuffer();
    this._preprocessed = null;
    this._dependencies = [];

    this._tokens = new Lexer(aString);
    this._flags = flags;
    this._classMethod = false;
    this._executable = null;

    this._classLookupTable = {};

    this._classVars = {};

    CONCAT(this._buffer, 'require("NodObjC/global");\n\n');

    /*var classObject = new objj_class();
    for (var i in classObject)
        this._classVars[i] = 1;*/

    this.preprocess(this._tokens, this._buffer);
}

Preprocessor.prototype.setClassInfo = function(className, superClassName, ivars)
{
    this._classLookupTable[className] = { superClassName:superClassName, ivars:ivars };
}

Preprocessor.prototype.getClassInfo = function(className)
{
    return this._classLookupTable[className];
}

Preprocessor.prototype.allIvarNamesForClassName = function(className)
{
    var names = {},
        classInfo = this.getClassInfo(className);

    while (classInfo)
    {
        for (var i in classInfo.ivars)
            names[i] = 1;

        classInfo = this.getClassInfo(classInfo.superClassName);
    }

    return names;
}

exports.Preprocessor = Preprocessor;

Preprocessor.Flags = { };

Preprocessor.Flags.IncludeDebugSymbols      = 1 << 0;
Preprocessor.Flags.IncludeTypeSignatures    = 1 << 1;

Preprocessor.prototype.executable = function()
{
    if (!this._executable)
        this._executable = new Executable(this._buffer.toString(), this._dependencies, this._URL);

    return this._executable;
}

Preprocessor.prototype.accessors = function(tokens)
{
    var token = tokens.skip_whitespace(),
        attributes = {};

    if (token != TOKEN_OPEN_PARENTHESIS)
    {
        tokens.previous();

        return attributes;
    }

    while ((token = tokens.skip_whitespace()) != TOKEN_CLOSE_PARENTHESIS)
    {
        var name = token,
            value = true;

        if (!IS_WORD(name))
            throw new SyntaxError(this.error_message("*** @accessors attribute name not valid."));

        if ((token = tokens.skip_whitespace()) == TOKEN_EQUAL)
        {
            value = tokens.skip_whitespace();

            if (!IS_WORD(value))
                throw new SyntaxError(this.error_message("*** @accessors attribute value not valid."));

            if (name == "setter")
            {
                if ((token = tokens.next()) != TOKEN_COLON)
                    throw new SyntaxError(this.error_message("*** @accessors setter attribute requires argument with \":\" at end of selector name."));

                value += ":";
            }

            token = tokens.skip_whitespace();
        }

        attributes[name] = value;

        if (token == TOKEN_CLOSE_PARENTHESIS)
            break;

        if (token != TOKEN_COMMA)
            throw new SyntaxError(this.error_message("*** Expected ',' or ')' in @accessors attribute list."));
    }

    return attributes;
}

Preprocessor.prototype.brackets = function(/*Lexer*/ tokens, /*StringBuffer*/ aStringBuffer)
{
    var tuples = [];

    while (this.preprocess(tokens, null, null, null, tuples[tuples.length] = [])) ;

    if (tuples[0].length === 1)
    {
        CONCAT(aStringBuffer, '[');

        // When we have an empty array literal ([]), tuples[0][0] will be an empty StringBuffer
        CONCAT(aStringBuffer, tuples[0][0]);

        CONCAT(aStringBuffer, ']');
    }

    else
    {

        // The first two arguments are always the receiver and the selector.
        if (tuples[0][0].atoms[0] == TOKEN_SUPER)
        {
            CONCAT(aStringBuffer, 'self.super(');
        }
        else
        {
            CONCAT(aStringBuffer, tuples[0][0]);
            CONCAT(aStringBuffer, '(');
        }

        // add the first (maybe only) piece of the selector
        var firstSelector = tuples[0][1];
        if (firstSelector[firstSelector.length - 1] === TOKEN_COLON) {
          firstSelector = firstSelector.substring(0, firstSelector.length - 1);
        }
        CONCAT(aStringBuffer, '"');
        CONCAT(aStringBuffer, firstSelector);
        CONCAT(aStringBuffer, '"');

        var index = 1,
            count = tuples.length;

        for(; index < count; ++index)
        {
            var pair = tuples[index];
            var sel  = pair[1];
            var arg  = pair[0];

            // add the arg
            CONCAT(aStringBuffer, ", ");
            CONCAT(aStringBuffer, arg);

            // if there's another piece of the selector to add, then add it
            if (sel) {
                CONCAT(aStringBuffer, ", \"");
                if (sel[sel.length - 1] === TOKEN_COLON) {
                  sel = sel.substring(0, sel.length - 1);
                }
                CONCAT(aStringBuffer, sel);
                CONCAT(aStringBuffer, '\"');
            }
        }

        CONCAT(aStringBuffer, ')');
    }
}

Preprocessor.prototype.directive = function(tokens, aStringBuffer, allowedDirectivesFlags)
{
    // Grab the next token, preprocessor directives follow '@' immediately.
    var buffer = aStringBuffer ? aStringBuffer : new StringBuffer(),
        token = tokens.next();

    // Convert @"strings" to NSString instances
    if (token.charAt(0) === TOKEN_DOUBLE_QUOTE) {
        CONCAT(buffer, 'NSString("stringWithUTF8String", ');
        CONCAT(buffer, token);
        CONCAT(buffer, ')');
    }

    // Currently we simply swallow forward declarations and only provide them to allow
    // compatibility with Objective-C files.
    else if (token === TOKEN_CLASS)
    {
        tokens.skip_whitespace();

        return;
    }

    // @implementation Class implementations
    else if (token === TOKEN_IMPLEMENTATION)
        this.implementation(tokens, buffer);

    // @import
    else if (token === TOKEN_IMPORT)
        this._import(tokens);

    // @selector
    else if (token === TOKEN_SELECTOR)
        this.selector(tokens, buffer);

    if (!aStringBuffer)
        return buffer;
}

Preprocessor.prototype.hash = function(tokens, aStringBuffer)
{
    // Grab the next token, C preprocessor directives follow '#' immediately.
    var buffer = aStringBuffer ? aStringBuffer : new StringBuffer(),
        token = tokens.next();

    // #pragma (C Preprocessor directive)
    if (token === TOKEN_PRAGMA)
    {
        token = tokens.skip_whitespace();

        // '#pragma mark' directive is used in Xcode editor for creating labels,
        // which is irrelevant to Cappuccino - just swallow this line
        if (token === TOKEN_MARK)
        {
            while ((token = tokens.next()).indexOf("\n") < 0);
        }
    }
    // if not a #pragma directive, it should not be processed here
    else
        throw new SyntaxError(this.error_message("*** Expected \"pragma\" to follow # but instead saw \"" + token + "\"."));
}

// preprocessor compat
var NO = false;
var MAX = Math.max;

Preprocessor.prototype.implementation = function(tokens, /*StringBuffer*/ aStringBuffer)
{
    var buffer = aStringBuffer,
        token = "",
        category = NO,
        class_name = tokens.skip_whitespace(),
        superclass_name = "Nil";

    if (!(/^\w/).test(class_name))
        throw new Error(this.error_message("*** Expected class name, found \"" + class_name + "\"."));

    this._currentSuperClass = "objj_getClass(\"" + class_name + "\").super_class";
    this._currentSuperMetaClass = "objj_getMetaClass(\"" + class_name + "\").super_class";

    this._currentClass = class_name;
    this._currentSelector = "";

    // If we reach an open parenthesis, we are declaring a category.
    if ((token = tokens.skip_whitespace()) == TOKEN_OPEN_PARENTHESIS)
    {
        token = tokens.skip_whitespace();

        if (token == TOKEN_CLOSE_PARENTHESIS)
            throw new SyntaxError(this.error_message("*** Can't Have Empty Category Name for class \"" + class_name + "\"."));

        if (tokens.skip_whitespace() != TOKEN_CLOSE_PARENTHESIS)
            throw new SyntaxError(this.error_message("*** Improper Category Definition for class \"" + class_name + "\"."));

        CONCAT(buffer, "{\nvar the_class = objj_getClass(\"" + class_name + "\")\n");
        CONCAT(buffer, "if(!the_class) throw new SyntaxError(\"*** Could not find definition for class \\\"" + class_name + "\\\"\");\n");
        CONCAT(buffer, "var meta_class = the_class.isa;");
    }
    else
    {
        // If we reach a colon (':'), then a superclass is being declared.
        if(token == TOKEN_COLON)
        {
            token = tokens.skip_whitespace();

            if (!TOKEN_IDENTIFIER.test(token))
                throw new SyntaxError(this.error_message("*** Expected class name, found \"" + token + "\"."));

            superclass_name = token;

            token = tokens.skip_whitespace();
        }

        CONCAT(buffer, ";(function () {\n  var the_class = ");
        CONCAT(buffer, superclass_name);
        CONCAT(buffer, ".extend('");
        CONCAT(buffer, class_name);
        CONCAT(buffer, "');\n");
        CONCAT(buffer, "  var meta_class = the_class.getClass();\n");

        // If we are at an opening curly brace ('{'), then we have an ivar declaration.
        if (token == TOKEN_OPEN_BRACE)
        {
            var ivar_names = {},
                ivar_count = 0,
                declaration = [],
                attributes,
                accessors = {},
                types = [];

            while((token = tokens.skip_whitespace()) && token != TOKEN_CLOSE_BRACE)
            {
                if (token === TOKEN_PREPROCESSOR)
                {
                    token = tokens.next();
                    if (token === TOKEN_ACCESSORS)
                        attributes = this.accessors(tokens);

                    else if (token !== TOKEN_OUTLET)
                        throw new SyntaxError(this.error_message("*** Unexpected '@' token in ivar declaration ('@"+token+"')."));
                    else
                        types.push("@" + token);
                }
                else if (token == TOKEN_SEMICOLON)
                {

                    var name = declaration[declaration.length - 1];
                    var type = declaration[declaration.length - 2];

                    CONCAT(buffer, "  the_class.addIvar('");
                    CONCAT(buffer, name);
                    CONCAT(buffer, "', ");
                    CONCAT(buffer, map_type(type));
                    CONCAT(buffer, ");\n");

                    ivar_names[name] = 1;
                    declaration = [];
                    types = [];

                    if (attributes)
                    {
                        accessors[name] = attributes;
                        attributes = null;
                    }
                }
                else
                {
                    declaration.push(token);
                    types.push(token);
                }
            }

            // If we have objects in our declaration, the user forgot a ';'.
            if (declaration.length)
                throw new SyntaxError(this.error_message("*** Expected ';' in ivar declaration, found '}'."));

            if (ivar_count)
                CONCAT(buffer, "]);\n");

            if (!token)
                throw new SyntaxError(this.error_message("*** Expected '}'"));

            this.setClassInfo(class_name, superclass_name === "Nil" ? null : superclass_name, ivar_names);

            // build up the list of illegal method param names
            var ivar_names = this.allIvarNamesForClassName(class_name);

            for (ivar_name in accessors)
            {
                var accessor = accessors[ivar_name],
                    property = accessor["property"] || ivar_name;

                // getter
                var getterName = accessor["getter"] || property,
                    getterCode = "(id)" + getterName + "\n{\nreturn " + ivar_name + ";\n}";

                CONCAT(buffer, this.method(new Lexer(getterCode), ivar_names));

                // setter
                if (accessor["readonly"])
                    continue;

                var setterName = accessor["setter"];

                if (!setterName)
                {
                    var start = property.charAt(0) == '_' ? 1 : 0;
                    setterName = (start ? "_" : "") + "set" + property.substr(start, 1).toUpperCase() + property.substring(start + 1) + ":";
                }

                var setterCode = "(void)" + setterName + "(id)newValue\n{\n";

                if (accessor["copy"])
                    setterCode += "if (" + ivar_name + " !== newValue)\n" + ivar_name + " = [newValue copy];\n}";
                else
                    setterCode += ivar_name + " = newValue;\n}";

                CONCAT(buffer, this.method(new Lexer(setterCode), ivar_names));
            }
        }
        else
            tokens.previous();

        // We must make a new class object for our class definition.
        CONCAT(buffer, "  the_class.register();\n");
    }

    if (!ivar_names)
        var ivar_names = this.allIvarNamesForClassName(class_name);

    while ((token = tokens.skip_whitespace()))
    {
        if (token == TOKEN_PLUS)
        {
            this._classMethod = true;

            CONCAT(buffer, this.method(tokens, this._classVars));
            CONCAT(buffer, '\n\n');
        }
        else if (token == TOKEN_MINUS)
        {
            this._classMethod = false;

            CONCAT(buffer, this.method(tokens, ivar_names));
            CONCAT(buffer, '\n\n');
        }
        // If we reach a # symbol, we may be at a C preprocessor directive.
        else if (token == TOKEN_HASH)
        {
            this.hash(tokens, buffer);
        }
        // Check if we've reached @end...
        else if (token == TOKEN_PREPROCESSOR)
        {
            // The only preprocessor directive we should ever encounter at this point is @end.
            if ((token = tokens.next()) == TOKEN_END)
                break;
            else
                throw new SyntaxError(this.error_message("*** Expected \"@end\", found \"@" + token + "\"."));
        }
        //else
        //    throw new SyntaxError(this.error_message("*** Expected a method declaration, or \"@end\", found \"" + token + "\"."));
    }

    // finish the function statement and execute it
    CONCAT(buffer, '})();\n');

    this._currentClass = "";
}

Preprocessor.prototype._import = function(tokens)
{
    var URLString = "",
        token = tokens.skip_whitespace(),
        isQuoted = (token !== TOKEN_LESS_THAN);

    if (token === TOKEN_LESS_THAN)
    {
        while ((token = tokens.next()) && token !== TOKEN_GREATER_THAN)
            URLString += token;

        if (!token)
            throw new SyntaxError(this.error_message("*** Unterminated import statement."));
    }

    else if (token.charAt(0) === TOKEN_DOUBLE_QUOTE)
        URLString = token.substr(1, token.length - 2);

    else
        throw new SyntaxError(this.error_message("*** Expecting '<' or '\"', found \"" + token + "\"."));

    CONCAT(this._buffer, "framework(\'");
    CONCAT(this._buffer, URLString);
    CONCAT(this._buffer, "\');\n");
    //CONCAT(this._buffer, isQuoted ? "\", YES);" : "\", NO);");

    this._dependencies.push({ path: URLString, isQuoted: isQuoted });
}

function map_type (type) {
  if (type === 'void') {
    return '"v"';
  } else if (type === 'id') {
    return '"@"';
  }
  return '"@"';
}

Preprocessor.prototype.method = function(/*Lexer*/ tokens, ivar_names)
{
    var buffer = new StringBuffer(),
        token,
        selector = "",
        parameters = [],
        types = [null];

    ivar_names = ivar_names || {};

    while ((token = tokens.skip_whitespace()) && token !== TOKEN_OPEN_BRACE && token !== TOKEN_SEMICOLON)
    {
        if (token == TOKEN_COLON)
        {
            var type = "";

            // Colons are part of the selector name
            selector += token;

            token = tokens.skip_whitespace();

            if (token == TOKEN_OPEN_PARENTHESIS)
            {
                // Swallow parameter/return type.  Perhaps later we can use this for debugging?
                while ((token = tokens.skip_whitespace()) && token != TOKEN_CLOSE_PARENTHESIS)
                    type += token;

                token = tokens.skip_whitespace();
            }

            // Add the type. If it's empty, add null instead.
            types[parameters.length + 1] = type || null;

            // Since this follows a colon, this must be the parameter name.
            parameters[parameters.length] = token;

            if (token in ivar_names)
                CPLog.warn(this.error_message("*** Warning: Method ( "+selector+" ) uses a parameter name that is already in use ( "+token+" )"));
        }
        else if (token == TOKEN_OPEN_PARENTHESIS)
        {
            var type = "";

            // Since :( is handled above, this must be the return type, just swallow it.
            while ((token = tokens.skip_whitespace()) && token != TOKEN_CLOSE_PARENTHESIS)
                type += token;

            // types[0] is the return argument
            types[0] = type || null;
        }
        // Argument list ", ..."
        else if (token == TOKEN_COMMA)
        {
            // At this point, "..." MUST follow.
            if ((token = tokens.skip_whitespace()) != TOKEN_PERIOD || tokens.next() != TOKEN_PERIOD || tokens.next() != TOKEN_PERIOD)
                throw new SyntaxError(this.error_message("*** Argument list expected after ','."));

            // FIXME: Shouldn't allow any more after this.
        }
        // Build selector name.
        else
            selector += token;
    }

    if (token === TOKEN_SEMICOLON)
    {
        token = tokens.skip_whitespace();
        if (token !== TOKEN_OPEN_BRACE)
        {
            throw new SyntaxError(this.error_message("Invalid semi-colon in method declaration. "+
            "Semi-colons are allowed only to terminate the method signature, before the open brace."));
        }
    }

    var index = 0,
        count = parameters.length;

    if (this._classMethod) {
      CONCAT(buffer, "  meta_class.");
    } else {
      CONCAT(buffer, "  the_class.");
    }
    CONCAT(buffer, "addMethod(\"");

    // first the selector
    CONCAT(buffer, selector);

    // then the types
    CONCAT(buffer, "\", { retval: ");
    CONCAT(buffer, map_type(types[0]));
    CONCAT(buffer, ", args: [ \"@\", \":\", ");
    for (var i = 1; i < types.length; i++) {
      CONCAT(buffer, map_type(types[1]));
      if (i+1 != types.length) {
        CONCAT(buffer, ', ');
      }
    }
    CONCAT(buffer, " ]");
    CONCAT(buffer, " }, ");

    this._currentSelector = selector;

    //if (this._flags & Preprocessor.Flags.IncludeDebugSymbols)
    //    CONCAT(buffer, " $" + this._currentClass + "__" + selector.replace(/:/g, "_"));

    // finally the function implementation
    CONCAT(buffer, "function (self, _cmd");

    for (; index < count; ++index)
    {
        CONCAT(buffer, ", ");
        CONCAT(buffer, parameters[index]);
    }

    CONCAT(buffer, ") {\n    with (self) {\n");
    CONCAT(buffer, "// BEGIN METHOD IMPLEMENTATION\n");
    console.error(tokens)
    CONCAT(buffer, this.preprocess(tokens, null, TOKEN_CLOSE_BRACE, TOKEN_OPEN_BRACE));
    CONCAT(buffer, "// END METHOD IMPLEMENTATION\n");
    CONCAT(buffer, "    }\n  }");
    // TODO: actually use Flags.IncludeTypeSignatures flag instead of tying to Flags.IncludeDebugSymbols
    //if (this._flags & Preprocessor.Flags.IncludeDebugSymbols) //flags.IncludeTypeSignatures)
    //    CONCAT(buffer, ","+JSON.stringify(types));
    CONCAT(buffer, ")");

    this._currentSelector = "";

    return buffer;
}

Preprocessor.prototype.preprocess = function(tokens, /*StringBuffer*/ aStringBuffer, terminator, instigator, tuple)
{
    var buffer = aStringBuffer ? aStringBuffer : new StringBuffer(),
        count = 0,
        token = "";

    if (tuple)
    {
        tuple[0] = buffer;

        var bracket = false,
            closures = [0, 0, 0];
    }

    while ((token = tokens.next()) && ((token !== terminator) || count))
    {
        if (tuple)
        {
            // Ignore :'s the belong to ternary operators (?:)
            if (token === TOKEN_QUESTION_MARK)
                ++closures[2];

            // Ingore anything between { } and ()
            else if (token === TOKEN_OPEN_BRACE)
                ++closures[0];

            else if (token === TOKEN_CLOSE_BRACE)
                --closures[0];

            else if (token === TOKEN_OPEN_PARENTHESIS)
                ++closures[1];

            else if (token === TOKEN_CLOSE_PARENTHESIS)
                --closures[1];

            // If not in {} and not in () and this is a colon and we don't belong to a tertiary operator OR this is a closing bracket...
            else if ((token === TOKEN_COLON && closures[2]-- === 0 ||
                    (bracket = (token === TOKEN_CLOSE_BRACKET))) &&
                    closures[0] === 0 && closures[1] === 0)
            {
                tokens.push(); // 1

                // If a bracket made us enter, go backwards skipping whitespace ([a b   ] allowed),
                // if not grab token immediately behind us ([a b  : c] not allowed
                var label = bracket ? tokens.skip_whitespace(true) : tokens.previous(),
                    isEmptyLabel = TOKEN_WHITESPACE.test(label);

                // The label must be an identifier, and preceded by whitespace, or whitespace itself (the "empty label")
                if (isEmptyLabel || TOKEN_IDENTIFIER.test(label) && TOKEN_WHITESPACE.test(tokens.previous()))
                {
                    tokens.push(); // 2

                    var last = tokens.skip_whitespace(true),
                        operatorCheck = true,
                        isDoubleOperator = false;

                    // unary or binary, still disables.
                    // + - + x is bad because it could be (+ - + x) or (a + - + x)
                    // the only good is unbroken chain
                    if (last === '+' || last === '-'){//alert(tokens.last())
                        if (tokens.previous() !== last)
                            operatorCheck = false;
                        else
                        {
                            last = tokens.skip_whitespace(true);
                            isDoubleOperator = true;
                        }}

                    tokens.pop(); // 2

                    tokens.pop(); // 1

                    //alert(operatorCheck + "operatorCheck for " + label + " and " + last);
                    if (operatorCheck && (

                        // <)> <label><:|]>
                        // <}> <label><:|]>
                        // <]> <label><:|]>
                        (!isDoubleOperator && (last === TOKEN_CLOSE_BRACE)) ||

                        last === TOKEN_CLOSE_PARENTHESIS || last === TOKEN_CLOSE_BRACKET ||

                    // <.> label<:|]> --> 5. label
                    // <5> label<:|]>
                        last === TOKEN_PERIOD || TOKEN_NUMBER.test(last) ||

                    // <string> <label><:\]>/
                        last.charAt(last.length - 1) === '\"' || last.charAt(last.length - 1) === '\'' ||

                    // <identifier-not> <label><:|]>
                        TOKEN_IDENTIFIER.test(last) && !/^(new|return|case|var)$/.test(last)))
                    {
                        if (isEmptyLabel)
                            tuple[1] = ':';
                        else
                        {
                            tuple[1] = label;

                            if (!bracket)
                                tuple[1] += ':';

                            var count = buffer.atoms.length;

                            while (buffer.atoms[count--] !== label) ;

                            buffer.atoms.length = count;
                        }

                        return !bracket;
                    }

                    if (bracket)
                        return NO;
                }

                tokens.pop(); // 2

                if (bracket)
                    return NO;
            }

            closures[2] = MAX(closures[2], 0);
        }

        if (instigator)
        {
            if (token === instigator)
                ++count;

            else if (token === terminator)
                --count;
        }

        // Safari can't handle function declarations of the form function [name]([arguments]) { }
        // in evals.  It requires them to be in the form [name] = function([arguments]) { }.  So we
        // need to find these and fix them.
        if (token === TOKEN_FUNCTION)
        {//if (window.p) alert("function");
            var accumulator = "";

            // Following the function identifier we can either have an open parenthesis or an identifier:
            while ((token = tokens.next()) && token !== TOKEN_OPEN_PARENTHESIS && !(/^\w/).test(token))
                accumulator += token;

            // If the next token is an open parenthesis, we have a standard function and we don't have to
            // change it:
            if (token === TOKEN_OPEN_PARENTHESIS)
            {
                if (instigator === TOKEN_OPEN_PARENTHESIS)
                    ++count;

                CONCAT(buffer, "function" + accumulator + '(');

                if (tuple)
                    ++closures[1];
            }
            // If it's not a parenthesis, we know we have a non-supported function declaration, so fix it:
            else
            {
                CONCAT(buffer, token + " = function");

/*#if FIREBUG
                var functionName = token;

                // Skip everything until the next close parenthesis.
                while ((token = tokens.next()) && token != TOKEN_CLOSE_PARENTHESIS)
                    CONCAT(buffer, token);

                // Don't forget the last token!
                CONCAT(buffer, token);

                // Skip everything until the next open curly brace.
                while ((token = tokens.next()) && token != TOKEN_OPEN_BRACE)
                    CONCAT(buffer, token);

                if (tuple)
                    ++closures[2];

                // Place the open curly brace as well, and the function name
                CONCAT(buffer, token + "\n \"__FIREBUG_FNAME__" + functionName + "\".length;\n");
#endif*/
            }
        }

        // If we reach an @ symbol, we are at a preprocessor directive.
        else if (token == TOKEN_PREPROCESSOR)
            this.directive(tokens, buffer);

        // If we reach a # symbol, we may be at a C preprocessor directive.
        else if (token == TOKEN_HASH)
            this.hash(tokens, buffer);

        // If we reach a bracket, we will either be preprocessing a message send, a literal
        // array, or an array index.
        else if (token == TOKEN_OPEN_BRACKET)
            this.brackets(tokens, buffer);

        // If not simply append the token.
        else
            CONCAT(buffer, token);
    }

    // If we get this far and we're parsing an objj_msgSend (or array), then we have a problem.
    if (tuple)
        throw new SyntaxError(this.error_message("*** Expected ']' - Unterminated message send or array."));

    if (!aStringBuffer)
        return buffer;
}

Preprocessor.prototype.selector = function(tokens, aStringBuffer)
{
    var buffer = aStringBuffer ? aStringBuffer : new StringBuffer();

    CONCAT(buffer, "sel_getUid(\"");

    // Swallow open parenthesis.
    if (tokens.skip_whitespace() != TOKEN_OPEN_PARENTHESIS)
        throw new SyntaxError(this.error_message("*** Expected '('"));

    // Eat leading whitespace
    var selector = tokens.skip_whitespace();

    if (selector == TOKEN_CLOSE_PARENTHESIS)
        throw new SyntaxError(this.error_message("*** Unexpected ')', can't have empty @selector()"));

    CONCAT(aStringBuffer, selector);

    var token,
        starting = true;

    while ((token = tokens.next()) && token != TOKEN_CLOSE_PARENTHESIS)
    {
        if (starting && /^\d+$/.test(token) || !(/^(\w|$|\:)/.test(token)))
        {
            // Only allow tail whitespace
            if (!(/\S/).test(token))
                if (tokens.skip_whitespace() == TOKEN_CLOSE_PARENTHESIS)
                    break;
                else
                    throw new SyntaxError(this.error_message("*** Unexpected whitespace in @selector()."));
            else
                throw new SyntaxError(this.error_message("*** Illegal character '" + token + "' in @selector()."));
        }

        CONCAT(buffer, token);
        starting = (token == TOKEN_COLON);
    }

    CONCAT(buffer, "\")");

    if (!aStringBuffer)
        return buffer;
}

Preprocessor.prototype.error_message = function(errorMessage)
{
    return errorMessage + " <Context File: "+ this._URL +
                                (this._currentClass ? " Class: "+this._currentClass : "") +
                                (this._currentSelector ? " Method: "+this._currentSelector : "") +">";
}
