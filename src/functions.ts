'use strict';

import * as vscode from 'vscode';


function contains(target:string, pattern: any[]){
	let value:boolean = false;
	pattern.forEach(function(word){
		 if(target.toLowerCase().includes(word.toLowerCase()))
			  value = true;
		 else
			  value = value;
		 if (value==true) return;
	});
	return value;
}
function starts(target:string, pattern: any[]){
	let value:boolean = false;
	pattern.forEach(function(word){
		 if( new RegExp("\^\\s*" + word , 'gi').test(target))
			  value = true;
		 else
			  value = value;
		 if (value==true) return;
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
		 ||line.startsWith( '!' + variableName + '=object'+ObjectList[i]+'('))
		 return ObjectList[i];
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

function GetPositionInterStringBracket(currentLine:string):number[]{
    let result:number[]=[];
    let bracket3 = false; // '
    let bracket4 = false; // |
    for(let i=0;i<currentLine.length;i++){
        let cha = currentLine.substring(i,i+1);
        if(cha=='\'') { bracket3=!bracket3;result.push(i);continue;}
        else if(cha=='|')  {bracket4=!bracket4;result.push(i);continue;}
        if(bracket3||bracket4) result.push(i);
    }
    return result;
}
function getMarkDown(method:{ label: string; snippet: string  ; md: string ; }):vscode.MarkdownString{
	let aa:vscode.MarkdownString = new vscode.MarkdownString();
	let chkmethod =  method.snippet?.includes('(');
	let sn:any = method.snippet.replace(/\$\{\d\:/gi , '').replace(/\}/gi,'').replace( /\)is\s*/gi ,') :');
	let pref = chkmethod?'(method) ':'(attribute) ';
	aa.appendMarkdown(pref + sn);
	aa.appendMarkdown("\n");
	aa.appendMarkdown("\n---\n");
	aa.appendMarkdown(method.md);
	aa.isTrusted = true;
	return aa;
}
function getCurrentStage(line:string , curser:number , bracketSet:number[]):{ArgumentNum:number;isEmpty:boolean;CurrentArgumentStage:number}{

	let resultFormat:{ArgumentNum:number;isEmpty:boolean;CurrentArgumentStage:number}={
		 ArgumentNum: 0,
		 isEmpty: false,
		 CurrentArgumentStage: 0
	};
	let bracket1 = 0; // (
	let bracket2 = 0; // )
	let ArgumentNumber = 0 ;
	let lett = '';
	let startNum = 0;
	let afterArgNum = 0;
	for(let j=curser;j<line.length;j++){
		 if(bracketSet.includes(j))continue;
		 let cha = line.substring(j,j+1);
		 startNum = j-1;
		 if(cha==')') break;
		 if(cha==',') afterArgNum++;
	}
	for(let i=startNum;i>=0;i--){
		 if(bracketSet.includes(i))continue;
		 let cha = line.substring(i,i+1);
		 if(cha=='(')  {bracket1++;continue;}
		 else if(cha==')')  {bracket2++;continue;}
		 if(bracket1>bracket2)break;
		 if(bracket1!=bracket2)continue;
		 if(cha==',') ArgumentNumber++;
		 lett += cha;
	}
	resultFormat.isEmpty=lett.trim()=='';
	resultFormat.ArgumentNum=ArgumentNumber+1;
	resultFormat.CurrentArgumentStage =resultFormat.ArgumentNum - afterArgNum;
	
	return resultFormat;
}
function getInputParameter(snippet:string,md:string,startingnum:number):vscode.ParameterInformation[]{
	if(snippet.split('(').length!=2 ||snippet.split(')').length!=2) return [];
	let input= snippet.split('(')[1].split(')')[0].split(',').map((arg: string)=>arg.trim());
	let result:vscode.ParameterInformation[]=[];
	let nn = startingnum==-1?0:startingnum;
	for(let i=nn;i<input.length;i++){
		 result.push(new vscode.ParameterInformation(input[i].replace(/\$\{\s*\d*\s*\:/gi,'').replace(/\}/gi,'').trim(),md));
	}
	return result;
}
function GettingGadget(line:string):{gadget:string,formalName:string}{
	let gadgetList:{gadget:string,formalName:string}[]=[
		 {gadget: 'button',formalName: 'button'},
		 {gadget: 'para',formalName: 'paragraph'},
		 {gadget: 'paragraph',formalName: 'paragraph'},
		 {gadget: 'frame',formalName: 'frame'},
		 {gadget: 'text',formalName: 'text'},
		 {gadget: 'rtoggle',formalName: 'rtoggle'},
		 {gadget: 'toggle',formalName: 'toggle'},
		 {gadget: 'textpane',formalName: 'textpane'},
		 {gadget: 'bar',formalName: 'bar'},
		 {gadget: 'combobox',formalName: 'combobox'},
		 {gadget: 'lsit',formalName: 'list'},
		 {gadget: 'view',formalName: 'view'},
		 {gadget: 'slider',formalName: 'slider'},
		 {gadget: 'option',formalName: 'option'},
		 {gadget: 'container',formalName: 'container'},
		 {gadget: 'selector',formalName: 'selector'},
		 {gadget: 'line',formalName: 'line gadget'}
	];
	for(let i=0;i<gadgetList.length;i++){
		 let regex = new RegExp('\^\\s*'+gadgetList[i].gadget+'\\s*.[a-z][a-z0-9]\*','gi');
		 if(new RegExp('\^\\s*'+gadgetList[i].gadget+'\\s*.[a-z][a-z0-9]\*','gi').test(line)){
			  return gadgetList[i];
		 }
	}
	let emptyresult:{gadget:string,formalName:string}={gadget:'',formalName:''};
	return emptyresult;
}

function SetMarkdown(name:string,desc:string):vscode.MarkdownString{
	let markdown:vscode.MarkdownString = new vscode.MarkdownString();
	markdown.appendMarkdown(name);
	markdown.appendMarkdown('\n');
	markdown.appendMarkdown('\n---\n');
	markdown.appendMarkdown(desc);
	return markdown;
}

function GetFileName(lines:string[]):{FileName:string,Form:boolean,Func:boolean,Object:boolean}{
	let resultFormat:{FileName:string,Form:boolean,Func:boolean,Object:boolean}={FileName:'',Form:false,Func:false,Object:false};
		for(let i=0;i<lines.length;i++){
			let line = lines[i];
			let chkForm = /^\s*setup\s*form\s*!![a-z][a-z0-9]/gi.exec(line);
			let chkFunc = /^\s*define\s*function\s*!![a-z][a-z0-9]/gi.exec(line);
			let chkObj = /^\s*define\s*object\s*[a-z][a-z0-9]/gi.exec(line);
			if(chkForm!=null){
				resultFormat.FileName = chkForm[0].replace(/^\s*setup\s*form\s*!!/gi,'');
				resultFormat.Form=true;
			}
			else if(chkFunc!=null){
				resultFormat.FileName = chkFunc[0].replace(/^\s*define\s*function\s*!!/gi,'');
				resultFormat.Func=true;
			}
			else if(chkObj!=null){
				resultFormat.FileName = chkObj[0].replace(/^\s*define\s*object\s*/gi,'');
				resultFormat.Object=true;
			}
			if(i==200)break;
		}
		return resultFormat;
		}
export{contains,starts,HasMember,GetObject,HasVarialbe,GetPositionInterStringBracket,getMarkDown,getCurrentStage,getInputParameter,GettingGadget,SetMarkdown,GetFileName}