'use strict';

import * as vscode from 'vscode';
import Uglifier from './Uglifier'
import methodtable from './methodtable.json'
import attributetable from './attributetable.json'
import dictionary from './dictionary.json'
import dictionary_inhouse from './dictionary_inhouse.json'
// var dic = Object.assign(dictionary,dictionary_inhouse)
var dic:any = dictionary
class varString{ name: string=""; type: string = ""; from: Number=0   ; to: Number| null=null; global: Boolean=false;}
var variables:varString[]=parseKeys(1);
var objectlist:[];


export function activate(Context: vscode.ExtensionContext) {

    // vscode.workspace.onDidChangeTextDocument(parseKeys);
    dictionary_inhouse.forEach(function(im){
        dic.push(im);
    });
    objectlist = (dic as any).map((dic: { library: any; })=>dic.library.toLowerCase());
    registerProviders(Context, parseKeys(1));
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

    subscriptions.push(langs.registerCompletionItemProvider("pml", new GetObjectList(),'.' , ''));
    subscriptions.push(langs.registerCompletionItemProvider("pml", new Getlist()));
    subscriptions.push(langs.registerDocumentSymbolProvider("pml", new PmlDocumentSymbolProvider() ));
    

}
class Getlist{
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let methods: Array<vscode.CompletionItem> = [];
        // methods.push(new vscode.CompletionItem('ehdgnsdl', vscode.CompletionItemKind.Method));
        // methods[methods.length-1].insertText= new vscode.SnippetString('ehdgnsdlgmgma');
        return methods;
    }
}

function registerCommands(Context: vscode.ExtensionContext) {
    let subscriptions = Context.subscriptions;
    let langs = vscode.languages;

    subscriptions.push(Uglifier);
}
class GetObjectList{
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let methods: Array<vscode.CompletionItem> = [];
        methods = DocumentMethods(document,position,token,context);
        if ( methods.length!=0)return methods;
        variables=parseKeys(position.line);
        methods = GeneralMethods(document,position,token,context , variables);
        if ( methods.length!=0)return methods;
        methods = GeneralAttachedMethods(document,position,token,context,variables);
        return methods;
    }
}
function DocumentMethods(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
    let methods: Array<vscode.CompletionItem> = [];
    if (!document.lineAt(position.line).text.replace( /(\s*)/g,"").startsWith('!this.')||!document.lineAt(position.line).text.toLocaleLowerCase().substring(0,position.character - 1).endsWith('!this'))
        return methods;
    var lines = document.getText().split('\n')
    .filter(le =>
        le.trim().toLowerCase().replace( /(\s*)/g,"").startsWith('definemethod.')||le.trim().toLowerCase().replace( /(\s*)/g,"").startsWith('member.'))
        .map(le=>le.trim().toLowerCase().replace( '  ' , ' ').replace( '\r' ,''));

    for (var i = 0; i < lines.length; i++) {
        var lineTrimmed = lines[i];
        if (lineTrimmed.includes('$*')) lineTrimmed=lineTrimmed.split('$')[0].trim();
        if (lineTrimmed.toLowerCase().startsWith("define method .")) {
            let attName = lineTrimmed.substr(15);
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
                attName += '${' + seqnum.toString() + ':' + output + '}';
            }
            methods.push(new vscode.CompletionItem(methodname, vscode.CompletionItemKind.Method));
            methods[methods.length-1].insertText= new vscode.SnippetString(attName);
        }
        else if (lineTrimmed.toLowerCase().startsWith("member .")){
            let attName:string = lineTrimmed.split( '.')[1].split( ' ')[0].trim();
            methods.push(new vscode.CompletionItem(attName, vscode.CompletionItemKind.Field));
            methods[methods.length-1].insertText= new vscode.SnippetString(attName);
        }
    }
    return methods;
}


function GeneralAttachedMethods(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext,variables:varString[]) {

    let Methods: Array<vscode.CompletionItem> = [];
    let type:string = "";
    var cont = document.lineAt(position.line).text;
    let variableName = cont.substring(0,position.character - 1);
    if (!cont.substring(0,position.character ).endsWith('.')) return Methods;
    if(variableName.toLowerCase().endsWith(')')){
        var temptype = methodtable.filter( methods => chkmethod(variableName, methods.name.trim().toLowerCase()));
        if(temptype.length==0){
            type = variables.filter(methods => chkmethod(variableName.toLowerCase(), methods.name.trim().toLowerCase()))[0].type;
        }
        else
            type = temptype[0].object;
    }
    else if(/!\w+$/g.test(variableName.toLowerCase().replace('this.',''))&&(!variableName.toLowerCase().replace('this','').endsWith('!')))
        type =variables.filter( variable => variableName.toLowerCase().replace('this.','').endsWith('!' + variable.name.toLowerCase()))[0].type;
    else
        type = attributetable.filter( methods => chkatt(variableName.toLowerCase(), methods.name.trim().toLowerCase()))[0].object;

    let filteredMethods = (dic as any).filter((methods: { library: string; }) => methods.library.toLowerCase() === type.toLowerCase());
    Methods = (filteredMethods[0].methods).map((method: { label: string; snippet: string | undefined; md: string | undefined; }) => {
        let chkmethod =  method.snippet?.includes('(');
        let item = new vscode.CompletionItem(method.label, chkmethod?vscode.CompletionItemKind.Method:vscode.CompletionItemKind.Field);
        if (method.snippet)
            item.insertText = new vscode.SnippetString(method.snippet);
        if (method.md)
            item.documentation = new vscode.MarkdownString(method.md);
        return item;
    });
    return Methods;


}

function GeneralMethods(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext ,variables:varString[]) {
    var cont = document.lineAt(position.line).text;
    let Methods: Array<vscode.CompletionItem> = [];
    let variableName = "";
    for( let i = 0; i<cont.length ;i++ )
    {
        let strnum = cont.length - 2 - i;
        if( cont.substring(strnum,strnum+1)=="!") break;
        variableName = cont.substring(strnum,strnum+1) + variableName;
    }
    if (variableName.toLowerCase().replace('this.','').includes('.')) return Methods;
    else if (variableName.toLowerCase()==='this')return Methods;
    let vatype = variables.filter( variable => variable.name.toLowerCase() === variableName.toLowerCase().replace('this.',''));
    if(vatype.length==0) return Methods;
    const filteredGeneralMethods = (dic as any).filter((methods: { library: string; }) => methods.library.toLowerCase() === vatype[0].type.toLowerCase());
    if(filteredGeneralMethods.length==0) return Methods;
    Methods = (filteredGeneralMethods[0].methods).map((method: { label: string; snippet: string | undefined; md: string | undefined; }) => {
        let chkmethod =  method.snippet?.includes('(');
        let item = new vscode.CompletionItem(method.label, chkmethod?vscode.CompletionItemKind.Method:vscode.CompletionItemKind.Field);
        if (method.snippet)
            item.insertText = new vscode.SnippetString(method.snippet);
        if (method.md)
            item.documentation = new vscode.MarkdownString(method.md);
        return item;
    });
    return Methods;
}

function contains(target:string, pattern: any[]){
    let value:boolean = false;
    pattern.forEach(function(word){
        if(target.includes(word)){
            return true;
        }
        else
            value = value;
    });
    return value;
}
function starts(target:string, pattern: any[]){
    let value:boolean = false;
    pattern.forEach(function(word){
        if( new RegExp("\^\\s*" + word , 'gi').test(target)){
            value = true;
        }
        else
            value = value;
    });
    return value;
}
function HasMember(line:string, ObjectList: string | any[]){
    let result:string = '';
    for( let i = 0; i<ObjectList.length;i++)
    {
        if(line.endsWith( 'is' + ObjectList[i]))
        return ObjectList[i];
    }
    return result;
}
function GetObject(line:string , variableName:string, ObjectList: string | any[]){
    let result:string = '';
    for( let i = 0; i<ObjectList.length;i++)
    {
        if(line.includes( '!' + variableName + 'is'+ObjectList[i])
        ||line.startsWith( '!' + variableName + '='+ObjectList[i])
        ||line.startsWith( '!' + variableName + '=object'+ObjectList[i]+'('))return ObjectList[i];
    }
    return result;
}
function HasVarialbe(line:string, variable:string , ObjectList: string | any[]){
    let result:string = '';
    for( let i = 0; i<ObjectList.length;i++)
    {
        if(line.startsWith('!'+variable+'=')&&line.endsWith(ObjectList[i]))return ObjectList[i];
        else if(line.startsWith('!!'+variable+'=')&&line.endsWith(ObjectList[i]))return ObjectList[i];
    }
    return result;
}
function GetVariable(variableName:string,variables:varString[]){
    let result :varString = new varString;
    for( let i=0;i<variables.length;i++){
        if(variableName==variables[i].name) return variables[i];
    }
    return result;
}



function parseKeys(currentLineNo:number):varString[]{
    if(objectlist==undefined)objectlist = (dic as any).map((dic: { library: any; })=>dic.library.toLowerCase());
    var variables :varString[] = [];
    if (!vscode.window.activeTextEditor) return variables; // no editor
    let document:vscode.TextEditor = vscode.window.activeTextEditor;
    var varString: varString;
    const fil = ['--' , '\\$'  , '\\)\\$' , 'if' , 'handle' , 'endif' ,'endhandle' , 'usingname', 'else' , 'endif'  , 'exit' , 'finish' , 'enddo' ];
    var lines = document.document.getText().split('\n');
    let type:string = '';
    let variableName:string = '';
    var regex = /(?:^|[^!])!+(\w+)/g;
    
    //getMember of form or object
    for(let l in lines){
        let line = lines[l];
        if( !/^\s*member\s*\.[a-z][a-z0-9]*/gi.test(line)) continue;
        else if( /^\s*define\s*method\s*./gi.test(line)) break;
        

        if(/\$\*/gi.test(line))
            lineContent = line.replace(/\$\*[a-z 0-9.!@#$%^&*()_\-,<>/{}\\|";'?`~.+=]*/gi,'').replace(/\s+/g , ' ');
        else
            lineContent = line.replace(/\s+/g , ' ').trim();
        console.log(lineContent);
        type = '';
        variableName = '';
        
        let vs = /member\s*\.[a-z][a-z0-9]*/gi.exec(lineContent); if(vs==null) continue;
        variableName = vs[0].replace( /member\s*\./gi ,'');
        type = lineContent.replace(new RegExp("\\s*member\\s*\\." + variableName + "\\s*is\\s*",'gi')  , '').trim().toLowerCase();
        if(objectlist.some((objectname: string)=>objectname==type.toLowerCase() ))
        {
            variables = AssignVar( variableName ,type , 0 , 1000 ,true, variables);
        }
    }
    //getMember of form or object
    var getmethod = lines.filter(line=>/^\s*define\s*method\s*\.[a-z][a-z0-9]*\s*\(/gi.test(line)).map(ll=>{
        return ll.replace( /\\r/gi ,'').replace(/\s+/gi , ' ').replace(/\$\*[a-z 0-9.!@#$%^&*()_\-,<>/{}\\|";'?`~.+=]*/gi,'').trim();
    });
    for(let i=0;i<getmethod.length;i++){
        var input = getmethod[i].split('(')[1].split(')')[0];
        var output = getmethod[i].split(')')[1];
        console.log(getmethod[i]);
        if(input.trim()!=''){
            var inputList = input.split(',');
            for(let l=0;l<inputList.length;l++){
                type = '';
                var variable = inputList[l].trim().split(' ')[0].replace('!','').trim();
                type = inputList[l].trim().split(' ')[2].replace('!','').trim().toLowerCase();
                if(objectlist.some((objectname: string)=>objectname==type.toLowerCase() ))
                    variables = AssignVar( variable ,type , 0 , 1000 ,true, variables);
            }
        }
        if(output!='')
        {
            type = '';
            var variable = getmethod[i].replace( /^\s*define\s*method\s*./gi , '').split('(')[0];
            type =  getmethod[i].split(')')[1].trim().split(' ')[1].toLowerCase();
            if( type!=''){
                variables = AssignVar( variable ,type , 0 , 1000 ,true, variables);
            }
        }
    }

    //in method to upper
    for(let i=currentLineNo ;i<lines.length;i++){
        if(/^\s*define\s*method\s*.[a-z]*/gi.test(lines[i])||/^\s*endmethod\s*/gi.test(lines[i])) break;
        if(starts(lines[i] , fil) || /^[\s]*$/gi.test(lines[i])) continue;
        var lineContent = lines[i];
        console.log(lineContent);
        let vs = /^\s*[!]*![a-z][a-z0-9]*[ =	]/gi.exec(lineContent);
        if(vs==null) continue;
        let variable = vs[0].replace(/!*/gi,'').replace(/\s*/g,'');
        type = GetType(lineContent,variable.toLowerCase());
        variables = AssignVar( variable ,type , 0 , document.document.lineCount ,/^!!/g.test(vs[0]), variables);
    }
    //in method to upper
    //in method to lower
    for(let i=currentLineNo ;i>0;i--){
        if(/^\s*define\s*method\s*.[a-z]*/gi.test(lines[i])||/^\s*endmethod\s*/gi.test(lines[i])) break;
        if(starts(lines[i] , fil) || /^[\s]*$/gi.test(lines[i])) continue;
        var lineContent = lines[i];
        let vs = /^\s*[!]*![a-z][a-z0-9]*[ =	]/gi.exec(lineContent);
        if(vs==null) continue;
        let variable = vs[0].replace(/!*/gi,'').replace(/\s*/g,'');
        type = GetType(lineContent,variable.toLowerCase());
        variables = AssignVar( variable ,type , 0 , document.document.lineCount ,/^!!/g.test(vs[0]), variables);
    }
    //in method to lower

    return variables;
}


function GetType(line:string,variableName:string){
    let type:string ='';
    let lineContent = line.replace( /\s*/gi , '').toLowerCase();
    var ArrayRegex = new RegExp("!" +variableName + "\\[\\$*!*\\w*\\d*\\]", 'g');
    var RealRegex = new RegExp("!" + variableName + "\\s*=\\s*\\d+$", 'g');
    type = GetObject(lineContent,variableName,objectlist);

    if( type == '')
    {
        if (/=\s*!!collectall\w+\s*\([\s|\w,'()!*]*\)$/g.test(lineContent)
        || (lineContent.startsWith('!' + variableName + '=')&&methodtable.some(method=>method.object.toLocaleLowerCase()=="array"&&chkmethod(lineContent,method.name)))
        || (lineContent.startsWith('!' + variableName + '=')&&attributetable.some(attribute=>attribute.object.toLocaleLowerCase()=="array"&&chkatt(lineContent,attribute.name.toLocaleLowerCase())))
        || ArrayRegex.exec(lineContent)
        || lineContent.includes('var!' + variableName + 'coll')
        || lineContent.includes('var!' + variableName + 'eval')
        ) {
            type = "array";
        }
        else if (lineContent.includes('!' + variableName + '=true')
        || lineContent.includes('!' + variableName + '=false')
        || (lineContent.startsWith('!' + variableName + '=')&&methodtable.some(method=>method.object.toLocaleLowerCase()=="boolean"&&chkmethod(lineContent,method.name)))
        || (lineContent.startsWith('!' + variableName + '=')&&attributetable.some(attribute=>attribute.object.toLocaleLowerCase()=="boolean"&&chkatt(lineContent,attribute.name.toLocaleLowerCase())))
        ) {
            type = "boolean";
        }
        else if (lineContent.includes(variableName + "='")
        || contains(lineContent , [variableName + "=|"
        , variableName + "=string",
        variableName + "=nam",
        variableName + "=desc",
        variableName + "=purp",
        variableName + "=func",
        variableName + "=stext",
        variableName + "=type",
        variableName + "=fprop"])
        || (lineContent.startsWith('!' + variableName + '=')&&methodtable.some(method=>method.object.toLocaleLowerCase()=="string"&&chkmethod(lineContent,method.name)))
        || (lineContent.startsWith('!' + variableName + '=')&&attributetable.some(attribute=>attribute.object.toLocaleLowerCase()=="string"&&chkatt(lineContent,attribute.name.toLocaleLowerCase())))
        || lineContent.includes('var!' + variableName)
        ) {
            type = "string";
        }
        else if (lineContent.includes('!' + variableName + 'isgadget')) {
            type = "gadget";
        }
        else if (RealRegex.exec(lineContent)
        ||lineContent.includes('!' + variableName + 'real')
        || (lineContent.startsWith('!' + variableName + '=')&&methodtable.some(method=>method.object.toLocaleLowerCase()=="real"&&chkmethod(lineContent,method.name)))
        || (lineContent.startsWith('!' + variableName + '=')&&attributetable.some(attribute=>attribute.object.toLocaleLowerCase()=="real"&&chkatt(lineContent,attribute.name.toLocaleLowerCase())))
        ) {
            type = "real";
        }
        else if (lineContent.includes('!' + variableName + 'isany')) {
            type = "any";
        }
        else if (lineContent.includes('!' + variableName + '=currentproject')) {
            type = "project";
        }
        else if ((lineContent.startsWith('!' + variableName + '=')&&lineContent.endsWith(".position"))
        || (lineContent.startsWith('!' + variableName + '=')&&methodtable.some(method=>method.object.toLocaleLowerCase()=="position"&&chkmethod(lineContent,method.name)))
        || (lineContent.startsWith('!' + variableName + '=')&&attributetable.some(attribute=>attribute.object.toLocaleLowerCase()=="position"&&chkatt(lineContent,attribute.name.toLocaleLowerCase())))
        ||HasVarialbe(lineContent,variableName,['.pos.wrt(world)',
        '.pos',
        'isposition',
        'startwrt/*',
        'endwrt/*',
        'poswrt/*',
        'posewrt/*',
        'posswrt/*'])
        ){
            type = "position";
        }
        else if ( lineContent.includes(variableName + "=ce")
        || lineContent.includes(variableName + "=ref")
        || lineContent.includes(variableName + "=/")
        || (lineContent.startsWith('!' + variableName + '=')&&methodtable.some(method=>method.object.toLocaleLowerCase()=="dbref"&&chkmethod(lineContent,method.name)))
        || (lineContent.startsWith('!' + variableName + '=')&&attributetable.some(attribute=>attribute.object.toLocaleLowerCase()=="dbref"&&chkatt(lineContent,attribute.name.toLocaleLowerCase())))
        || (lineContent.startsWith('!' + variableName + '=')&&lineContent.endsWith("!!ce"))
        || contains( lineContent, [variableName + "=own",
        variableName + "=pre",
        variableName + "=site",
        variableName + "=zone",
        variableName + "=rest",
        variableName + "=stru",
        variableName + "=dbref(",
        variableName + "=hang",
        variableName + "=spref",
        variableName + "=catref",
        variableName + "=nex"])
        || /=\s*!!collectall\w*\s*\([\s|\w,'()!?*]*\)\[\$*!*\d*\w*\]$/g.test(lineContent)
        ){
            type = "DBRef";
        }
        else if ( (lineContent.startsWith('!' + variableName + '=')&&methodtable.some(method=>method.object.toLocaleLowerCase()=="orientation"&&chkmethod(lineContent,method.name)))
        || (lineContent.startsWith('!' + variableName + '=')&&attributetable.some(attribute=>attribute.object.toLocaleLowerCase()=="orientation"&&chkatt(lineContent,attribute.name.toLocaleLowerCase())))
        || lineContent.includes(variableName + "=ori")
        ){
            type = "orientation";
        }
        else if ( lineContent.includes(variableName + "=currentsession'")
        ){
            type = "session";
        }
    }
    return type;
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

    var filterTo = resultvariable.filter(variable => (variable.name.toLowerCase() === varString.name.toLowerCase() && variable.to === varString.to));

    if (filterTo.length === 0) {
        resultvariable.push(varString);
    }


    if (type !== null && type !=="") {
        resultvariable.forEach(function (variable) {
            if (variable.name.toLowerCase() === varString.name.toLowerCase() && (variable.type === null||variable.type === "")) {
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
    let bracketCom1:number = 0;
    let bracketCom2:number = 0;
    let modifiedLine:string = line.toLowerCase().replace(/\s+/g, "");
    if(!modifiedLine.endsWith(')'))
        return result;
    for(let i = 0; i < modifiedLine.length; i++)
    {
        let character = modifiedLine.charAt(modifiedLine.length -1 - i);
        if(character=="'"&&bracketCom1==0) bracketCom1=1;
        else if(character=="'"&&bracketCom1==1) bracketCom1=0;
        else if(character=="|"&&bracketCom2==0) bracketCom2=1;
        else if(character=="|"&&bracketCom2==1) bracketCom2=0;
        if(bracketCom1==1||bracketCom2==1)continue;

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