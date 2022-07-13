'use strict';

import * as vscode from 'vscode';
import Uglifier from './Uglifier'
import methodtable from './methodtable.json'
import attributetable from './attributetable.json'
import dictionary from './dictionary.json'


export function activate(Context: vscode.ExtensionContext) {

    vscode.workspace.onDidChangeTextDocument(parseKeys);

    registerProviders(Context, parseKeys());
    registerCommands(Context)

}

// Document Symbol Provider
class PmlDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        return new Promise((resolve, reject) => {
            var symbols: any[] = [];

            // This line is here purely to satisfy linter
            token = token;

            for (var i = 0; i < document.lineCount; i++) {
                var line = document.lineAt(i);

                let lineTrimmed: string = line.text.trim();

                if (lineTrimmed.toLowerCase().startsWith("define method .")) {
                    symbols.push({
                        name: line.text.substr(15),
                        kind: vscode.SymbolKind.Method,
                        location: new vscode.Location(document.uri, line.range)
                    })
                }

                if (lineTrimmed.toLowerCase().startsWith("define function ")) {
                    symbols.push({
                        name: line.text.substr(16),
                        kind: vscode.SymbolKind.Function,
                        location: new vscode.Location(document.uri, line.range)
                    })
                }
            }

            resolve(symbols);
        });
    }
}


function registerProviders(Context: vscode.ExtensionContext, knownVariables: any) {
    let subscriptions = Context.subscriptions;
    let langs = vscode.languages;


    subscriptions.push(langs.registerCompletionItemProvider("pml", new GeneralAttachedMethods()));
    if(subscriptions.length > 0) return;
    subscriptions.push(langs.registerCompletionItemProvider("pml", new DocumentMethods(), '!this.'));
    if(subscriptions.length > 0) return;
    subscriptions.push(langs.registerDocumentSymbolProvider("pml", new PmlDocumentSymbolProvider()));
    if(subscriptions.length > 0) return;

    subscriptions.push(langs.registerCompletionItemProvider("pml", new GeneralMethods()));
    // subscriptions.push(langs.registerCompletionItemProvider("pml", new VariableMethods(parseKeys())));

}


function registerCommands(Context: vscode.ExtensionContext) {
    let subscriptions = Context.subscriptions;
    let langs = vscode.languages;

    subscriptions.push(Uglifier);
}

class DocumentMethods {

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {

        let methods: Array<vscode.CompletionItem> = [];
        if (!document.lineAt(position.line).text.replace( /(\s*)/g,"").startsWith('!this.'))
            return methods;
        for (var i = 0; i < document.lineCount; i++) {
            var line = document.lineAt(i);

            let lineTrimmed: string = line.text.trim();
            if (lineTrimmed.includes('$*')) lineTrimmed=lineTrimmed.split('$')[0].trim();
            if (lineTrimmed.toLowerCase().startsWith("define method .")) {
                let attName = line.text.substr(15);
                let  methodname:string = attName.split('(')[0];
                let  input:string = attName.split('(')[1].split(')')[0].trim();
                let  output:string = attName.split(')')[1].trim();
                let seqnum:number = 1;
                if(input!=''){
                    if(input.split(',').length>2){
                        attName = methodname + '( ${1:' + input + '} )';
                    }
                    else{
                        attName = methodname + '( ${1:' + input.split(',')[0].trim() + '}';
                        for( var j=1;j<input.split(',').length;j++){
                            let num:number = j + 1;
                            attName = attName + ' , ${'+num.toString()+':' + input.split(',')[j].trim() + '}';
                            seqnum  = j + 1;
                        }
                        attName = attName + ' )';
                    }
                }
                else  attName = methodname + '()';
                if(output!=''){
                    attName += ' {' + seqnum.toString() + ':' + output + '}';
                }

                methods.push(new vscode.CompletionItem(methodname, vscode.CompletionItemKind.Method));
                methods[methods.length-1].insertText= new vscode.SnippetString(attName);
            }

        }

        return methods;

    }
}


class GeneralAttachedMethods {
    variables: any;
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let type:string = "";
        var cont = document.lineAt(position.line).text;
        let variableName = cont.substring(0,position.character - 1);
        if (!cont.substring(0,position.character ).endsWith('.')) return;
        if(variableName.toLowerCase().endsWith(')'))
            type = methodtable.filter( methods => chkmethod(variableName, methods.name.trim().toLowerCase()))[0].object;
        else if(/!\w+$/g.test(variableName.toLowerCase().replace('this.','')))
            type =parseKeys().filter( variable => variableName.toLowerCase().replace('this.','').endsWith('!'+variable.name))[0].type;
        else
            type = attributetable.filter( methods => chkatt(variableName, methods.name.trim().toLowerCase()))[0].object;
        
        const filteredMethods = dictionary.filter(methods => methods.library.toLowerCase() === type.toLowerCase());
        let Methods = (filteredMethods[0].methods).map(method => {

            let item = new vscode.CompletionItem(method.label, vscode.CompletionItemKind.Method);

            if (method.snippet) {
                item.insertText = new vscode.SnippetString(method.snippet);
            }

            if (method.md) {
                item.documentation = new vscode.MarkdownString(method.md);
            }

            return item;

        });
        return Methods;


    }
}


class GeneralMethods {

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        
        var cont = document.lineAt(position.line).text;
        let variableName = "";
        for( let i = 0; i<cont.length ;i++ )
        {
            let strnum = cont.length - 2 - i;
            if( cont.substring(strnum,strnum+1)=="!") break;
            variableName = cont.substring(strnum,strnum+1) + variableName;
        }
        if (variableName.toLowerCase().replace('this.','').includes('.')) return;
        else if (variableName.toLowerCase()==='this')return;
        var variables:varString[]=parseKeys();
        let vatype = variables.filter( variable => variable.name === variableName.toLowerCase().replace('this.',''));
        const filteredGeneralMethods = dictionary.filter(methods => methods.library.toLowerCase() === vatype[0].type.toLowerCase());
        let Methods = (filteredGeneralMethods[0].methods).map(method => {

            let item = new vscode.CompletionItem(method.label, vscode.CompletionItemKind.Method);

            if (method.snippet) {
                item.insertText = new vscode.SnippetString(method.snippet);
            }

            if (method.md) {
                item.documentation = new vscode.MarkdownString(method.md);
            }

            return item;

        });

        return Methods;
    }
}

class VariableMethods {

    variables: any;

    constructor(variables: any) {
        this.variables = variables;
        console.log(variables[0].name);
    }

    provideCompletionItems() {
        this.variables=parseKeys();
        return this.variables.map((variable: { name: string; }) => {
            return new vscode.CompletionItem("!" + variable.name, vscode.CompletionItemKind.Variable);
        });
    }
}

class varString{ name: string=""; type: string = ""; from: Number=0   ; to: Number| null=null; global: Boolean=false;}
function parseKeys():varString[] {
    var aa :varString[] = [];
    if (!vscode.window.activeTextEditor) return aa; // no editor
    
    let {
        document
    } = vscode.window.activeTextEditor;

    var lines = document.lineCount;

    var varString: varString;
    var variables: any[] = [];
    let objectlist = dictionary.map(dic=>dic.library);
    for (let l = 0; l < lines; l++) {
        var lineContent = document.lineAt(l).text
        //replace consecutive spaces with one space
        lineContent = lineContent.replace(/[ ]{2,}/g, '');
        if (lineContent.includes('=')&&!lineContent.includes(' =')) lineContent = lineContent.replace("=", " =");
        var lineCompressed = lineContent.toLowerCase().replace( /(\s*)/g,"");
        if(lineCompressed.includes('$*')) lineCompressed = lineCompressed.split('$')[0];
        if (lineCompressed=="") continue;
        // Disregards commented lines
        if (!lineContent.startsWith('--')) {
            var regex = /(?:^|[^!])!+(\w+)/g;
            var regexmem = /member.\w+/g;
            var match;
            var type = "";
            var from = 0;
            var global;
            if (lineCompressed.toLowerCase().startsWith('define ') || lineContent.toLowerCase().startsWith('endmethod')) {

                variables.forEach(function (variable) {

                    //set "unclosed" variables valid until here
                    if (variable.to === null) {
                        variable.to = l;
                    }

                });

            }
            while(match = regexmem.exec(lineCompressed))
            {
                if(match)
                {
                    var variableName = match[0]
                    var filterredObject = objectlist.filter(objects=>
                        lineCompressed.includes( variableName )
                        &&variableName.endsWith('is'+objects.toLowerCase())
                        );
                    if (filterredObject.length > 0) type = filterredObject[0]
                    variables = AssignVar( variableName.replace('member.','').replace('is'+type.toLowerCase(),''),type , from , lines ,true, variables);
                }
            }
            while (match = regex.exec(lineContent.toLowerCase().replace('this.' , ''))) {
                if (match) {

                    var to = null;
                    from = l;
                    var variableName = match[1].toLowerCase().replace( /(\s*)/g,"");
                    //set the global variable valid up to the end of the file
                    if (lineContent.includes('!!' + match[1])) {
                        global = true;
                        to = lines;
                    } else {
                        global = false;
                    }

                    var ArrayRegex = new RegExp("!" + match[1].toLowerCase() + "\\[\\$*!*\\w*\\d*\\]", 'g');
                    var RealRegex = new RegExp("!" + match[1].toLowerCase() + "\\s*=\\s*\\d+$", 'g');
                    var filterredObject = objectlist.filter(objects=>
                        lineCompressed.includes( '!' + variableName + '=object' + objects.toLowerCase() + '(')
                        ||lineCompressed.includes( '!' + variableName + 'is' +objects.toLowerCase())
                        ||lineCompressed.includes( 'member.' + variableName + 'is' +objects.toLowerCase())
                        );
                    if (filterredObject.length > 0) type = filterredObject[0];

                    if( type == "")
                    {
                        if (lineCompressed.includes('!' + variableName + '=array(')
                        || /=\s*!!collectall\w+\s*\([\s|\w,'()!*]*\)$/g.test(lineCompressed)
                        || (lineCompressed.startsWith('!' + variableName + '=')&&methodtable.filter(method=>method.object.toLocaleLowerCase()=="array"&&chkmethod(lineCompressed,method.name)).length>0)
                        || (lineCompressed.startsWith('!' + variableName + '=')&&attributetable.filter(attribute=>attribute.object.toLocaleLowerCase()=="array"&&chkatt(lineCompressed,attribute.name.toLocaleLowerCase())).length>0)
                        || ArrayRegex.exec(lineCompressed)
                        || lineCompressed.includes('var!' + variableName + 'coll')
                        || lineCompressed.includes('var!' + variableName + 'eval')
                        ) {
                            type = "array";
                        }
                        else if (lineCompressed.includes('!' + variableName + '=true')
                        || lineCompressed.includes('!' + variableName + '=false')
                        || (lineCompressed.startsWith('!' + variableName + '=')&&methodtable.filter(method=>method.object.toLocaleLowerCase()=="boolean"&&chkmethod(lineCompressed,method.name)).length>0)
                        || (lineCompressed.startsWith('!' + variableName + '=')&&attributetable.filter(attribute=>attribute.object.toLocaleLowerCase()=="boolean"&&chkatt(lineCompressed,attribute.name.toLocaleLowerCase())).length>0)
                        ) {
                            type = "boolean";
                        }
                        else if (lineCompressed.includes('!' + variableName + 'isstring')
                        || lineCompressed.includes(variableName + "='")
                        || lineCompressed.includes(variableName + "=|")
                        || lineCompressed.includes(variableName + "=string")
                        || lineCompressed.includes(variableName + "=nam")
                        || (lineCompressed.startsWith('!' + variableName + '=')&&methodtable.filter(method=>method.object.toLocaleLowerCase()=="string"&&chkmethod(lineCompressed,method.name)).length>0)
                        || (lineCompressed.startsWith('!' + variableName + '=')&&attributetable.filter(attribute=>attribute.object.toLocaleLowerCase()=="string"&&chkatt(lineCompressed,attribute.name.toLocaleLowerCase())).length>0)
                        || lineCompressed.includes('var!' + variableName)
                        ) {
                            type = "string";
                        }
                        else if (lineCompressed.includes('!' + variableName + 'isgadget')) {
                            type = "gadget";
                        }
                        else if (lineCompressed.includes('!' + variableName + 'isreal')
                        || RealRegex.exec(lineContent)
                        ||lineCompressed.includes('!' + variableName + 'real')
                        || (lineCompressed.startsWith('!' + variableName + '=')&&methodtable.filter(method=>method.object.toLocaleLowerCase()=="real"&&chkmethod(lineCompressed,method.name)).length>0)
                        || (lineCompressed.startsWith('!' + variableName + '=')&&attributetable.filter(attribute=>attribute.object.toLocaleLowerCase()=="real"&&chkatt(lineCompressed,attribute.name.toLocaleLowerCase())).length>0)
                        ) {
                            type = "real";
                        }
                        else if (lineCompressed.includes('!' + variableName + 'isany')) {
                            type = "any";
                        }
                        else if (lineCompressed.includes('!' + variableName + '=currentproject')) {
                            type = "project";
                        }
                        else if ((lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith(".position"))
                        || (lineCompressed.startsWith('!' + variableName + '=')&&methodtable.filter(method=>method.object.toLocaleLowerCase()=="position"&&chkmethod(lineCompressed,method.name)).length>0)
                        || (lineCompressed.startsWith('!' + variableName + '=')&&attributetable.filter(attribute=>attribute.object.toLocaleLowerCase()=="position"&&chkatt(lineCompressed,attribute.name.toLocaleLowerCase())).length>0)
                        ||(lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith(".pos.wrt(world)"))
                        ||(lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith(".pos"))
                        ||(lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith("isposition"))
                        ||(lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith("startwrt/*"))
                        ||(lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith("endwrt/*"))
                        ||(lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith("poswrt/*"))
                        ||(lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith("posewrt/*"))
                        ||(lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith("posswrt/*"))
                        ) {
                            type = "position";
                        }
                        else if ( lineCompressed.includes(variableName + "=ce")
                        || lineCompressed.includes(variableName + "=ref")
                        || lineCompressed.includes(variableName + "=/")
                        || (lineCompressed.startsWith('!' + variableName + '=')&&methodtable.filter(method=>method.object.toLocaleLowerCase()=="dbref"&&chkmethod(lineCompressed,method.name)).length>0)
                        || (lineCompressed.startsWith('!' + variableName + '=')&&attributetable.filter(attribute=>attribute.object.toLocaleLowerCase()=="dbref"&&chkatt(lineCompressed,attribute.name.toLocaleLowerCase())).length>0)
                        || (lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith("!!ce"))
                        || lineCompressed.includes(variableName + "=own")
                        || lineCompressed.includes(variableName + "=pre")
                        || lineCompressed.includes(variableName + "=site")
                        || lineCompressed.includes(variableName + "=zone")
                        || lineCompressed.includes(variableName + "=rest")
                        || lineCompressed.includes(variableName + "=stru")
                        || lineCompressed.includes(variableName + "=hang")
                        || lineCompressed.includes(variableName + "=nex")
                        || /=\s*!!collectall\w*\s*\([\s|\w,'()!?*]*\)\[\$*!*\d*\w*\]$/g.test(lineCompressed)
                        || lineCompressed.includes(variableName + "=dbref(")
                        ){
                            type = "DBRef";
                        }
                        else if ( lineCompressed.includes(variableName + "=orientation'")
                        || (lineCompressed.startsWith('!' + variableName + '=')&&methodtable.filter(method=>method.object.toLocaleLowerCase()=="orientation"&&chkmethod(lineCompressed,method.name)).length>0)
                        || (lineCompressed.startsWith('!' + variableName + '=')&&attributetable.filter(attribute=>attribute.object.toLocaleLowerCase()=="orientation"&&chkatt(lineCompressed,attribute.name.toLocaleLowerCase())).length>0)
                        || (lineCompressed.startsWith('!' + variableName + '=')&&lineCompressed.endsWith("orientation"))
                        || lineCompressed.includes(variableName + "=own")
                        || lineCompressed.includes(variableName + "=pre")
                        || lineCompressed.includes(variableName + "=nex")
                        || lineCompressed.includes(variableName + "=oriwrt")
                        || lineCompressed.includes(variableName + "=orientationwrt")
                        ){
                            type = "orientation";
                        }
                        else if ( lineCompressed.includes(variableName + "=currentsession'")
                        ){
                            type = "session";
                        }
                    }
                    variables = AssignVar( variableName ,type , from , to ,global, variables);
                }
            }
            while (match = regex.exec(lineContent)) {
                if (match && match[1] != "this") {
                    var to = null;
                    from = l;
                    //set the global variable valid up to the end of the file
                    if (lineContent.includes('!!' + match[1])) {
                        global = true;
                        to = lines;
                    } else {
                        global = false;
                    }
                    var variableName = match[1].toLowerCase().replace( /(\s*)/g,"");
                    var findvarialbe  = variables.filter(variable => (variable.name === variableName));
                    if ( lineCompressed.includes('=!')&& findvarialbe[0].type==""&& !lineCompressed.includes('=!this'))
                    {
                        var getva = lineContent.replace( ' = ' , '=' ).split('=')[1].split( ' ')[0].replace('!' ,'').replace('!' ,'')
                        var findContainedVarialbe  = variables.filter(variable => (variable.name === getva.toLowerCase()));
                        if(findContainedVarialbe.length==0) continue;
                        varString = {
                            name: variableName,
                            type: findContainedVarialbe[0].type,
                            from: findvarialbe[0].from,
                            to: findvarialbe[0].to,
                            global:findvarialbe[0].global
                        };
                        var filterTo = variables.filter(variable => (variable.name === varString.name && variable.to === varString.to));
                        var varindex = variables.map(variable => variable.name).indexOf(varString.name);
                        variables[varindex] = varString;
                    }
                }

            }

        }

    }

    var Recognized = variables.filter(variable => (variable.type !== null));

    return Recognized;
}
function AssignVar( variableName: string , type: string , from : Number , to : any , global: boolean , variables : varString[]){
    var resultvariable:varString[] = variables;
    var varString: { name: string, type: string, from: Number, to: Number | null, global: Boolean };
    varString = {
        name: variableName,
        type: type,
        from: from,
        to: to,
        global: global
    };

    var filterTo = resultvariable.filter(variable => (variable.name === varString.name && variable.to === varString.to));

    if (filterTo.length === 0) {
        resultvariable.push(varString);
    }


    if (type !== null && type !=="") {
        resultvariable.forEach(function (variable) {
            if (variable.name === varString.name && (variable.type === null||variable.type === "")) {
                variable.type = type;
            }
        });
    }
    return resultvariable;
}
function chkmethod( line :string , attName : string ) : boolean {
    let result:boolean = false;
    let bracketR:number = 0;
    let bracketL:number = 0;
    let modifiedLine:string = line.toLowerCase().replace(/\s+/g, "");
    
    if(!modifiedLine.endsWith(')'))
        return result;
    for(let i = 0; i < modifiedLine.length; i++)
    {
        let character = modifiedLine.charAt(modifiedLine.length -1 - i);
        if(character=='(') bracketL++;
        else if(character==')') bracketR++;
        if(bracketL==bracketR){
            let chkstring = modifiedLine.substring(0,modifiedLine.length -1 - i);
            result = modifiedLine.substring(0,modifiedLine.length -1 - i).endsWith('.'+attName.toLowerCase());
            break;
        }
    }
    return result;
}
function chkatt( line :string , attName : string ) : boolean {
    let result:boolean = false;
    let bracketR:number = 0;
    let bracketL:number = 0;
    let modifiedLine:string = line.toLowerCase().replace(/\s+/g, "");
    var chkatt = /[a-zA-Z]$/g;
    if(!chkatt.test(modifiedLine)) return result;
    return modifiedLine.endsWith('.' + attName.toLocaleLowerCase());
}
function endsWithAny(suffixes: any, string: string, delim: string) {
    for (let suffix of suffixes) {
        if (string.endsWith(suffix + delim))
            return true;
    }
    return false;
}