'use strict';

import * as vscode from 'vscode';
import Uglifier from './Uglifier'
import methodtable from './methodtable.json'
import attributetable from './attributetable.json'
import dictionary from './dictionary.json'
import dictionary_inhouse from './dictionary_inhouse.json'
import * as functions from './functions'
var dic:any = dictionary
class varString{ name: string=""; type: string = ""; from: Number=0   ; to: Number| null=null; global: Boolean=false;}
var variables:varString[]=[];
var objectlist:string[];
var line:number;
let FileType:{Form:boolean,Func:boolean,Object:boolean} ={Form:false,Func:false,Object:false}; // False면 Object
let FileName = '';

export function activate(Context: vscode.ExtensionContext) {

    // vscode.workspace.onDidChangeTextDocument(parseKeys);
    dictionary_inhouse.forEach(function(im){
        dic.push(im);
    });
    objectlist = (dic as any).map((dic: { library: string; })=>dic.library.toLowerCase());
    registerProviders(Context, variables);
    registerCommands(Context)
    Context.subscriptions.push(
        vscode.languages.registerSignatureHelpProvider(
            'pml', new PmlSignatureHelpProvider(),'(' ,','));
}
function registerCommands(Context: vscode.ExtensionContext) {
    let subscriptions = Context.subscriptions;
    let langs = vscode.languages;
    subscriptions.push(Uglifier);
}

function registerProviders(Context: vscode.ExtensionContext, knownVariables: any) {
    let subscriptions = Context.subscriptions;
    let langs = vscode.languages;
    subscriptions.push(langs.registerCompletionItemProvider("pml", new GetObjectList(),'.' , ''));
    subscriptions.push(langs.registerDocumentSymbolProvider("pml", new PmlDocumentSymbolProvider() ));
}
class PmlSignatureHelpProvider implements vscode.SignatureHelpProvider {
    public provideSignatureHelp(
        document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):
        Thenable<vscode.SignatureHelp> {
            if(line!=position.line)
                variables=get_AllVariables(position.line);
            line = position.line;
            let a = new vscode.SignatureHelp();
            // if(!isInnerBracket(document.lineAt(position.line).text.substring(0,position.character))){
            //     return resolve(a);
            // }
            let bracketSet:number[] = functions.GetPositionInterStringBracket(document.lineAt(position.line).text);
            let ArgInfo = functions.getCurrentStage(document.lineAt(position.line).text , position.character ,bracketSet);
            return new Promise((resolve)=>{
                let methodset:{ Type:string;Methods:string[] } = GetMethodOutputType(document,position,token,undefined,variables,true,bracketSet);
                let methods = methodset.Methods;
                // if(functions.Get_First_Variable_Name(document.lineAt(position.line).text.substring(0,position.character))){}
                let tempMethods:Array<vscode.SignatureInformation> = (dic.filter((lib: { library: string; })=>lib.library.toUpperCase()==methodset.Type.toUpperCase())[0].methods)
                        .filter((met: { label: string; })=>met.label.split('(')[0].toLowerCase()==methods[methods.length -1 ].toLowerCase()
                        &&(met.label.split(',').length>=ArgInfo.ArgumentNum+1//input 갯수가 2개 이상인 method
                            ||(ArgInfo.isEmpty&&met.label.split(',').length==ArgInfo.ArgumentNum) //인풋 입력란이 비었을 때, 모든 method
                            ||(!ArgInfo.isEmpty&&!/\(\s*\)/gi.test(met.label)&&met.label.split(',').length>=ArgInfo.ArgumentNum))) // 인풋 입력란이 작성되었을 때, 변수가 1개 이상인 method
                        .map((method: { label: string; snippet: string ; md: string ; }) => {
                        let item = new vscode.SignatureInformation(method.snippet.replace(/\$\{\s*\d*\s*\:/gi,'').replace(/\}/gi,''));
                        item.parameters = functions.getInputParameter(method.snippet , method.md , ArgInfo.CurrentArgumentStage-1);
                        item.parameters
                        return item;
                    });
                a.signatures = tempMethods;
                return resolve(a);
            });
    }
}
class PmlDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.SymbolInformation[]> {
        return new Promise((resolve, reject) => {
            var symbols: any[] = [];
            token = token;
            for (var i = 0; i < document.lineCount; i++) {
                var line = document.lineAt(i);
                let lineTrimmed: string = line.text.trim();
                if (/^\s*define\s*method\s*.[a-z]/gi.test(lineTrimmed)) {
                    symbols.push({
                        name: line.text.replace(/^\s*define\s*method\s*./gi,'').split('$')[0].replace(/\s*/g,''),
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
class GetObjectList{
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
        let methods: Array<vscode.CompletionItem> = [];
        let file = functions.GetFileName(document.getText().split('\n'));
        FileName = file.FileName;
        FileType.Form=file.Form;
        FileType.Func=file.Func;
        FileType.Object=file.Object;
        methods = Get_object_list_for_definition(document,position,token,context);
        if ( methods.length!=0)return methods;
        if(line!=position.line)
            variables=get_AllVariables(position.line);
        line = position.line;
        methods = Get_Attributes_Methods_of_Document(document,position,token,context);
        if ( methods.length!=0)return methods;
        methods = Get_Method_of_All_Variables(document,position,token,context,variables);
        return methods;
    }
}
function Get_object_list_for_definition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext){
    let methods: Array<vscode.CompletionItem> = [];
    let line = (document.lineAt(position.line).text.substring(0,position.character).trim());
    if (!(/![!]*[a-z][a-z0-9]*.*[a-z]*[a-z0-9]*\s*=\s*object\s*/gi.test(line))) return methods;
    for(var i = 0; i < objectlist.length;i++){
        methods.push(new vscode.CompletionItem(objectlist[i],vscode.CompletionItemKind.Class));
    }
    return methods;
}

function Get_Attributes_Methods_of_Document(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext) {
    let methods: Array<vscode.CompletionItem> = [];
    // if (!functions.contains( functions.Get_First_Variable_Name(document.lineAt(position.line).text.substring(0,position.character)),['this' , FileName]))
    let line = (document.lineAt(position.line).text.substring(0,position.character).trim());
    if ((document.lineAt(position.line).text.substring(0,position.character).trim())!='!this.'&&(document.lineAt(position.line).text.substring(0,position.character).trim())!= '!!'+FileName+'.')
        return methods;
    var lines = document.getText().split('\n');
    for (var i = 0; i < lines.length; i++) {
        if(!/^\s*define\s*method\s*\.[a-z][a-z0-9]*/gi.test(lines[i])&&!/^\s*member\s*\.[a-z][a-z0-9]*\s*is\s*/gi.test(lines[i])&&functions.GettingGadget(lines[i]).gadget=='') continue;
        let orilineTrimmed:string = lines[i].trim().replace( /\s+/g , ' ').replace( '\r' ,'');
        let lineTrimmed:string = orilineTrimmed;
        let desc:string = '';
        if (orilineTrimmed.includes('$*')) {
            lineTrimmed=orilineTrimmed.split('$')[0].trim();
            desc = orilineTrimmed.split('$')[1].trim();
        }
        if (/^\s*define\s*method\s*\.[a-z][a-z0-9]*/gi.test(lineTrimmed)) {
            let attName = lineTrimmed.replace(/^\s*define\s*method\s*\./gi,'').split('$')[0];
            let  methodname:string = attName.split('(')[0];
            
            methods.push(new vscode.CompletionItem(methodname, vscode.CompletionItemKind.Method));
            methods[methods.length-1].insertText= new vscode.SnippetString(methodname);
            if( desc==''){
                for(let p=1;p<20;p++){
                    if(!/^\s*--\s*description/gi.test(lines[i-p])) continue;
                    try{
                        desc = lines[i-p].split(':')[1].trim();
                    }
                    catch{}
                    for(let t=1;t<5;t++){
                        if(!/\s*--/g.test(lines[i-p+t]))continue;
                        else if(/-------/g.test(lines[i-p+t]))break;
                        desc += lines[i-p+t].replace(/^--\s*/g,'').trim();
                    }
                }
            }
            methods[methods.length-1].documentation = functions.SetMarkdown('(method) ' + attName ,desc);
        }
        else if (/^\s*member\s*\.[a-z][a-z0-9]*\s*is\s*/gi.test(lines[i])){
            let attName:string = lineTrimmed.split( '.')[1].split( ' ')[0].trim();
            let output:string =lineTrimmed.split( '.')[1].split( ' ')[2].split('$')[0].trim();
            methods.push(new vscode.CompletionItem(attName, vscode.CompletionItemKind.Field));
            methods[methods.length-1].insertText= new vscode.SnippetString(attName.split('(')[0]);
            methods[methods.length-1].documentation = functions.SetMarkdown('(member) ' + attName + ' : ' + output,desc);
        }
        else if(functions.GettingGadget(lines[i]).gadget!=''){
            let gadgetName = /\.[a-z][a-z0-9]*/gi.exec(lines[i]);
            if(gadgetName==null)continue;
            methods.push(new vscode.CompletionItem(gadgetName[0].substring(1),vscode.CompletionItemKind.Property))
            methods[methods.length-1].insertText= new vscode.SnippetString(gadgetName[0].substring(1));
            methods[methods.length-1].documentation = functions.SetMarkdown('(gadget ) ' + gadgetName[0].substring(1) ,functions.GettingGadget(lines[i]).formalName);
        }
    }
    if(FileType.Form){
        let mets = dic.filter((lib: { library: string; })=>/^form$/gi.test(lib.library))[0].methods;
        for(let i=0;i<mets.length;i++){
            let met = mets[i];
            let metname = /^[a-z0-9]*/gi.exec(met.label);
             if(metname!=null ){
                methods.push(new vscode.CompletionItem(metname[0],/\(/gi.test(met.label)?vscode.CompletionItemKind.Method:vscode.CompletionItemKind.Field));
                methods[methods.length-1].insertText = met.snippet;
                let nam = /\(/gi.test(met.label)?'member':'attribute';
                methods[methods.length-1].documentation = functions.SetMarkdown('( Form '+nam+') ' + met.label,met.md);
            }
        }
    }
    return methods;
}





function Get_Method_of_All_Variables(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext,variables:varString[]){
    let Methods: Array<vscode.CompletionItem> = [];
    let methodset:{ Type:string;Methods:string[] } = GetMethodOutputType(document,position,token,context,variables,false,functions.GetPositionInterStringBracket(document.lineAt(position.line).text));
    let type = methodset.Type;
    let methods:string[] = methodset.Methods;
    let methodlist:string[] = [];
    let tempMethods:Array<vscode.CompletionItem> = (dic.filter((lib: { library: string; })=>lib.library.toUpperCase()==type.toUpperCase())[0].methods)
        .filter((met: { label: string; })=>met.label.toLowerCase().startsWith(methods[methods.length -1 ].toLowerCase()))
        .map((method: { label: string; snippet: string ; md: string ; }) => {
        let chkmethod =  method.snippet?.includes('(');
        let item = new vscode.CompletionItem(method.label.split('(')[0], chkmethod?vscode.CompletionItemKind.Method:vscode.CompletionItemKind.Field);
        if (method.snippet){
            let methodName = method.snippet.split('(')[0];
            item.insertText = new vscode.SnippetString(methodName);
        }
        if (method.md)
            item.documentation = functions.getMarkDown(method);
            return item;
    });
    for(let k=0;k<tempMethods.length;k++){
        if(methodlist.some(mm=>mm==tempMethods[k].label.toLowerCase()))
            continue;
            methodlist.push(tempMethods[k].label.toLowerCase());
        Methods.push(tempMethods[k]);
    }
        Methods.push(new vscode.CompletionItem('Unset',vscode.CompletionItemKind.Method))
        Methods[Methods.length-1].insertText = new vscode.SnippetString('Unset')
        Methods[Methods.length-1].documentation = functions.SetMarkdown('(method ) Unset(): boolean', 'check is unset');
    return Methods;

}
function GetMethodOutputType(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext|undefined,variables:varString[],isInternalBracket:boolean,bracketSet:number[]):{ Type:string;Methods:string[] }{
    var cont = document.lineAt(position.line).text.substring(0,position.character);
    let code = "";
    let type = '';
    let bracket1 = 0; // (
    let bracket2 = isInternalBracket?1:0; // )
    for( let i = cont.length-1; i>=0 ;i-- )
    {
        if(bracketSet.includes(i))continue;
        let strnum = i;
        let cha = cont.substring(strnum ,strnum+1);
        if(cha=='(')  {bracket1++;continue;}
        if(cha==')')  {bracket2++;continue;}
        if(bracket1!=bracket2)continue;
        if( cha=="!"||cha==','||(bracket1>bracket2)) break;
        code = cha + code;
    }
    if (code.toLowerCase().replace('this.','')=='') type = FileType.Form ? 'form':'object';
    let isglobal:boolean = /this.[a-z]/gi.test(code.toLowerCase());
    let methods:string[] = code.toLowerCase().replace('this.','').split('.');
        if (methods.length<2) type;
    let initFilteredVar = variables.filter(varr=>varr.name.toLowerCase()==methods[0].toLowerCase()&&varr.global==isglobal);
    if(initFilteredVar.length>0)type=initFilteredVar[0].type;

    if(methods[0].toLowerCase()=='ce'){type = 'dbref';}
    for(let i=1;i<methods.length-1;i++){

        if(methods[i].toLowerCase()=='unset'){ type = 'boolean';continue;}
        let Atrribute_List = attributetable.filter(att=>att.name.toLowerCase()==methods[i].toLowerCase() && att.from.toLowerCase()==type.toLowerCase() );
        if(Atrribute_List.length==1) {type = Atrribute_List[0].object.toLowerCase();continue;}

        let Method_List = methodtable.filter(met=>met.name.toLowerCase()==methods[i].toLowerCase() && met.from.toLowerCase()==type.toLowerCase())
        if(Method_List.length==1) {type = Method_List[0].object.toLowerCase();continue;}

        let Object_List = dic.filter((dd: { library: string; })=>dd.library.toLowerCase()==type.toLowerCase());
        if(Object_List.length==0){type='';continue; }
        let getmethod = Object_List[0].methods.filter((dd: { label: string;snippet: string;md: string; })=>dd.label.toLowerCase().startsWith(methods[i].toLowerCase().split('(')[0]));
        if(getmethod.length==0){type='';continue; }
        let gettypes = objectlist.filter(object=>{
            return getmethod[0].snippet.toLocaleLowerCase().replace(/\s+/gi, '').endsWith(object.toLowerCase() + '}');
        });
        if(gettypes.length==0){type='';continue; }
        type = gettypes[0];
        console.log('varible : ' + methods[i] + ', type is ' + type)
    }
    let methodset:{ Type:string;Methods:string[] }={
        Type: '',
        Methods: []
    };
    methodset.Type = type;
    methodset.Methods = methods;

    return methodset;
}


function get_AllVariables(currentLineNo:number):varString[]{
    var variables :varString[] = [];
    
    if(objectlist==undefined)objectlist = (dic as any).map((dic: { library: any; })=>dic.library.toLowerCase());
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
        if( !/^\s*member\s*\.[a-z][a-z0-9]*/gi.test(line)&&functions.GettingGadget(line).gadget=='') continue;
        else if( /^\s*define\s*method\s*./gi.test(line)) break;
        

        if(/\$\*/gi.test(line))
            lineContent = line.replace(/\$\*[a-z 0-9.!@#$%^&*()_\-,<>/{}\\|";'?`~.+=]*/gi,'').replace(/\s+/g , ' ');
        else
            lineContent = line.replace(/\s+/g , ' ').trim();
        console.log(lineContent);
        type = '';
        variableName = '';
        
        let vs = /member\s*\.[a-z][a-z0-9]*/gi.exec(lineContent); 
        if(vs!=null){
            variableName = vs[0].replace( /member\s*\./gi ,'');
            type = lineContent.replace(new RegExp("\\s*member\\s*\\." + variableName + "\\s*is\\s*",'gi')  , '').trim().toLowerCase();
            if(objectlist.some((objectname: string)=>objectname==type.toLowerCase() ))
            {
                variables = AssignVar( variableName ,type , 0 , 1000 ,true, variables);
            }
        }
        else if(functions.GettingGadget(line).gadget!=''){
            let gadgetName = /\.[a-z][a-z0-9]*/gi.exec(line);
            if(gadgetName!=null){
                variables = AssignVar( gadgetName[0].substring(1) ,functions.GettingGadget(line).formalName , 0 , 1000 ,true, variables);
            }
        }
    }
    //getMember of form or object
    var get_Form_and_Object_Methods = lines.filter(line=>/^\s*define\s*method\s*\.[a-z][a-z0-9]*\s*\(/gi.test(line)).map(ll=>{
        return ll.replace( /\\r/gi ,'').replace(/\s+/gi , ' ').replace(/\$\*[a-z 0-9.!@#$%^&*()_\-,<>/{}\\|";'?`~.+=]*/gi,'').trim();
    });
    for(let i=0;i<get_Form_and_Object_Methods.length;i++){
        var input = get_Form_and_Object_Methods[i].split('(')[1].split(')')[0];
        var output = get_Form_and_Object_Methods[i].split(')')[1];
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
            var variable = get_Form_and_Object_Methods[i].replace( /^\s*define\s*method\s*./gi , '').split('(')[0];
            type =  get_Form_and_Object_Methods[i].split(')')[1].trim().split(' ')[1].toLowerCase();
            if( type!=''){
                variables = AssignVar( variable ,type , 0 , 1000 ,true, variables);
            }
        }
    }

    //in method to upper
    for(let i=currentLineNo ;i>=0;i--){
        
        if(functions.starts(lines[i] , fil) || /^[\s]*$/gi.test(lines[i])) continue;
        var lineContent = lines[i];
        console.log(lineContent);
        let vs = /[!]+[a-z][a-z0-9]*/gi.exec(lineContent);
        if(vs==null) continue;
        let variable = vs[0].replace(/!*/gi,'').replace(/\s*/g,'');
        type = GetType(lineContent,variable.toLowerCase(),false);
        variables = AssignVar( variable ,type , 0 , document.document.lineCount ,/^!!/g.test(vs[0]), variables);
        if(/^\s*define\s*method\s*.[a-z]*/gi.test(lines[i])||/^\s*endmethod\s*/gi.test(lines[i])) break;
    }
    //in method to upper
    // lower code is no need

    return variables;
}


function GetType(line:string,variableName:string,isglobal:boolean){
    let type:string ='';
    let lineContent = line.replace( /\s*/gi , '').toLowerCase();
    var ArrayRegex = new RegExp("!" +variableName + "\\[\\$*!*\\w*\\d*\\]", 'g');
    var RealRegex = new RegExp("!" + variableName + "\\s*=\\s*\\d+$", 'g');
    let gadgetSet = functions.GettingGadget(line);
    if(gadgetSet.gadget!='')type = gadgetSet.formalName;
    if( type != '')
        return type;
    type = functions.GetObject(line.replace( /\s*/gi , '').toLowerCase(),variableName,objectlist);

    if( type != '')
     return type;
    if (/=\s*!!collectall\w+\s*\([\s|\w,'()!*]*\)$/g.test(lineContent)
    || (lineContent.startsWith('!' + variableName + '=')&&methodtable.some(method=>method.object.toLocaleLowerCase()=="array"&&chkmethod(lineContent,method.name)))
    || (lineContent.startsWith('!' + variableName + '=')&&attributetable.some(attribute=>attribute.object.toLocaleLowerCase()=="array"&&chkatt(lineContent,attribute.name.toLocaleLowerCase())))
    || ArrayRegex.exec(lineContent)
    || functions.starts(line.replace(/\s+/g,' '), ['var !' + variableName + ' coll'
           ,'var !' + variableName + ' eval'
           ,'var !' + variableName + ' split'])
    ||lineContent.endsWith(variableName + "=desp")
     || lineContent.endsWith( variableName + "=para")
    ){
        type = "array";
    }
    else if (lineContent.includes('!' + variableName + '=true')
    || lineContent.includes('!' + variableName + '=false')
    || lineContent.includes('!' + variableName + '=T')
    || lineContent.includes('!' + variableName + '=F')
    || lineContent.includes('!' + variableName + '=undefined(')
    || lineContent.includes('!' + variableName + '=defined(')
    || (lineContent.startsWith('!' + variableName + '=')&&methodtable.some(method=>method.object.toLocaleLowerCase()=="boolean"&&chkmethod(lineContent,method.name)))
    || (lineContent.startsWith('!' + variableName + '=')&&attributetable.some(attribute=>attribute.object.toLocaleLowerCase()=="boolean"&&chkatt(lineContent,attribute.name.toLocaleLowerCase())))
    ) {
        type = "boolean";
    }
    else if (lineContent.includes(variableName + "='")
    || functions.contains(lineContent , [variableName + "=|"
    , variableName + "=string",
    variableName + "=nam",
    variableName + "='",
    variableName + "=desc",
    variableName + "=purp",
    variableName + "=func",
    variableName + "=stext",
    variableName + "=type",
    variableName + "=replace(",
    variableName + "=subs",
    variableName + "=after",
    variableName + "=befor",
    variableName + "=fprop"])
    || (lineContent.startsWith('!' + variableName + '=')&&methodtable.some(method=>method.object.toLocaleLowerCase()=="string"&&chkmethod(lineContent,method.name)))
    || (lineContent.startsWith('!' + variableName + '=')&&attributetable.some(attribute=>attribute.object.toLocaleLowerCase()=="string"&&chkatt(lineContent,attribute.name.toLocaleLowerCase())))
    || line.replace(/\s+/g,' ').includes('var !' + variableName + ' ')
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
    || functions.contains(lineContent , [variableName + "=abs"
    , variableName + "=tan",
    variableName + "=atan",
    variableName + "=sin",
    variableName + "=asin",
    variableName + "=log",
    variableName + "=alog",
    variableName + "=modulo",
    variableName + "=acos",
    'do!'+variableName + "to",
    'do!'+variableName + "from",
    variableName + "=cos",
    variableName + "=max",
    variableName + "=min",
    variableName + "=pow",
    variableName + "=sqrt"])
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
    ||functions.HasVarialbe(lineContent,variableName,['.pos.wrt(world)',
    '.pos',
    'pos',
    'pos.wrt(world)',
    'pos.wrt(/*)',
    'position.wrt(world)',
    'position.wrt(/*)',
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
    || functions.contains( lineContent, [variableName + "=own",
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