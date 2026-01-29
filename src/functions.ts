'use strict';

import * as vscode from 'vscode';


function contains(target: string, pattern: string[]): boolean {
	const lowerTarget = target.toLowerCase();
	return pattern.some(word => lowerTarget.includes(word.toLowerCase()));
}
function starts(target: string, pattern: string[]): boolean {
	return pattern.some(word => new RegExp("^\\s*" + word, 'gi').test(target));
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

function Get_First_Variable_Name(line:string):string{
	
	let result = '';
	let bracket1 = 0; // (
	let bracket2 = 0; // )
	let bracket3 = false; // '
	let bracket4 = false; // |
	let bracket5 = 0; // <
	let bracket6 = 0; // >
	for(let i = line.length -1 ; i >=0; i--){
		let cha = line.substring(i,i+1);
		if(cha =="'"){bracket3=!bracket4;continue;}
		else if(bracket3!=bracket4)continue;
		else if(cha=='('){bracket1++;continue;}
		else if(cha==')'){bracket2++;continue;}
		else if(cha=='<'){bracket5++;continue;}
		else if(cha=='>'){bracket6++;continue;}
		else if(bracket1!=bracket2)continue;
		else if(bracket5!=bracket6)continue;
		else if(cha=='.'){result = '';continue;}
		else if(contains(cha,['!',','])){break;}
		result = cha + result;
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
function getMarkDown(method: { label: string; snippet: string; md: string }): vscode.MarkdownString {
	const markdown = new vscode.MarkdownString();
	const isMethod = method.snippet?.includes('(');
	const signature = method.snippet.replace(/\$\{\d\:/gi, '').replace(/\}/gi, '').replace(/\)is\s*/gi, ') :');
	const prefix = isMethod ? '(method) ' : '(attribute) ';
	markdown.appendMarkdown(prefix + signature);
	markdown.appendMarkdown("\n");
	markdown.appendMarkdown("\n---\n");
	markdown.appendMarkdown(method.md);
	markdown.isTrusted = true;
	return markdown;
}
function getCurrentStage(line: string, cursor: number, bracketSet: number[]): { ArgumentNum: number; isEmpty: boolean; CurrentArgumentStage: number } {
	let openParen = 0;
	let closeParen = 0;
	let argumentCount = 0;
	let currentContent = '';
	let startPos = 0;
	let argsAfterCursor = 0;

	for (let j = cursor; j < line.length; j++) {
		if (bracketSet.includes(j)) continue;
		const char = line.substring(j, j + 1);
		startPos = j - 1;
		if (char == ')') break;
		if (char == ',') argsAfterCursor++;
	}

	for (let i = startPos; i >= 0; i--) {
		if (bracketSet.includes(i)) continue;
		const char = line.substring(i, i + 1);
		if (char == '(') { openParen++; continue; }
		else if (char == ')') { closeParen++; continue; }
		if (openParen > closeParen) break;
		if (openParen != closeParen) continue;
		if (char == ',') argumentCount++;
		currentContent += char;
	}

	return {
		ArgumentNum: argumentCount + 1,
		isEmpty: currentContent.trim() == '',
		CurrentArgumentStage: argumentCount + 1 - argsAfterCursor
	};
}
function getInputParameter(snippet: string, md: string, startingNum: number): vscode.ParameterInformation[] {
	if (snippet.split('(').length != 2 || snippet.split(')').length != 2) return [];
	const params = snippet.split('(')[1].split(')')[0].split(',').map((arg: string) => arg.trim());
	const result: vscode.ParameterInformation[] = [];
	const startIndex = startingNum == -1 ? 0 : startingNum;
	for (let i = startIndex; i < params.length; i++) {
		result.push(new vscode.ParameterInformation(params[i].replace(/\$\{\s*\d*\s*\:/gi, '').replace(/\}/gi, '').trim(), md));
	}
	return result;
}
const GADGET_LIST: { gadget: string; formalName: string }[] = [
	{ gadget: 'button', formalName: 'button' },
	{ gadget: 'para', formalName: 'paragraph' },
	{ gadget: 'paragraph', formalName: 'paragraph' },
	{ gadget: 'frame', formalName: 'frame' },
	{ gadget: 'text', formalName: 'text' },
	{ gadget: 'rtoggle', formalName: 'rtoggle' },
	{ gadget: 'toggle', formalName: 'toggle' },
	{ gadget: 'textpane', formalName: 'textpane' },
	{ gadget: 'bar', formalName: 'bar' },
	{ gadget: 'combobox', formalName: 'combobox' },
	{ gadget: 'list', formalName: 'list' },
	{ gadget: 'view', formalName: 'view' },
	{ gadget: 'slider', formalName: 'slider' },
	{ gadget: 'option', formalName: 'option' },
	{ gadget: 'container', formalName: 'container' },
	{ gadget: 'selector', formalName: 'selector' },
	{ gadget: 'line', formalName: 'line gadget' }
];

function GettingGadget(line: string): { gadget: string; formalName: string } {
	for (const gadget of GADGET_LIST) {
		const regex = new RegExp('^\\s*' + gadget.gadget + '\\s*.[a-z][a-z0-9]*', 'gi');
		if (regex.test(line)) {
			return gadget;
		}
	}
	return { gadget: '', formalName: '' };
}

function SetMarkdown(name: string, desc: string): vscode.MarkdownString {
	const markdown = new vscode.MarkdownString();
	markdown.appendMarkdown(name);
	markdown.appendMarkdown('\n');
	markdown.appendMarkdown('\n---\n');
	markdown.appendMarkdown(desc);
	return markdown;
}

function GetFileName(lines: string[]): { FileName: string; Form: boolean; Func: boolean; Object: boolean } {
	const result = { FileName: '', Form: false, Func: false, Object: false };
	const maxLines = Math.min(lines.length, 200);

	for (let i = 0; i < maxLines; i++) {
		const line = lines[i];
		const formMatch = /^\s*setup\s*form\s*!![a-z][a-z0-9]*/gi.exec(line);
		const funcMatch = /^\s*define\s*function\s*!![a-z][a-z0-9]*/gi.exec(line);
		const objMatch = /^\s*define\s*object\s*[a-z][a-z0-9]*/gi.exec(line);

		if (formMatch != null) {
			result.FileName = formMatch[0].replace(/^\s*setup\s*form\s*!!/gi, '');
			result.Form = true;
		} else if (funcMatch != null) {
			result.FileName = funcMatch[0].replace(/^\s*define\s*function\s*!!/gi, '');
			result.Func = true;
		} else if (objMatch != null) {
			result.FileName = objMatch[0].replace(/^\s*define\s*object\s*/gi, '');
			result.Object = true;
		}
	}
	return result;
}

export {
	contains,
	starts,
	HasMember,
	GetObject,
	Get_First_Variable_Name,
	HasVarialbe,
	GetPositionInterStringBracket,
	getMarkDown,
	getCurrentStage,
	getInputParameter,
	GettingGadget,
	SetMarkdown,
	GetFileName
}