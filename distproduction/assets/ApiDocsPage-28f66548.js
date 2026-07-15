var rr=Object.defineProperty;var tr=(t,e,r)=>e in t?rr(t,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[e]=r;var w=(t,e,r)=>(tr(t,typeof e!="symbol"?e+"":e,r),r);import{q as nr,aD as ir,az as or,aZ as sr,aL as j,u as P,v,I as B,bJ as Ie,bL as de,bA as ar,t as ze,F as ue,aX as pe,bb as M,bk as _e,bB as De,aU as X,H as Le,au as he}from"./index-debd907b.js";import{V as N}from"./VIcon-ff27bcc9.js";function xe(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var U=xe();function Ne(t){U=t}var V={exec:()=>null};function G(t){let e=[];return r=>{let i=Math.max(0,Math.min(3,r-1)),n=e[i];return n||(n=t(i),e[i]=n),n}}function f(t,e=""){let r=typeof t=="string"?t:t.source,i={replace:(n,s)=>{let a=typeof s=="string"?s:s.source;return a=a.replace(T.caret,"$1"),r=r.replace(n,a),i},getRegex:()=>new RegExp(r,e)};return i}var lr=((t="")=>{try{return!!new RegExp("(?<=1)(?<!1)"+t)}catch{return!1}})(),T={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:t=>new RegExp(`^( {0,3}${t})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:G(t=>new RegExp(`^ {0,${t}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)),hrRegex:G(t=>new RegExp(`^ {0,${t}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`)),fencesBeginRegex:G(t=>new RegExp(`^ {0,${t}}(?:\`\`\`|~~~)`)),headingBeginRegex:G(t=>new RegExp(`^ {0,${t}}#`)),htmlBeginRegex:G(t=>new RegExp(`^ {0,${t}}<(?:[a-z].*>|!--)`,"i")),blockquoteBeginRegex:G(t=>new RegExp(`^ {0,${t}}>`))},cr=/^(?:[ \t]*(?:\n|$))+/,dr=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,ur=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,Y=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,pr=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,be=/ {0,3}(?:[*+-]|\d{1,9}[.)])/,Ve=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,He=f(Ve).replace(/bull/g,be).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),hr=f(Ve).replace(/bull/g,be).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),we=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,gr=/^[^\n]+/,ye=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,mr=f(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",ye).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),kr=f(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g,be).getRegex(),oe="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",ve=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,fr=f("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>[^\\n]*\\n+|$)|<![A-Z][\\s\\S]*?(?:>[^\\n]*\\n+|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>[^\\n]*\\n+|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",ve).replace("tag",oe).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),Ue=t=>f(we).replace("hr",Y).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list",t).replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",oe).getRegex(),xr=Ue(/ {0,3}(?:[*+-]|1[.)])[ \t]+[^ \t\n]/),br=Ue(/ {0,3}(?:[*+-]|\d{1,9}[.)])[ \t]+[^ \t\n]/),wr=f(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",br).getRegex(),Se={blockquote:wr,code:dr,def:mr,fences:ur,heading:pr,hr:Y,html:fr,lheading:He,list:kr,newline:cr,paragraph:xr,table:V,text:gr},$e=f("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",Y).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",oe).getRegex(),yr={...Se,lheading:hr,table:$e,paragraph:f(we).replace("hr",Y).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",$e).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",oe).getRegex()},vr={...Se,html:f(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",ve).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:V,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:f(we).replace("hr",Y).replace("heading",` *#{1,6} *[^
]`).replace("lheading",He).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},Sr=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Ar=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,qe=/^( {2,}|\\)\n(?!\s*$)/,Tr=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,F=/[\p{P}\p{S}]/u,se=/[\s\p{P}\p{S}]/u,Ae=/[^\s\p{P}\p{S}]/u,Er=f(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,se).getRegex(),Ze=/(?!~)[\p{P}\p{S}]/u,Rr=/(?!~)[\s\p{P}\p{S}]/u,Ir=/(?:[^\s\p{P}\p{S}]|~)/u,zr=f(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",lr?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),Ge=/^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/,_r=f(Ge,"u").replace(/punct/g,F).getRegex(),Dr=f(Ge,"u").replace(/punct/g,Ze).getRegex(),Fe="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Lr=f(Fe,"gu").replace(/notPunctSpace/g,Ae).replace(/punctSpace/g,se).replace(/punct/g,F).getRegex(),$r=f(Fe,"gu").replace(/notPunctSpace/g,Ir).replace(/punctSpace/g,Rr).replace(/punct/g,Ze).getRegex(),Cr=f("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,Ae).replace(/punctSpace/g,se).replace(/punct/g,F).getRegex(),jr=f(/^~~?(?:((?!~)punct)|[^\s~])/,"u").replace(/punct/g,F).getRegex(),Pr="^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)",Br=f(Pr,"gu").replace(/notPunctSpace/g,Ae).replace(/punctSpace/g,se).replace(/punct/g,F).getRegex(),Mr=f(/\\(punct)/,"gu").replace(/punct/g,F).getRegex(),Or=f(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),Nr=f(ve).replace("(?:-->|$)","-->").getRegex(),Vr=f("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",Nr).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),te=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/,Hr=f(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label",te).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]+|(?=\))/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),Qe=f(/^!?\[(label)\]\[(ref)\]/).replace("label",te).replace("ref",ye).getRegex(),We=f(/^!?\[(ref)\](?:\[\])?/).replace("ref",ye).getRegex(),Ur=f("reflink|nolink(?!\\()","g").replace("reflink",Qe).replace("nolink",We).getRegex(),Ce=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,Te={_backpedal:V,anyPunctuation:Mr,autolink:Or,blockSkip:zr,br:qe,code:Ar,del:V,delLDelim:V,delRDelim:V,emStrongLDelim:_r,emStrongRDelimAst:Lr,emStrongRDelimUnd:Cr,escape:Sr,link:Hr,nolink:We,punctuation:Er,reflink:Qe,reflinkSearch:Ur,tag:Vr,text:Tr,url:V},qr={...Te,link:f(/^!?\[(label)\]\((.*?)\)/).replace("label",te).getRegex(),reflink:f(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",te).getRegex()},me={...Te,emStrongRDelimAst:$r,emStrongLDelim:Dr,delLDelim:jr,delRDelim:Br,url:f(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",Ce).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:f(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",Ce).getRegex()},Zr={...me,br:f(qe).replace("{2,}","*").getRegex(),text:f(me.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},ee={normal:Se,gfm:yr,pedantic:vr},J={normal:Te,gfm:me,breaks:Zr,pedantic:qr},Gr={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},je=t=>Gr[t];function _(t,e){if(e){if(T.escapeTest.test(t))return t.replace(T.escapeReplace,je)}else if(T.escapeTestNoEncode.test(t))return t.replace(T.escapeReplaceNoEncode,je);return t}function Pe(t){try{t=encodeURI(t).replace(T.percentDecode,"%")}catch{return null}return t}function Be(t,e){var s;let r=t.replace(T.findPipe,(a,l,o)=>{let d=!1,c=l;for(;--c>=0&&o[c]==="\\";)d=!d;return d?"|":" |"}),i=r.split(T.splitPipe),n=0;if(i[0].trim()||i.shift(),i.length>0&&!((s=i.at(-1))!=null&&s.trim())&&i.pop(),e)if(i.length>e)i.splice(e);else for(;i.length<e;)i.push("");for(;n<i.length;n++)i[n]=i[n].trim().replace(T.slashPipe,"|");return i}function O(t,e,r){let i=t.length;if(i===0)return"";let n=0;for(;n<i;){let s=t.charAt(i-n-1);if(s===e&&!r)n++;else if(s!==e&&r)n++;else break}return t.slice(0,i-n)}function Me(t){let e=t.split(`
`),r=e.length-1;for(;r>=0&&T.blankLine.test(e[r]);)r--;return e.length-r<=2?t:e.slice(0,r+1).join(`
`)}function Fr(t,e){if(t.indexOf(e[1])===-1)return-1;let r=0;for(let i=0;i<t.length;i++)if(t[i]==="\\")i++;else if(t[i]===e[0])r++;else if(t[i]===e[1]&&(r--,r<0))return i;return r>0?-2:-1}function Qr(t,e=0){let r=e,i="";for(let n of t)if(n==="	"){let s=4-r%4;i+=" ".repeat(s),r+=s}else i+=n,r++;return i}function Oe(t,e,r,i,n){let s=e.href,a=e.title||null,l=t[1].replace(n.other.outputLinkReplace,"$1");i.state.inLink=!0;let o={type:t[0].charAt(0)==="!"?"image":"link",raw:r,href:s,title:a,text:l,tokens:i.inlineTokens(l)};return i.state.inLink=!1,o}function Wr(t,e,r){let i=t.match(r.other.indentCodeCompensation);if(i===null)return e;let n=i[1];return e.split(`
`).map(s=>{let a=s.match(r.other.beginningSpace);if(a===null)return s;let[l]=a;return l.length>=n.length?s.slice(n.length):s}).join(`
`)}var ne=class{constructor(t){w(this,"options");w(this,"rules");w(this,"lexer");this.options=t||U}space(t){let e=this.rules.block.newline.exec(t);if(e&&e[0].length>0)return{type:"space",raw:e[0]}}code(t){let e=this.rules.block.code.exec(t);if(e){let r=this.options.pedantic?e[0]:Me(e[0]),i=r.replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:r,codeBlockStyle:"indented",text:i}}}fences(t){let e=this.rules.block.fences.exec(t);if(e){let r=e[0],i=Wr(r,e[3]||"",this.rules);return{type:"code",raw:r,lang:e[2]?e[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):e[2],text:i}}}heading(t){let e=this.rules.block.heading.exec(t);if(e){let r=e[2].trim();if(this.rules.other.endingHash.test(r)){let i=O(r,"#");(this.options.pedantic||!i||this.rules.other.endingSpaceChar.test(i))&&(r=i.trim())}return{type:"heading",raw:O(e[0],`
`),depth:e[1].length,text:r,tokens:this.lexer.inline(r)}}}hr(t){let e=this.rules.block.hr.exec(t);if(e)return{type:"hr",raw:O(e[0],`
`)}}blockquote(t){let e=this.rules.block.blockquote.exec(t);if(e){let r=O(e[0],`
`).split(`
`),i="",n="",s=[];for(;r.length>0;){let a=!1,l=[],o;for(o=0;o<r.length;o++)if(this.rules.other.blockquoteStart.test(r[o]))l.push(r[o]),a=!0;else if(!a)l.push(r[o]);else break;r=r.slice(o);let d=l.join(`
`),c=d.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");i=i?`${i}
${d}`:d,n=n?`${n}
${c}`:c;let p=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(c,s,!0),this.lexer.state.top=p,r.length===0)break;let h=s.at(-1);if((h==null?void 0:h.type)==="code")break;if((h==null?void 0:h.type)==="blockquote"){let A=h,u=A.raw+`
`+r.join(`
`),E=this.blockquote(u);s[s.length-1]=E,i=i.substring(0,i.length-A.raw.length)+E.raw,n=n.substring(0,n.length-A.text.length)+E.text;break}else if((h==null?void 0:h.type)==="list"){let A=h,u=A.raw+`
`+r.join(`
`),E=this.list(u);s[s.length-1]=E,i=i.substring(0,i.length-h.raw.length)+E.raw,n=n.substring(0,n.length-A.raw.length)+E.raw,r=u.substring(s.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:i,tokens:s,text:n}}}list(t){let e=this.rules.block.list.exec(t);if(e){let r=e[1].trim(),i=r.length>1,n={type:"list",raw:"",ordered:i,start:i?+r.slice(0,-1):"",loose:!1,items:[]};r=i?`\\d{1,9}\\${r.slice(-1)}`:`\\${r}`,this.options.pedantic&&(r=i?r:"[*+-]");let s=this.rules.other.listItemRegex(r),a=!1;for(;t;){let o=!1,d="",c="";if(!(e=s.exec(t))||this.rules.block.hr.test(t))break;d=e[0],t=t.substring(d.length);let p=Qr(e[2].split(`
`,1)[0],e[1].length),h=t.split(`
`,1)[0],A=!p.trim(),u=0;if(this.options.pedantic?(u=2,c=p.trimStart()):A?u=e[1].length+1:(u=p.search(this.rules.other.nonSpaceChar),u=u>4?1:u,c=p.slice(u),u+=e[1].length),A&&this.rules.other.blankLine.test(h)&&(d+=h+`
`,t=t.substring(h.length+1),o=!0),!o){let E=this.rules.other.nextBulletRegex(u),S=this.rules.other.hrRegex(u),q=this.rules.other.fencesBeginRegex(u),D=this.rules.other.headingBeginRegex(u),Q=this.rules.other.htmlBeginRegex(u),ae=this.rules.other.blockquoteBeginRegex(u);for(;t;){let Z=t.split(`
`,1)[0],L;if(h=Z,this.options.pedantic?(h=h.replace(this.rules.other.listReplaceNesting,"  "),L=h):L=h.replace(this.rules.other.tabCharGlobal,"    "),q.test(h)||D.test(h)||Q.test(h)||ae.test(h)||E.test(h)||S.test(h))break;if(L.search(this.rules.other.nonSpaceChar)>=u||!h.trim())c+=`
`+L.slice(u);else{if(A||p.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||q.test(p)||D.test(p)||S.test(p))break;c+=`
`+h}A=!h.trim(),d+=Z+`
`,t=t.substring(Z.length+1),p=L.slice(u)}}n.loose||(a?n.loose=!0:this.rules.other.doubleBlankLine.test(d)&&(a=!0)),n.items.push({type:"list_item",raw:d,task:!!this.options.gfm&&this.rules.other.listIsTask.test(c),loose:!1,text:c,tokens:[]}),n.raw+=d}let l=n.items.at(-1);if(l)l.raw=l.raw.trimEnd(),l.text=l.text.trimEnd();else return;n.raw=n.raw.trimEnd();for(let o of n.items){this.lexer.state.top=!1,o.tokens=this.lexer.blockTokens(o.text,[]);let d=o.tokens[0];if(o.task&&((d==null?void 0:d.type)==="text"||(d==null?void 0:d.type)==="paragraph")){o.text=o.text.replace(this.rules.other.listReplaceTask,""),d.raw=d.raw.replace(this.rules.other.listReplaceTask,""),d.text=d.text.replace(this.rules.other.listReplaceTask,"");for(let p=this.lexer.inlineQueue.length-1;p>=0;p--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[p].src)){this.lexer.inlineQueue[p].src=this.lexer.inlineQueue[p].src.replace(this.rules.other.listReplaceTask,"");break}let c=this.rules.other.listTaskCheckbox.exec(o.raw);if(c){let p={type:"checkbox",raw:c[0]+" ",checked:c[0]!=="[ ]"};o.checked=p.checked,n.loose?o.tokens[0]&&["paragraph","text"].includes(o.tokens[0].type)&&"tokens"in o.tokens[0]&&o.tokens[0].tokens?(o.tokens[0].raw=p.raw+o.tokens[0].raw,o.tokens[0].text=p.raw+o.tokens[0].text,o.tokens[0].tokens.unshift(p)):o.tokens.unshift({type:"paragraph",raw:p.raw,text:p.raw,tokens:[p]}):o.tokens.unshift(p)}}else o.task&&(o.task=!1);if(!n.loose){let c=o.tokens.filter(h=>h.type==="space"),p=c.length>0&&c.some(h=>this.rules.other.anyLine.test(h.raw));n.loose=p}}if(n.loose)for(let o of n.items){o.loose=!0;for(let d of o.tokens)d.type==="text"&&(d.type="paragraph")}return n}}html(t){let e=this.rules.block.html.exec(t);if(e){let r=Me(e[0]);return{type:"html",block:!0,raw:r,pre:e[1]==="pre"||e[1]==="script"||e[1]==="style",text:r}}}def(t){let e=this.rules.block.def.exec(t);if(e){let r=e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),i=e[2]?e[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",n=e[3]?e[3].substring(1,e[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):e[3];return{type:"def",tag:r,raw:O(e[0],`
`),href:i,title:n}}}table(t){var a;let e=this.rules.block.table.exec(t);if(!e||!this.rules.other.tableDelimiter.test(e[2]))return;let r=Be(e[1]),i=e[2].replace(this.rules.other.tableAlignChars,"").split("|"),n=(a=e[3])!=null&&a.trim()?e[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],s={type:"table",raw:O(e[0],`
`),header:[],align:[],rows:[]};if(r.length===i.length){for(let l of i)this.rules.other.tableAlignRight.test(l)?s.align.push("right"):this.rules.other.tableAlignCenter.test(l)?s.align.push("center"):this.rules.other.tableAlignLeft.test(l)?s.align.push("left"):s.align.push(null);for(let l=0;l<r.length;l++)s.header.push({text:r[l],tokens:this.lexer.inline(r[l]),header:!0,align:s.align[l]});for(let l of n)s.rows.push(Be(l,s.header.length).map((o,d)=>({text:o,tokens:this.lexer.inline(o),header:!1,align:s.align[d]})));return s}}lheading(t){let e=this.rules.block.lheading.exec(t);if(e){let r=e[1].trim();return{type:"heading",raw:O(e[0],`
`),depth:e[2].charAt(0)==="="?1:2,text:r,tokens:this.lexer.inline(r)}}}paragraph(t){let e=this.rules.block.paragraph.exec(t);if(e){let r=e[1].charAt(e[1].length-1)===`
`?e[1].slice(0,-1):e[1];return{type:"paragraph",raw:e[0],text:r,tokens:this.lexer.inline(r)}}}text(t){let e=this.rules.block.text.exec(t);if(e)return{type:"text",raw:e[0],text:e[0],tokens:this.lexer.inline(e[0])}}escape(t){let e=this.rules.inline.escape.exec(t);if(e)return{type:"escape",raw:e[0],text:e[1]}}tag(t){let e=this.rules.inline.tag.exec(t);if(e)return!this.lexer.state.inLink&&this.rules.other.startATag.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:e[0]}}link(t){let e=this.rules.inline.link.exec(t);if(e){let r=e[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(r)){if(!this.rules.other.endAngleBracket.test(r))return;let s=O(r.slice(0,-1),"\\");if((r.length-s.length)%2===0)return}else{let s=Fr(e[2],"()");if(s===-2)return;if(s>-1){let a=(e[0].indexOf("!")===0?5:4)+e[1].length+s;e[2]=e[2].substring(0,s),e[0]=e[0].substring(0,a).trim(),e[3]=""}}let i=e[2],n="";if(this.options.pedantic){let s=this.rules.other.pedanticHrefTitle.exec(i);s&&(i=s[1],n=s[3])}else n=e[3]?e[3].slice(1,-1):"";return i=i.trim(),this.rules.other.startAngleBracket.test(i)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(r)?i=i.slice(1):i=i.slice(1,-1)),Oe(e,{href:i&&i.replace(this.rules.inline.anyPunctuation,"$1"),title:n&&n.replace(this.rules.inline.anyPunctuation,"$1")},e[0],this.lexer,this.rules)}}reflink(t,e){let r;if((r=this.rules.inline.reflink.exec(t))||(r=this.rules.inline.nolink.exec(t))){let i=(r[2]||r[1]).replace(this.rules.other.multipleSpaceGlobal," "),n=e[i.toLowerCase()];if(!n){let s=r[0].charAt(0);return{type:"text",raw:s,text:s}}return Oe(r,n,r[0],this.lexer,this.rules)}}emStrong(t,e,r=""){let i=this.rules.inline.emStrongLDelim.exec(t);if(!(!i||!i[1]&&!i[2]&&!i[3]&&!i[4]||i[4]&&r.match(this.rules.other.unicodeAlphaNumeric))&&(!(i[1]||i[3])||!r||this.rules.inline.punctuation.exec(r))){let n=[...i[0]].length-1,s,a,l=n,o=0,d=i[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(d.lastIndex=0,e=e.slice(-1*t.length+n);(i=d.exec(e))!==null;){if(s=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!s)continue;if(a=[...s].length,i[3]||i[4]){l+=a;continue}else if((i[5]||i[6])&&n%3&&!((n+a)%3)){o+=a;continue}if(l-=a,l>0)continue;a=Math.min(a,a+l+o);let c=[...i[0]][0].length,p=t.slice(0,n+i.index+c+a);if(Math.min(n,a)%2){let A=p.slice(1,-1);return{type:"em",raw:p,text:A,tokens:this.lexer.inlineTokens(A)}}let h=p.slice(2,-2);return{type:"strong",raw:p,text:h,tokens:this.lexer.inlineTokens(h)}}}}codespan(t){let e=this.rules.inline.code.exec(t);if(e){let r=e[2].replace(this.rules.other.newLineCharGlobal," "),i=this.rules.other.nonSpaceChar.test(r),n=this.rules.other.startingSpaceChar.test(r)&&this.rules.other.endingSpaceChar.test(r);return i&&n&&(r=r.substring(1,r.length-1)),{type:"codespan",raw:e[0],text:r}}}br(t){let e=this.rules.inline.br.exec(t);if(e)return{type:"br",raw:e[0]}}del(t,e,r=""){let i=this.rules.inline.delLDelim.exec(t);if(i&&(!i[1]||!r||this.rules.inline.punctuation.exec(r))){let n=[...i[0]].length-1,s,a,l=n,o=this.rules.inline.delRDelim;for(o.lastIndex=0,e=e.slice(-1*t.length+n);(i=o.exec(e))!==null;){if(s=i[1]||i[2]||i[3]||i[4]||i[5]||i[6],!s||(a=[...s].length,a!==n))continue;if(i[3]||i[4]){l+=a;continue}if(l-=a,l>0)continue;a=Math.min(a,a+l);let d=[...i[0]][0].length,c=t.slice(0,n+i.index+d+a),p=c.slice(n,-n);return{type:"del",raw:c,text:p,tokens:this.lexer.inlineTokens(p)}}}}autolink(t){let e=this.rules.inline.autolink.exec(t);if(e){let r,i;return e[2]==="@"?(r=e[1],i="mailto:"+r):(r=e[1],i=r),{type:"link",raw:e[0],text:r,href:i,tokens:[{type:"text",raw:r,text:r}]}}}url(t){var r;let e;if(e=this.rules.inline.url.exec(t)){let i,n;if(e[2]==="@")i=e[0],n="mailto:"+i;else{let s;do s=e[0],e[0]=((r=this.rules.inline._backpedal.exec(e[0]))==null?void 0:r[0])??"";while(s!==e[0]);i=e[0],e[1]==="www."?n="http://"+e[0]:n=e[0]}return{type:"link",raw:e[0],text:i,href:n,tokens:[{type:"text",raw:i,text:i}]}}}inlineText(t){let e=this.rules.inline.text.exec(t);if(e){let r=this.lexer.state.inRawBlock;return{type:"text",raw:e[0],text:e[0],escaped:r}}}},R=class ke{constructor(e){w(this,"tokens");w(this,"options");w(this,"state");w(this,"inlineQueue");w(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=e||U,this.options.tokenizer=this.options.tokenizer||new ne,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let r={other:T,block:ee.normal,inline:J.normal};this.options.pedantic?(r.block=ee.pedantic,r.inline=J.pedantic):this.options.gfm&&(r.block=ee.gfm,this.options.breaks?r.inline=J.breaks:r.inline=J.gfm),this.tokenizer.rules=r}static get rules(){return{block:ee,inline:J}}static lex(e,r){return new ke(r).lex(e)}static lexInline(e,r){return new ke(r).inlineTokens(e)}lex(e){e=e.replace(T.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let r=0;r<this.inlineQueue.length;r++){let i=this.inlineQueue[r];this.inlineTokens(i.src,i.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,r=[],i=!1){var s,a,l;this.tokenizer.lexer=this,this.options.pedantic&&(e=e.replace(T.tabCharGlobal,"    ").replace(T.spaceLine,""));let n=1/0;for(;e;){if(e.length<n)n=e.length;else{this.infiniteLoopError(e.charCodeAt(0));break}let o;if((a=(s=this.options.extensions)==null?void 0:s.block)!=null&&a.some(c=>(o=c.call({lexer:this},e,r))?(e=e.substring(o.raw.length),r.push(o),!0):!1))continue;if(o=this.tokenizer.space(e)){e=e.substring(o.raw.length);let c=r.at(-1);o.raw.length===1&&c!==void 0?c.raw+=`
`:r.push(o);continue}if(o=this.tokenizer.code(e)){e=e.substring(o.raw.length);let c=r.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+o.raw,c.text+=`
`+o.text,this.inlineQueue.at(-1).src=c.text):r.push(o);continue}if(o=this.tokenizer.fences(e)){e=e.substring(o.raw.length),r.push(o);continue}if(o=this.tokenizer.heading(e)){e=e.substring(o.raw.length),r.push(o);continue}if(o=this.tokenizer.hr(e)){e=e.substring(o.raw.length),r.push(o);continue}if(o=this.tokenizer.blockquote(e)){e=e.substring(o.raw.length),r.push(o);continue}if(o=this.tokenizer.list(e)){e=e.substring(o.raw.length),r.push(o);continue}if(o=this.tokenizer.html(e)){e=e.substring(o.raw.length),r.push(o);continue}if(o=this.tokenizer.def(e)){e=e.substring(o.raw.length);let c=r.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+o.raw,c.text+=`
`+o.raw,this.inlineQueue.at(-1).src=c.text):this.tokens.links[o.tag]||(this.tokens.links[o.tag]={href:o.href,title:o.title},r.push(o));continue}if(o=this.tokenizer.table(e)){e=e.substring(o.raw.length),r.push(o);continue}if(o=this.tokenizer.lheading(e)){e=e.substring(o.raw.length),r.push(o);continue}let d=e;if((l=this.options.extensions)!=null&&l.startBlock){let c=1/0,p=e.slice(1),h;this.options.extensions.startBlock.forEach(A=>{h=A.call({lexer:this},p),typeof h=="number"&&h>=0&&(c=Math.min(c,h))}),c<1/0&&c>=0&&(d=e.substring(0,c+1))}if(this.state.top&&(o=this.tokenizer.paragraph(d))){let c=r.at(-1);i&&(c==null?void 0:c.type)==="paragraph"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+o.raw,c.text+=`
`+o.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):r.push(o),i=d.length!==e.length,e=e.substring(o.raw.length);continue}if(o=this.tokenizer.text(e)){e=e.substring(o.raw.length);let c=r.at(-1);(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+o.raw,c.text+=`
`+o.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):r.push(o);continue}if(e){this.infiniteLoopError(e.charCodeAt(0));break}}return this.state.top=!0,r}inline(e,r=[]){return this.inlineQueue.push({src:e,tokens:r}),r}inlineTokens(e,r=[]){var d,c,p,h,A;this.tokenizer.lexer=this;let i=e,n=null;if(this.tokens.links){let u=Object.keys(this.tokens.links);if(u.length>0)for(;(n=this.tokenizer.rules.inline.reflinkSearch.exec(i))!==null;)u.includes(n[0].slice(n[0].lastIndexOf("[")+1,-1))&&(i=i.slice(0,n.index)+"["+"a".repeat(n[0].length-2)+"]"+i.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(n=this.tokenizer.rules.inline.anyPunctuation.exec(i))!==null;)i=i.slice(0,n.index)+"++"+i.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let s;for(;(n=this.tokenizer.rules.inline.blockSkip.exec(i))!==null;)s=n[2]?n[2].length:0,i=i.slice(0,n.index+s)+"["+"a".repeat(n[0].length-s-2)+"]"+i.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);i=((c=(d=this.options.hooks)==null?void 0:d.emStrongMask)==null?void 0:c.call({lexer:this},i))??i;let a=!1,l="",o=1/0;for(;e;){if(e.length<o)o=e.length;else{this.infiniteLoopError(e.charCodeAt(0));break}a||(l=""),a=!1;let u;if((h=(p=this.options.extensions)==null?void 0:p.inline)!=null&&h.some(S=>(u=S.call({lexer:this},e,r))?(e=e.substring(u.raw.length),r.push(u),!0):!1))continue;if(u=this.tokenizer.escape(e)){e=e.substring(u.raw.length),r.push(u);continue}if(u=this.tokenizer.tag(e)){e=e.substring(u.raw.length),r.push(u);continue}if(u=this.tokenizer.link(e)){e=e.substring(u.raw.length),r.push(u);continue}if(u=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(u.raw.length);let S=r.at(-1);u.type==="text"&&(S==null?void 0:S.type)==="text"?(S.raw+=u.raw,S.text+=u.text):r.push(u);continue}if(u=this.tokenizer.emStrong(e,i,l)){e=e.substring(u.raw.length),r.push(u);continue}if(u=this.tokenizer.codespan(e)){e=e.substring(u.raw.length),r.push(u);continue}if(u=this.tokenizer.br(e)){e=e.substring(u.raw.length),r.push(u);continue}if(u=this.tokenizer.del(e,i,l)){e=e.substring(u.raw.length),r.push(u);continue}if(u=this.tokenizer.autolink(e)){e=e.substring(u.raw.length),r.push(u);continue}if(!this.state.inLink&&(u=this.tokenizer.url(e))){e=e.substring(u.raw.length),r.push(u);continue}let E=e;if((A=this.options.extensions)!=null&&A.startInline){let S=1/0,q=e.slice(1),D;this.options.extensions.startInline.forEach(Q=>{D=Q.call({lexer:this},q),typeof D=="number"&&D>=0&&(S=Math.min(S,D))}),S<1/0&&S>=0&&(E=e.substring(0,S+1))}if(u=this.tokenizer.inlineText(E)){e=e.substring(u.raw.length),u.raw.slice(-1)!=="_"&&(l=u.raw.slice(-1)),a=!0;let S=r.at(-1);(S==null?void 0:S.type)==="text"?(S.raw+=u.raw,S.text+=u.text):r.push(u);continue}if(e){this.infiniteLoopError(e.charCodeAt(0));break}}return r}infiniteLoopError(e){let r="Infinite loop on byte: "+e;if(this.options.silent)console.error(r);else throw new Error(r)}},ie=class{constructor(t){w(this,"options");w(this,"parser");this.options=t||U}space(t){return""}code({text:t,lang:e,escaped:r}){var s;let i=(s=(e||"").match(T.notSpaceStart))==null?void 0:s[0],n=t.replace(T.endingNewline,"")+`
`;return i?'<pre><code class="language-'+_(i)+'">'+(r?n:_(n,!0))+`</code></pre>
`:"<pre><code>"+(r?n:_(n,!0))+`</code></pre>
`}blockquote({tokens:t}){return`<blockquote>
${this.parser.parse(t)}</blockquote>
`}html({text:t}){return t}def(t){return""}heading({tokens:t,depth:e}){return`<h${e}>${this.parser.parseInline(t)}</h${e}>
`}hr(t){return`<hr>
`}list(t){let e=t.ordered,r=t.start,i="";for(let a=0;a<t.items.length;a++){let l=t.items[a];i+=this.listitem(l)}let n=e?"ol":"ul",s=e&&r!==1?' start="'+r+'"':"";return"<"+n+s+`>
`+i+"</"+n+`>
`}listitem(t){return`<li>${this.parser.parse(t.tokens)}</li>
`}checkbox({checked:t}){return"<input "+(t?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:t}){return`<p>${this.parser.parseInline(t)}</p>
`}table(t){let e="",r="";for(let n=0;n<t.header.length;n++)r+=this.tablecell(t.header[n]);e+=this.tablerow({text:r});let i="";for(let n=0;n<t.rows.length;n++){let s=t.rows[n];r="";for(let a=0;a<s.length;a++)r+=this.tablecell(s[a]);i+=this.tablerow({text:r})}return i&&(i=`<tbody>${i}</tbody>`),`<table>
<thead>
`+e+`</thead>
`+i+`</table>
`}tablerow({text:t}){return`<tr>
${t}</tr>
`}tablecell(t){let e=this.parser.parseInline(t.tokens),r=t.header?"th":"td";return(t.align?`<${r} align="${t.align}">`:`<${r}>`)+e+`</${r}>
`}strong({tokens:t}){return`<strong>${this.parser.parseInline(t)}</strong>`}em({tokens:t}){return`<em>${this.parser.parseInline(t)}</em>`}codespan({text:t}){return`<code>${_(t,!0)}</code>`}br(t){return"<br>"}del({tokens:t}){return`<del>${this.parser.parseInline(t)}</del>`}link({href:t,title:e,tokens:r}){let i=this.parser.parseInline(r),n=Pe(t);if(n===null)return i;t=n;let s='<a href="'+t+'"';return e&&(s+=' title="'+_(e)+'"'),s+=">"+i+"</a>",s}image({href:t,title:e,text:r,tokens:i}){i&&(r=this.parser.parseInline(i,this.parser.textRenderer));let n=Pe(t);if(n===null)return _(r);t=n;let s=`<img src="${t}" alt="${_(r)}"`;return e&&(s+=` title="${_(e)}"`),s+=">",s}text(t){return"tokens"in t&&t.tokens?this.parser.parseInline(t.tokens):"escaped"in t&&t.escaped?t.text:_(t.text)}},Ee=class{strong({text:t}){return t}em({text:t}){return t}codespan({text:t}){return t}del({text:t}){return t}html({text:t}){return t}text({text:t}){return t}link({text:t}){return""+t}image({text:t}){return""+t}br(){return""}checkbox({raw:t}){return t}},I=class fe{constructor(e){w(this,"options");w(this,"renderer");w(this,"textRenderer");this.options=e||U,this.options.renderer=this.options.renderer||new ie,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new Ee}static parse(e,r){return new fe(r).parse(e)}static parseInline(e,r){return new fe(r).parseInline(e)}parse(e){var i,n;this.renderer.parser=this;let r="";for(let s=0;s<e.length;s++){let a=e[s];if((n=(i=this.options.extensions)==null?void 0:i.renderers)!=null&&n[a.type]){let o=a,d=this.options.extensions.renderers[o.type].call({parser:this},o);if(d!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(o.type)){r+=d||"";continue}}let l=a;switch(l.type){case"space":{r+=this.renderer.space(l);break}case"hr":{r+=this.renderer.hr(l);break}case"heading":{r+=this.renderer.heading(l);break}case"code":{r+=this.renderer.code(l);break}case"table":{r+=this.renderer.table(l);break}case"blockquote":{r+=this.renderer.blockquote(l);break}case"list":{r+=this.renderer.list(l);break}case"checkbox":{r+=this.renderer.checkbox(l);break}case"html":{r+=this.renderer.html(l);break}case"def":{r+=this.renderer.def(l);break}case"paragraph":{r+=this.renderer.paragraph(l);break}case"text":{r+=this.renderer.text(l);break}default:{let o='Token with "'+l.type+'" type was not found.';if(this.options.silent)return console.error(o),"";throw new Error(o)}}}return r}parseInline(e,r=this.renderer){var n,s;this.renderer.parser=this;let i="";for(let a=0;a<e.length;a++){let l=e[a];if((s=(n=this.options.extensions)==null?void 0:n.renderers)!=null&&s[l.type]){let d=this.options.extensions.renderers[l.type].call({parser:this},l);if(d!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(l.type)){i+=d||"";continue}}let o=l;switch(o.type){case"escape":{i+=r.text(o);break}case"html":{i+=r.html(o);break}case"link":{i+=r.link(o);break}case"image":{i+=r.image(o);break}case"checkbox":{i+=r.checkbox(o);break}case"strong":{i+=r.strong(o);break}case"em":{i+=r.em(o);break}case"codespan":{i+=r.codespan(o);break}case"br":{i+=r.br(o);break}case"del":{i+=r.del(o);break}case"text":{i+=r.text(o);break}default:{let d='Token with "'+o.type+'" type was not found.';if(this.options.silent)return console.error(d),"";throw new Error(d)}}}return i}},re,K=(re=class{constructor(t){w(this,"options");w(this,"block");this.options=t||U}preprocess(t){return t}postprocess(t){return t}processAllTokens(t){return t}emStrongMask(t){return t}provideLexer(t=this.block){return t?R.lex:R.lexInline}provideParser(t=this.block){return t?I.parse:I.parseInline}},w(re,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),w(re,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),re),Xr=class{constructor(...t){w(this,"defaults",xe());w(this,"options",this.setOptions);w(this,"parse",this.parseMarkdown(!0));w(this,"parseInline",this.parseMarkdown(!1));w(this,"Parser",I);w(this,"Renderer",ie);w(this,"TextRenderer",Ee);w(this,"Lexer",R);w(this,"Tokenizer",ne);w(this,"Hooks",K);this.use(...t)}walkTokens(t,e){var i,n;let r=[];for(let s of t)switch(r=r.concat(e.call(this,s)),s.type){case"table":{let a=s;for(let l of a.header)r=r.concat(this.walkTokens(l.tokens,e));for(let l of a.rows)for(let o of l)r=r.concat(this.walkTokens(o.tokens,e));break}case"list":{let a=s;r=r.concat(this.walkTokens(a.items,e));break}default:{let a=s;(n=(i=this.defaults.extensions)==null?void 0:i.childTokens)!=null&&n[a.type]?this.defaults.extensions.childTokens[a.type].forEach(l=>{let o=a[l].flat(1/0);r=r.concat(this.walkTokens(o,e))}):a.tokens&&(r=r.concat(this.walkTokens(a.tokens,e)))}}return r}use(...t){let e=this.defaults.extensions||{renderers:{},childTokens:{}};return t.forEach(r=>{let i={...r};if(i.async=this.defaults.async||i.async||!1,r.extensions&&(r.extensions.forEach(n=>{if(!n.name)throw new Error("extension name required");if("renderer"in n){let s=e.renderers[n.name];s?e.renderers[n.name]=function(...a){let l=n.renderer.apply(this,a);return l===!1&&(l=s.apply(this,a)),l}:e.renderers[n.name]=n.renderer}if("tokenizer"in n){if(!n.level||n.level!=="block"&&n.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let s=e[n.level];s?s.unshift(n.tokenizer):e[n.level]=[n.tokenizer],n.start&&(n.level==="block"?e.startBlock?e.startBlock.push(n.start):e.startBlock=[n.start]:n.level==="inline"&&(e.startInline?e.startInline.push(n.start):e.startInline=[n.start]))}"childTokens"in n&&n.childTokens&&(e.childTokens[n.name]=n.childTokens)}),i.extensions=e),r.renderer){let n=this.defaults.renderer||new ie(this.defaults);for(let s in r.renderer){if(!(s in n))throw new Error(`renderer '${s}' does not exist`);if(["options","parser"].includes(s))continue;let a=s,l=r.renderer[a],o=n[a];n[a]=(...d)=>{let c=l.apply(n,d);return c===!1&&(c=o.apply(n,d)),c||""}}i.renderer=n}if(r.tokenizer){let n=this.defaults.tokenizer||new ne(this.defaults);for(let s in r.tokenizer){if(!(s in n))throw new Error(`tokenizer '${s}' does not exist`);if(["options","rules","lexer"].includes(s))continue;let a=s,l=r.tokenizer[a],o=n[a];n[a]=(...d)=>{let c=l.apply(n,d);return c===!1&&(c=o.apply(n,d)),c}}i.tokenizer=n}if(r.hooks){let n=this.defaults.hooks||new K;for(let s in r.hooks){if(!(s in n))throw new Error(`hook '${s}' does not exist`);if(["options","block"].includes(s))continue;let a=s,l=r.hooks[a],o=n[a];K.passThroughHooks.has(s)?n[a]=d=>{if(this.defaults.async&&K.passThroughHooksRespectAsync.has(s))return(async()=>{let p=await l.call(n,d);return o.call(n,p)})();let c=l.call(n,d);return o.call(n,c)}:n[a]=(...d)=>{if(this.defaults.async)return(async()=>{let p=await l.apply(n,d);return p===!1&&(p=await o.apply(n,d)),p})();let c=l.apply(n,d);return c===!1&&(c=o.apply(n,d)),c}}i.hooks=n}if(r.walkTokens){let n=this.defaults.walkTokens,s=r.walkTokens;i.walkTokens=function(a){let l=[];return l.push(s.call(this,a)),n&&(l=l.concat(n.call(this,a))),l}}this.defaults={...this.defaults,...i}}),this}setOptions(t){return this.defaults={...this.defaults,...t},this}lexer(t,e){return R.lex(t,e??this.defaults)}parser(t,e){return I.parse(t,e??this.defaults)}parseMarkdown(t){return(e,r)=>{let i={...r},n={...this.defaults,...i},s=this.onError(!!n.silent,!!n.async);if(this.defaults.async===!0&&i.async===!1)return s(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof e>"u"||e===null)return s(new Error("marked(): input parameter is undefined or null"));if(typeof e!="string")return s(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(e)+", string expected"));if(n.hooks&&(n.hooks.options=n,n.hooks.block=t),n.async)return(async()=>{let a=n.hooks?await n.hooks.preprocess(e):e,l=await(n.hooks?await n.hooks.provideLexer(t):t?R.lex:R.lexInline)(a,n),o=n.hooks?await n.hooks.processAllTokens(l):l;n.walkTokens&&await Promise.all(this.walkTokens(o,n.walkTokens));let d=await(n.hooks?await n.hooks.provideParser(t):t?I.parse:I.parseInline)(o,n);return n.hooks?await n.hooks.postprocess(d):d})().catch(s);try{n.hooks&&(e=n.hooks.preprocess(e));let a=(n.hooks?n.hooks.provideLexer(t):t?R.lex:R.lexInline)(e,n);n.hooks&&(a=n.hooks.processAllTokens(a)),n.walkTokens&&this.walkTokens(a,n.walkTokens);let l=(n.hooks?n.hooks.provideParser(t):t?I.parse:I.parseInline)(a,n);return n.hooks&&(l=n.hooks.postprocess(l)),l}catch(a){return s(a)}}}onError(t,e){return r=>{if(r.message+=`
Please report this to https://github.com/markedjs/marked.`,t){let i="<p>An error occurred:</p><pre>"+_(r.message+"",!0)+"</pre>";return e?Promise.resolve(i):i}if(e)return Promise.reject(r);throw r}}},H=new Xr;function b(t,e){return H.parse(t,e)}b.options=b.setOptions=function(t){return H.setOptions(t),b.defaults=H.defaults,Ne(b.defaults),b};b.getDefaults=xe;b.defaults=U;b.use=function(...t){return H.use(...t),b.defaults=H.defaults,Ne(b.defaults),b};b.walkTokens=function(t,e){return H.walkTokens(t,e)};b.parseInline=H.parseInline;b.Parser=I;b.parser=I.parse;b.Renderer=ie;b.TextRenderer=Ee;b.Lexer=R;b.lexer=R.lex;b.Tokenizer=ne;b.Hooks=K;b.parse=b;b.options;b.setOptions;b.use;b.walkTokens;b.parseInline;I.parse;R.lex;const ge=`# canvas-editor-core 外部 API 文档\r
\r
本文档面向接入编辑器的前端开发者，说明如何初始化编辑器、调用图片和文字 API、\r
维护图层和业务属性、监听事件，以及如何将编辑结果交给移动端 H5 页面渲染。\r
\r
> 在线阅读：启动项目后访问 \`#/docs\`。编辑器页面为 \`#/editor\`，H5 页面为 \`#/h5-preview\`。\r
\r
## 阅读路线\r
\r
| 目标 | 建议阅读 |\r
| --- | --- |\r
| 第一次接入编辑器 | “10 分钟快速上手” → “调用边界” → “生命周期” |\r
| 开发 Vue 面板 | “Vue 应用层调用” → “元素业务属性” → “事件” |\r
| 添加文字或图片 | “图片” → “文本” → “选择” |\r
| 开发图层功能 | “图层插件” → “选择” → “事件” |\r
| 对接移动端 H5 | “移动端 H5 文档协议” → “元素业务属性” |\r
| 排查问题 | “错误处理与调试” → 对应 API 章节 |\r
\r
## 10 分钟快速上手\r
\r
### 1. 准备挂载容器\r
\r
编辑器会占满传入的 DOM 容器。容器必须具有可计算的宽高。\r
\r
\`\`\`vue\r
<template>\r
  <div ref="canvasRef" class="canvas-host"></div>\r
</template>\r
\r
<style scoped>\r
.canvas-host {\r
  width: 100%;\r
  height: 100%;\r
  min-height: 600px;\r
}\r
</style>\r
\`\`\`\r
\r
### 2. 创建和销毁编辑器\r
\r
\`\`\`vue\r
<script setup>\r
import { onBeforeUnmount, onMounted, ref } from 'vue'\r
import { createEditor } from '@/canvas-editor-core/src/index.js'\r
\r
const canvasRef = ref(null)\r
let editor = null\r
\r
onMounted(() => {\r
  editor = createEditor({\r
    view: canvasRef.value,\r
    autoResize: true,\r
    artboard: {\r
      width: 375,\r
      height: 667,\r
      fill: '#ffffff'\r
    }\r
  })\r
})\r
\r
onBeforeUnmount(() => {\r
  editor?.destroy()\r
  editor = null\r
})\r
<\/script>\r
\`\`\`\r
\r
### 3. 添加内容\r
\r
\`\`\`js\r
const title = await editor.text.add('活动标题', {\r
  fontSize: 32,\r
  fontWeight: 700,\r
  fill: '#1f2937',\r
  textAlign: 'center'\r
})\r
\r
const image = await editor.image.add('/images/product.png', {\r
  width: 240,\r
  lockRatio: true\r
})\r
\`\`\`\r
\r
图片添加是异步操作，必须使用 \`await\` 或处理返回的 Promise。\r
\r
### 4. 修改当前元素\r
\r
\`\`\`js\r
editor.select(title)\r
\r
editor.text.update({\r
  text: '新的活动标题',\r
  fontSize: 40,\r
  fill: '#7c3aed'\r
})\r
\`\`\`\r
\r
### 5. 添加供 H5 使用的业务属性\r
\r
渲染属性和业务属性必须分开保存。不要把 \`action\`、埋点或输入规则直接写到\r
Leafer 的 \`x\`、\`fill\` 等渲染数据中。\r
\r
\`\`\`js\r
editor.elementData.set(title, {\r
  textInput: {\r
    enabled: true,\r
    characterSet: 'any',\r
    allowManualNewline: true,\r
    allowSymbols: true,\r
    maxCharactersPerLine: 20,\r
    maxCharacters: 100,\r
    maxLines: 4\r
  }\r
})\r
\`\`\`\r
\r
## 调用边界\r
\r
项目分为三层。新增功能时应先确定代码属于哪一层。\r
\r
| 层级 | 主要目录 | 职责 | 不应该做的事 |\r
| --- | --- | --- | --- |\r
| 编辑器内核 | \`src/canvas-editor-core\` | Leafer 节点、插件、命令、选区、画板 | 引用 Vue 组件或页面状态 |\r
| Vue 调用层 | \`src/composables/canvas-editor\` | 将内核 API 转为 \`ref\` 和业务方法 | 直接修改 Leafer 私有字段 |\r
| 页面组件 | \`src/components\`、\`src/views\` | 表单、按钮、交互展示 | 在模板中操作 \`contentLayer.children\` |\r
\r
推荐原则：\r
\r
1. 页面组件只调用 composable 暴露的方法。\r
2. composable 通过 \`Editor\` 外观或插件公开方法操作画布。\r
3. 只有内核插件可以集中处理 Leafer 节点细节。\r
4. 组件卸载时必须销毁编辑器和事件订阅。\r
5. 跨页面传输的数据必须是普通、可 JSON 序列化的对象。\r
\r
## 模块总览\r
\r
编辑器对外 API 按职责划分为以下模块。业务代码应优先调用模块公开方法，不跨模块读取\r
下划线字段、私有字段或 Leafer 内部状态。\r
\r
| 模块 | 主要入口 | 源码位置 | 负责内容 |\r
| --- | --- | --- | --- |\r
| Core | \`createEditor()\`、\`Editor\` | \`canvas-editor-core/src/core\` | 创建实例、统一外观、生命周期 |\r
| Canvas / Artboard | \`editor.resize()\`、\`editor.artboard\` | \`core/Editor.js\`、\`artboard.js\` | 外层画布、白色画板、画板边界 |\r
| Viewport | \`editor.setZoom()\` | \`viewport\` | 缩放、居中、适配视口 |\r
| Selection | \`editor.select()\` | \`core/Editor.js\`、\`@leafer-in/editor\` | 单选、多选、取消选中 |\r
| Layer | \`editor.layer\` | \`plugins/feature-plugins/layer\` | 图层 DTO、排序、锁定、删除、高亮 |\r
| Image | \`editor.image\` | \`plugins/feature-plugins/image\` | URL、File、Blob、SVG 图片创建 |\r
| Text | \`editor.text\` | \`plugins/feature-plugins/text\` | 文字创建、样式更新、原位编辑 |\r
| EventBus | \`editor.eventBus\` | \`logic/event-bus.js\` | 内核向应用层发送状态变化 |\r
| Command | \`editor.commands\` | \`commands\` | 命令执行及撤销重做历史 |\r
| ElementData | \`editor.elementData\` | \`plugins/feature-plugins/element-data\` | 稳定元素 ID 和 H5 业务属性 |\r
| Vue Adapter | \`useCanvasEditor()\` | \`composables/canvas-editor\` | 将内核状态转换为 Vue \`ref\` 和方法 |\r
| H5 Document | \`exportH5Document()\` | \`services/h5-document.js\` | 导出跨页面、可持久化的 H5 JSON |\r
\r
### 模块调用关系\r
\r
\`\`\`text\r
Vue 页面 / 面板\r
    ↓ 调用\r
useCanvasEditor 与业务 composable\r
    ↓ 调用\r
Editor 外观\r
    ├── Viewport / Command / EventBus\r
    ├── Artboard / Selection\r
    └── PluginManager\r
          ├── ImagePlugin\r
          ├── TextPlugin\r
          ├── LayerPlugin\r
          └── ElementDataPlugin\r
\r
Editor + ElementData\r
    ↓ exportH5Document()\r
移动端 H5 JSON\r
\`\`\`\r
\r
模块之间通过公开 API 和事件协作。比如图层面板删除元素时应调用\r
\`editor.layer.remove(id)\`，由 Layer 模块同步选区、画板覆盖层和事件；组件不应只执行\r
\`node.remove()\`。\r
\r
### 返回值约定\r
\r
| API 类型 | 返回值 | 使用方式 |\r
| --- | --- | --- |\r
| \`Editor\` 设置方法 | 当前 \`Editor\` 实例 | 可以链式调用，例如 \`editor.setZoom(1.2).setShowGrid(false)\` |\r
| 图片新增 | \`Promise<Image>\` | 必须 \`await editor.image.add(...)\` |\r
| 文字新增 | \`Promise<Text>\` | 必须 \`await editor.text.add(...)\` |\r
| 文字更新 | \`Text\` 节点 | 可继续传给 \`select()\` 或业务属性插件 |\r
| 图层查询 | 图层 DTO 数组 | 只用于 UI 展示和调用图层 API，不代表持久化数据 |\r
| 业务属性查询 | 深拷贝普通对象 | 修改返回对象不会直接修改画布节点 |\r
| \`eventBus.on()\` | 取消订阅函数 | 组件卸载时调用该函数 |\r
| \`destroy()\` | \`void\` | 销毁后不要继续复用实例 |\r
\r
### 命名约定\r
\r
- \`editor.*\`：Editor 外观提供的跨模块高层操作。\r
- \`editor.image.*\`、\`editor.text.*\`：具体内容插件。\r
- \`editor.layer.*\`：图层面板所需的场景树操作。\r
- \`editor.elementData.*\`：与渲染属性隔离的业务数据。\r
- \`editor.eventBus.*\`：内核向 Vue 应用层发出的通知。\r
- \`useXxxControls()\`：Vue 应用层适配器，不属于内核公开 API。\r
- 以下划线或 \`#\` 开头的字段属于内部实现，不应从业务代码调用。\r
\r
## Vue 应用层调用\r
\r
当前完整编辑器页面使用 \`useCanvasEditor()\`。它负责创建编辑器、同步 Vue 状态和\r
在组件卸载时销毁实例。\r
\r
\`\`\`js\r
import { useCanvasEditor } from '@/composables/useCanvasEditor.js'\r
\r
const editor = useCanvasEditor()\r
\`\`\`\r
\r
模板中使用组合后的状态和方法：\r
\r
\`\`\`vue\r
<CanvasWorkspace :editor="editor" />\r
\r
<v-btn @click="editor.addText">添加文字</v-btn>\r
<v-btn @click="editor.openImagePicker">上传图片</v-btn>\r
<v-btn @click="editor.zoomIn">放大</v-btn>\r
\`\`\`\r
\r
只有需要接入内核未封装能力时，才使用：\r
\r
\`\`\`js\r
const coreEditor = editor.getEditor()\r
\r
if (coreEditor) {\r
  coreEditor.setShowGrid(false)\r
}\r
\`\`\`\r
\r
\`getEditor()\` 在组件挂载前可能返回 \`null\`，调用前必须判断。\r
\r
## Alova API 请求层\r
\r
> **Request 模块** · 统一客户端：\`alovaClient\` · 业务接口：\`editorDocumentApi\`\r
\r
请求层与编辑器内核保持隔离。Vue 组件负责收集用户操作和展示请求状态，接口模块负责描述\r
URL、请求方法与参数，Alova 核心层统一处理基础地址、超时、鉴权和错误。\r
\r
### 目录职责\r
\r
| 文件 | 职责 |\r
| --- | --- |\r
| \`src/api/core/alova-client.js\` | 创建 Alova 单例，处理 Token、HTTP 状态和网络错误。 |\r
| \`src/api/core/api-error.js\` | 提供统一的 \`ApiError\`。 |\r
| \`src/api/modules/editor-document.js\` | 编辑器文档接口示例，包含列表、详情、新建、更新和删除。 |\r
| \`src/api/index.js\` | 统一导出，业务代码只从该入口引用。 |\r
\r
新增业务接口时，在 \`src/api/modules/\` 下按业务域创建文件，例如\r
\`material.js\`、\`template.js\`，不要把所有接口堆放到 \`alova-client.js\`。\r
\r
### 环境配置\r
\r
客户端从 Vite 环境变量读取基础地址：\r
\r
\`\`\`dotenv\r
VITE_BASE_URL_API = https://pceditor.ele007.com/\r
\`\`\`\r
\r
编辑器文档示例默认请求 \`/editor/documents\`。后端路径不一致时，可以增加：\r
\r
\`\`\`dotenv\r
VITE_EDITOR_DOCUMENT_API_PATH = /实际接口路径\r
\`\`\`\r
\r
修改环境变量后需要重启 Vite 开发服务。\r
\r
### 应用初始化\r
\r
鉴权配置是可选的，不会假定项目使用哪个 \`localStorage\` Key。需要鉴权时，在应用入口调用\r
一次 \`configureApiClient()\`：\r
\r
\`\`\`js\r
import { configureApiClient } from '@/api/index.js'\r
import { router } from '@/router/index.js'\r
\r
configureApiClient({\r
  getAccessToken: () => localStorage.getItem('access_token'),\r
  onUnauthorized: () => {\r
    localStorage.removeItem('access_token')\r
    router.push('/login')\r
  }\r
})\r
\`\`\`\r
\r
调用方已显式传入 \`Authorization\` 时，请求层不会覆盖。公开接口可以在 Method 配置中设置\r
\`meta: { skipAuth: true }\` 跳过 Token。\r
\r
### 直接调用\r
\r
模块方法返回 Alova \`Method\`，它是可等待对象，适合普通异步流程：\r
\r
\`\`\`js\r
import { editorDocumentApi } from '@/api/index.js'\r
\r
const result = await editorDocumentApi.create({\r
  name: '活动首页',\r
  document: editorJson\r
})\r
\r
console.log('保存结果', result)\r
\`\`\`\r
\r
### Vue Composition API 调用\r
\r
页面需要 \`loading\`、\`data\` 和 \`error\` 状态时，使用 Alova 的 \`useRequest\`：\r
\r
\`\`\`js\r
import { useRequest } from 'alova'\r
\r
import { editorDocumentApi } from '@/api/index.js'\r
\r
const {\r
  loading: saving,\r
  data: savedDocument,\r
  error: saveError,\r
  send: saveDocument\r
} = useRequest(editorDocumentApi.create, {\r
  immediate: false\r
})\r
\r
async function handleSave(editorJson) {\r
  return saveDocument({\r
    name: '活动首页',\r
    document: editorJson\r
  })\r
}\r
\`\`\`\r
\r
组件不应直接引用 \`alovaClient.Post()\` 拼装业务接口。这样接口路径变化时只修改对应的\r
\`src/api/modules/\` 文件，不会影响页面交互和编辑器核心逻辑。\r
\r
### 保存编辑器 JSON 示例\r
\r
\`\`\`js\r
import { editorDocumentApi } from '@/api/index.js'\r
import { exportH5Document } from '@/services/h5-document.js'\r
\r
async function saveCurrentDocument(editor) {\r
  const document = await exportH5Document(editor.getEditor())\r
\r
  return editorDocumentApi.create({\r
    name: '未命名页面',\r
    document\r
  })\r
}\r
\`\`\`\r
\r
当前 \`editorDocumentApi\` 是接入结构示例。正式联调时只需要按后端契约调整接口路径、字段\r
和请求方法，不要把 Leafer 节点或 Editor 实例直接发送到后端。\r
\r
### 错误处理\r
\r
HTTP 非 2xx、网络异常、超时和主动取消都会转换为 \`ApiError\`：\r
\r
\`\`\`js\r
import { ApiError, editorDocumentApi } from '@/api/index.js'\r
\r
try {\r
  await editorDocumentApi.detail(documentId)\r
} catch (error) {\r
  if (error instanceof ApiError) {\r
    console.error(error.code, error.status, error.request)\r
  }\r
  throw error\r
}\r
\`\`\`\r
\r
默认返回服务端响应体。如果某个接口需要读取状态码或响应头，在 Method 配置中设置\r
\`meta: { responseMode: 'raw' }\`，该接口会返回完整 XHR 响应。\r
\r
## 常见业务流程\r
\r
### 上传背景图\r
\r
背景图以图片原始像素宽高同步画板尺寸。上传完成后画板自动缩放为当前\r
\`workspace-stage\` 可用区域的 80%，并保持水平、垂直居中。\r
\r
\`\`\`js\r
const imageSize = await editor.image.getSize(file)\r
const background = await editor.image.add(file, {\r
  width: imageSize.width,\r
  height: imageSize.height,\r
  lockRatio: false\r
})\r
\r
editor.setArtboardSize(imageSize.width, imageSize.height)\r
editor.fitArtboardToView({\r
  viewportRatio: 0.8,\r
  expandZoomRange: true\r
})\r
\`\`\`\r
\r
应用层已经通过 \`editor.openBackgroundImagePicker()\` 和\r
\`editor.handleBackgroundImageChange(event)\` 封装完整流程。页面组件只负责触发文件\r
选择，不需要读取图片尺寸、修改节点或计算工作区缩放。\r
\r
### 图层列表\r
\r
图层 UI 不应直接排序 \`contentLayer.children\`，应调用图层插件：\r
\r
\`\`\`js\r
const layers = editor.layer.getList()\r
editor.layer.reorder(layers.map((item) => item.id))\r
editor.layer.toggleLock(layers[0].id)\r
editor.layer.remove(layers[0].id)\r
\`\`\`\r
\r
### H5 预览\r
\r
项目中的 \`exportH5Document()\` 会将画板内容转为稳定协议，并把坐标原点转换到画板\r
左上角。不要直接把完整 Leafer 实例写入 \`localStorage\` 或发送给后端。\r
\r
\`\`\`js\r
import { exportH5Document } from '@/services/h5-document.js'\r
\r
const payload = await exportH5Document(editor.getEditor())\r
await api.saveTemplate(payload)\r
\`\`\`\r
\r
## 错误处理与调试\r
\r
内核参数错误通常抛出 \`EditorError\`。业务代码应保留错误码，用户界面展示可理解的\r
提示，控制台记录原始错误。\r
\r
\`\`\`js\r
import { EditorError } from '@/canvas-editor-core/src/index.js'\r
\r
try {\r
  await editor.image.add(file)\r
} catch (error) {\r
  if (error instanceof EditorError) {\r
    console.error(error.code, error.message)\r
  }\r
  throw error\r
}\r
\`\`\`\r
\r
常见排查项：\r
\r
- 编辑器没有显示：检查挂载容器是否有宽高、\`view\` 是否存在。\r
- API 没反应：确认组件已经挂载，\`getEditor()\` 不是 \`null\`。\r
- 图片没有加载：检查 URL、跨域策略或 Blob 是否仍然有效。\r
- H5 页面图片失效：使用 \`exportH5Document()\`，它会把 Blob URL 转为 Data URL。\r
- Vue 状态没有更新：确认是否订阅了对应 \`eventBus\` 事件。\r
- 选区行为异常：不要直接修改 \`innerEditor.list\`，使用 \`select()\` / \`deselect()\`。\r
\r
### 常用错误码\r
\r
| 模块 | 错误码 | 含义及处理建议 |\r
| --- | --- | --- |\r
| Core | \`INIT_OPTIONS_REQUIRED\` | 初始化参数不是对象，检查 \`createEditor(options)\` 调用。 |\r
| Core | \`VIEW_REQUIRED\` | 未提供挂载容器。 |\r
| Core | \`VIEW_NOT_FOUND\` | 字符串选择器没有找到 DOM。 |\r
| Core | \`EDITOR_DESTROYED\` | 实例已销毁，需要重新创建，不能继续调用旧引用。 |\r
| Canvas | \`AREA_TYPE_INVALID\` | \`areaType\` 只能是 \`grid\` 或 \`blank\`。 |\r
| Canvas | \`SHOW_GRID_INVALID\` | \`showGrid\` 必须是布尔值。 |\r
| Artboard | \`ARTBOARD_SIZE_INVALID\` | 画板宽高或最小宽高不是正数。 |\r
| Viewport | \`ZOOM_RANGE_INVALID\` | \`zoom.min\` 大于 \`zoom.max\`。 |\r
| Image | \`IMAGE_SOURCE_INVALID\` | 图片来源不是 URL、SVG 字符串、\`File\` 或 \`Blob\`。 |\r
| Image | \`IMAGE_ADD_FAILED\` | 图片读取或节点创建失败，继续检查 URL、跨域和文件内容。 |\r
| Text | \`TEXT_VALUE_INVALID\` | 文本内容不是字符串或数字。 |\r
| Text | \`TEXT_TARGET_INVALID\` | \`text.update()\` 的目标不是 Text 节点。 |\r
| Text | \`TEXT_SELECTION_REQUIRED\` | 调用省略目标的更新方法时，没有选中文字。 |\r
| Text | \`TEXT_ALIGN_INVALID\` | 文本对齐值不在支持范围。 |\r
| Text | \`TEXT_WRITING_MODE_INVALID\` | 文字方向不是 \`x\`、\`y\` 或 \`y-reverse\`。 |\r
| ElementData | \`ELEMENT_DATA_TARGET_REQUIRED\` | 当前不是单选状态，且调用时没有传目标节点。 |\r
| ElementData | \`ELEMENT_DATA_TARGET_NOT_FOUND\` | 指定 \`elementId\` 已不存在。 |\r
| Plugin | \`PLUGIN_DUPLICATED\` | 相同 ID 的插件被重复注册。 |\r
\r
## API 速查\r
\r
| 任务 | 推荐 API |\r
| --- | --- |\r
| 创建编辑器 | \`createEditor(options)\` |\r
| 调整画板 | \`editor.setArtboardSize(width, height)\` |\r
| 适配画板到视口 | \`editor.fitArtboardToView(options)\` |\r
| 添加图片 | \`await editor.image.add(source, options)\` |\r
| 添加文字 | \`await editor.text.add(content, options)\` |\r
| 更新文字 | \`editor.text.update(target, options)\` |\r
| 选择/取消选择 | \`editor.select(target)\` / \`editor.deselect()\` |\r
| 获取图层 | \`editor.layer.getList()\` |\r
| 排序图层 | \`editor.layer.reorder(ids)\` |\r
| 写入业务属性 | \`editor.elementData.set(target, attributes)\` |\r
| 导出业务属性 | \`editor.elementData.export()\` |\r
| 监听变化 | \`editor.eventBus.on(eventName, handler)\` |\r
| 销毁编辑器 | \`editor.destroy()\` |\r
\r
## 核心层初始化示例\r
\r
当前项目是 Vite + Vue，运行后可在 \`#/editor\` 查看完整接入示例。\r
\r
\`\`\`bash\r
npm run dev\r
\`\`\`\r
\r
\`\`\`js\r
import { onBeforeUnmount, onMounted, ref } from 'vue'\r
import { createEditor } from './canvas-editor-core/src/index.js'\r
\r
const canvasRef = ref(null)\r
let editor = null\r
\r
onMounted(() => {\r
  editor = createEditor({\r
    view: canvasRef.value,\r
    autoResize: true,\r
    artboard: {\r
      width: 375,\r
      height: 667,\r
      overflowOpacity: 0.2\r
    }\r
  })\r
})\r
\r
onBeforeUnmount(() => {\r
  editor?.destroy()\r
  editor = null\r
})\r
\`\`\`\r
\r
## 入口 API\r
\r
> **Core 模块** · 入口：\`createEditor()\` / \`init()\` · 源码：\`canvas-editor-core/src/index.js\`\r
\r
### \`createEditor(options)\`\r
\r
创建并返回一个 \`Editor\` 实例，是推荐使用的初始化入口。\r
\r
\`\`\`js\r
import { createEditor } from './canvas-editor-core/src/index.js'\r
\r
const editor = createEditor({\r
  view: document.querySelector('#canvas'),\r
  width: 750,\r
  height: 1334,\r
  autoResize: true\r
})\r
\`\`\`\r
\r
常用 \`options\`：\r
\r
| 字段 | 类型 | 说明 |\r
| --- | --- | --- |\r
| \`view\` | \`HTMLElement \\| string\` | 挂载编辑器的 DOM 容器或选择器。 |\r
| \`width\` | \`number\` | 外层画布宽度。 |\r
| \`height\` | \`number\` | 外层画布高度。 |\r
| \`autoResize\` | \`boolean\` | 是否跟随容器尺寸自动调整。 |\r
| \`background\` | \`string\` | 外层画布背景色。 |\r
| \`showGrid\` | \`boolean\` | 是否显示网格。 |\r
| \`areaType\` | \`'grid' \\| 'blank'\` | 外层区域显示类型。 |\r
| \`zoom\` | \`Object\` | 缩放配置，包含 \`min\`、\`max\`、\`step\`、\`initial\`。 |\r
| \`image\` | \`Object\` | 图片新增默认配置。 |\r
| \`text\` | \`Object\` | 文本新增默认配置。 |\r
| \`artboard\` | \`Object\` | 内层白色画板配置。 |\r
| \`editor\` | \`Object\` | Leafer 官方 Editor 与自定义控件配置。 |\r
| \`leaferOptions\` | \`Object\` | 透传给 Leafer App 的底层配置。 |\r
\r
### \`init(options)\`\r
\r
\`createEditor(options)\` 的兼容别名，旧代码可以继续使用。\r
\r
\`\`\`js\r
import { init } from './canvas-editor-core/src/index.js'\r
\r
const editor = init({ view: canvasRef.value })\r
\`\`\`\r
\r
## Editor 实例属性\r
\r
> **Core 模块** · 外观对象：\`Editor\` · 源码：\`canvas-editor-core/src/core/Editor.js\`\r
\r
\`\`\`js\r
const editor = createEditor({ view: canvasRef.value })\r
\`\`\`\r
\r
| 属性 | 说明 |\r
| --- | --- |\r
| \`editor.leafer\` | Leafer App 根实例，高级调试使用。 |\r
| \`editor.stage\` | 缩放容器。 |\r
| \`editor.contentLayer\` | 可编辑内容层，图片、文本等元素都在这里。 |\r
| \`editor.skyLeafer\` | 官方 Editor 覆盖层。 |\r
| \`editor.state\` | 编辑器状态代理，读取当前宽高、缩放、配置等。 |\r
| \`editor.eventBus\` | 事件总线。 |\r
| \`editor.pluginManager\` | 插件管理器。 |\r
| \`editor.image\` | 图片插件实例。 |\r
| \`editor.text\` | 文本插件实例。 |\r
| \`editor.layer\` | 图层插件实例。 |\r
| \`editor.elementData\` | 元素业务属性插件实例。 |\r
| \`editor.editor\` | Leafer 官方 Editor 实例。 |\r
| \`editor.artboard\` | 内层白色画板管理器。 |\r
| \`editor.commands\` | 命令管理器。 |\r
| \`editor.selectedElements\` | 当前选中的元素列表。 |\r
| \`editor.isEditing\` | 是否处于编辑中。 |\r
| \`editor.isMultipleSelect\` | 是否多选。 |\r
| \`editor.zoom\` | 当前缩放值，兼容旧代码，推荐读 \`editor.state.zoom\`。 |\r
\r
## 画布与画板\r
\r
> **Canvas / Artboard 模块** · 入口：\`editor.*\` / \`editor.artboard\` · 源码：\`core/Editor.js\`、\`artboard.js\`\r
\r
### \`editor.resize(width, height)\`\r
\r
调整外层画布尺寸。\r
\r
\`\`\`js\r
editor.resize(750, 1334)\r
\`\`\`\r
\r
### \`editor.setBackground(color)\`\r
\r
设置外层画布背景色。\r
\r
\`\`\`js\r
editor.setBackground('#f7f8fa')\r
\`\`\`\r
\r
### \`editor.setShowGrid(show)\`\r
\r
显示或隐藏网格。\r
\r
\`\`\`js\r
editor.setShowGrid(false)\r
\`\`\`\r
\r
### \`editor.setAreaType(type)\`\r
\r
设置外层区域类型。\r
\r
\`\`\`js\r
editor.setAreaType('grid')\r
editor.setAreaType('blank')\r
\`\`\`\r
\r
### \`editor.setGrid(options)\`\r
\r
合并更新网格配置。\r
\r
\`\`\`js\r
editor.setGrid({\r
  size: 24,\r
  color: '#eef1f5',\r
  majorSize: 120,\r
  majorColor: '#dce2ea'\r
})\r
\`\`\`\r
\r
### \`editor.setArtboardSize(width, height)\`\r
\r
调整当前白色画板尺寸。后续新增图片、文本默认会以白色画板作为操作区域。\r
\r
\`\`\`js\r
editor.setArtboardSize(375, 667)\r
\`\`\`\r
\r
### \`editor.artboard.getContentBounds()\`\r
\r
获取白色画板在内容坐标系下的边界。\r
\r
\`\`\`js\r
const bounds = editor.artboard.getContentBounds()\r
// { x, y, width, height }\r
\`\`\`\r
\r
### \`editor.artboard.getWorldBounds()\`\r
\r
获取白色画板在世界坐标系下的边界，吸附和高级命中计算可使用。\r
\r
\`\`\`js\r
const worldBounds = editor.artboard.getWorldBounds()\r
\`\`\`\r
\r
## 缩放\r
\r
> **Viewport 模块** · 入口：\`editor.setZoom()\` 等 · 源码：\`canvas-editor-core/src/viewport\`\r
\r
### \`editor.setZoom(zoom)\`\r
\r
设置缩放值，会被 \`zoom.min\` / \`zoom.max\` 自动钳位。\r
\r
\`\`\`js\r
editor.setZoom(1.5)\r
\`\`\`\r
\r
### \`editor.zoomIn(step)\`\r
\r
放大画布，不传 \`step\` 时使用配置里的 \`zoom.step\`。\r
\r
\`\`\`js\r
editor.zoomIn()\r
editor.zoomIn(0.2)\r
\`\`\`\r
\r
### \`editor.zoomOut(step)\`\r
\r
缩小画布。\r
\r
\`\`\`js\r
editor.zoomOut()\r
\`\`\`\r
\r
### \`editor.resetZoom()\`\r
\r
重置为初始化缩放值。\r
\r
\`\`\`js\r
editor.resetZoom()\r
\`\`\`\r
\r
### \`editor.fitArtboardToView(options)\`\r
\r
自动计算缩放和位移，使白色画板完整显示在当前编辑器容器中。\r
\r
\`\`\`js\r
editor.fitArtboardToView()\r
editor.fitArtboardToView(32)\r
editor.fitArtboardToView({ viewportRatio: 0.8 })\r
\`\`\`\r
\r
数字参数保持兼容，表示画板与视口边缘保留的像素间距。对象参数：\r
\r
| 字段 | 类型 | 默认值 | 说明 |\r
| --- | --- | --- | --- |\r
| \`padding\` | \`number\` | \`0\` | 可用视口四周预留的像素。 |\r
| \`viewportRatio\` | \`number\` | \`1\` | 画板最长边占可用视口的比例，范围 \`0.05-1\`。 |\r
| \`expandZoomRange\` | \`boolean\` | \`false\` | 是否扩展缩放上下限以精确达到目标比例。 |\r
\r
上传背景图使用 \`{ viewportRatio: 0.8, expandZoomRange: true }\`，确保任意图片尺寸都能\r
以工作区 80% 的比例居中显示。\r
\r
### \`editor.centerArtboard()\`\r
\r
保持当前缩放不变，只将画板移动到视口中心。\r
\r
\`\`\`js\r
editor.centerArtboard()\r
\`\`\`\r
\r
### \`editor.zoomTo(zoom)\`\r
\r
\`setZoom(zoom)\` 的兼容别名，新代码推荐使用 \`setZoom()\`。\r
\r
## 选择\r
\r
> **Selection 模块** · 入口：\`editor.select()\` / \`editor.deselect()\` · 底层：\`@leafer-in/editor\`\r
\r
### \`editor.select(target)\`\r
\r
选中指定 Leafer 元素。\r
\r
\`\`\`js\r
const text = await editor.text.add('标题')\r
editor.select(text)\r
\`\`\`\r
\r
### \`editor.deselect()\`\r
\r
取消选中。\r
\r
\`\`\`js\r
editor.deselect()\r
\`\`\`\r
\r
### \`editor.addToSelection(item)\`\r
\r
把元素加入当前选区。\r
\r
\`\`\`js\r
editor.addToSelection(node)\r
\`\`\`\r
\r
### \`editor.removeFromSelection(item)\`\r
\r
从当前选区移除元素。\r
\r
\`\`\`js\r
editor.removeFromSelection(node)\r
\`\`\`\r
\r
## 图层插件\r
\r
> **Layer 模块** · 命名空间：\`editor.layer\` · 源码：\`plugins/feature-plugins/layer\`\r
\r
图层能力通过 \`editor.layer\` 调用。图层 ID 是运行时图层标识；跨页面、跨保存周期的\r
业务身份应使用元素业务属性插件维护的 \`elementId\`。\r
\r
### \`editor.layer.getList()\`\r
\r
返回从视觉最上层到最下层排列的图层 DTO，不直接暴露 Vue 组件需要修改的节点。\r
\r
\`\`\`js\r
const layers = editor.layer.getList()\r
\r
// [{\r
//   id,\r
//   elementId,\r
//   name,\r
//   type,\r
//   imageRole,\r
//   customAttributeCount,\r
//   locked,\r
//   pointerThrough,\r
//   selected,\r
//   order\r
// }]\r
\`\`\`\r
\r
### \`editor.layer.reorder(orderedIds)\`\r
\r
按照面板中从上到下的 ID 顺序更新场景树层级。\r
\r
\`\`\`js\r
editor.layer.reorder(['top-layer-id', 'middle-layer-id', 'bottom-layer-id'])\r
\`\`\`\r
\r
拖拽过程中建议只更新 Vue 草稿数组，拖拽结束后调用一次 \`reorder()\`，避免频繁修改场景树。\r
\r
### \`editor.layer.select(id)\`\r
\r
通过图层 ID 选中画布元素。\r
\r
\`\`\`js\r
editor.layer.select(layer.id)\r
\`\`\`\r
\r
### \`editor.layer.remove(id)\`\r
\r
删除指定图层，并同步选区、画板覆盖层和图层事件。\r
\r
\`\`\`js\r
editor.layer.remove(layer.id)\r
\`\`\`\r
\r
不要在 Vue 组件中直接调用 \`node.remove()\`，否则容易遗漏选区和业务事件同步。\r
\r
### \`editor.layer.toggleLock(id)\`\r
\r
切换图层锁定状态。锁定当前选中元素时会自动退出选区。\r
\r
\`\`\`js\r
editor.layer.toggleLock(layer.id)\r
\`\`\`\r
\r
### \`editor.layer.togglePointerThrough(id)\`\r
\r
切换图片的点击穿透状态。开启后画布点击会命中图片下方的元素，但不会改变图片的\r
图层顺序、锁定状态、坐标或尺寸。\r
\r
\`\`\`js\r
editor.layer.togglePointerThrough(imageLayer.id)\r
\`\`\`\r
\r
该方法只对图片图层生效。图层面板仍可通过 ID 操作该图片。\r
\r
### \`editor.layer.hover(id)\`\r
\r
使用 Leafer Editor 的原生 hover 轮廓高亮指定图层，不修改节点自身描边。\r
\r
\`\`\`js\r
editor.layer.hover(layer.id)\r
editor.layer.hover(null) // 清除高亮\r
\`\`\`\r
\r
## 图片\r
\r
> **Image 模块** · 命名空间：\`editor.image\` · 源码：\`plugins/feature-plugins/image\`\r
\r
图片能力通过 \`editor.image\` 调用。\r
\r
### \`editor.image.add(source, options)\`\r
\r
添加图片，支持 URL、\`File\`、\`Blob\`、SVG 字符串。返回 Leafer \`Image\` 节点。\r
\r
\`\`\`js\r
const image = await editor.image.add('/demo.png')\r
\r
const file = input.files[0]\r
await editor.image.add(file, {\r
  x: 100,\r
  y: 120,\r
  width: 240,\r
  lockRatio: true\r
})\r
\`\`\`\r
\r
常用 \`options\`：\r
\r
| 字段 | 类型 | 说明 |\r
| --- | --- | --- |\r
| \`x\` | \`number\` | 图片 x 坐标。 |\r
| \`y\` | \`number\` | 图片 y 坐标。 |\r
| \`width\` | \`number\` | 图片宽度。 |\r
| \`height\` | \`number\` | 图片高度。 |\r
| \`maxWidthRatio\` | \`number\` | 未传宽高时，相对操作区域的最大宽度占比。 |\r
| \`maxHeightRatio\` | \`number\` | 未传宽高时，相对操作区域的最大高度占比。 |\r
| \`lockRatio\` | \`boolean\` | 是否保持宽高比。 |\r
\r
### \`editor.image.getSize(source)\`\r
\r
读取 URL、SVG、\`File\` 或 \`Blob\` 的原始像素尺寸，不创建画布节点。\r
\r
\`\`\`js\r
const { width, height } = await editor.image.getSize(file)\r
editor.setArtboardSize(width, height)\r
\`\`\`\r
\r
图片解析由 Image 模块统一完成。Vue 组件不应重复创建临时 \`<img>\` 或自行维护 Blob URL。\r
\r
### \`ImagePlugin.normalizeOptions(image, baseImage)\`\r
\r
归一化图片插件配置。通常业务层不需要直接调用，做插件扩展或配置面板校验时可使用。\r
\r
\`\`\`js\r
import { ImagePlugin, DEFAULT_CANVAS_CONFIG } from './canvas-editor-core/src/index.js'\r
\r
const imageOptions = ImagePlugin.normalizeOptions(\r
  { maxWidthRatio: 0.6 },\r
  DEFAULT_CANVAS_CONFIG.image\r
)\r
\`\`\`\r
\r
## 文本\r
\r
> **Text 模块** · 命名空间：\`editor.text\` · 源码：\`plugins/feature-plugins/text\`\r
\r
文本能力通过 \`editor.text\` 调用。\r
\r
### \`editor.text.add(content, options)\`\r
\r
新增文本，返回 Leafer \`Text\` 节点。\r
\r
\`\`\`js\r
const text = await editor.text.add('双击编辑文字', {\r
  fontFamily: 'PingFang SC',\r
  fontSize: 36,\r
  fontWeight: 700,\r
  italic: false,\r
  fill: '#1f2937',\r
  textAlign: 'center',\r
  textDecoration: 'none',\r
  letterSpacing: 0,\r
  lineHeight: 44,\r
  writingMode: 'x'\r
})\r
\`\`\`\r
\r
也可以把内容写在配置对象里：\r
\r
\`\`\`js\r
await editor.text.add({\r
  text: '竖版文字',\r
  writingMode: 'y',\r
  fontSize: 32\r
})\r
\`\`\`\r
\r
常用 \`options\`：\r
\r
| 字段 | 类型 | 说明 |\r
| --- | --- | --- |\r
| \`text\` | \`string\` | 文本内容。 |\r
| \`x\` | \`number\` | 文本 x 坐标。 |\r
| \`y\` | \`number\` | 文本 y 坐标。 |\r
| \`width\` | \`number\` | 文本框宽度；不传时按文本实际宽度创建。 |\r
| \`fontFamily\` | \`string\` | 字体。 |\r
| \`fontSize\` | \`number\` | 字号。 |\r
| \`fontWeight\` | \`string \\| number\` | 字重。 |\r
| \`italic\` | \`boolean\` | 是否斜体。 |\r
| \`fill\` | \`string\` | 文本颜色。 |\r
| \`textAlign\` | \`'left' \\| 'center' \\| 'right'\` | 水平对齐。 |\r
| \`textDecoration\` | \`'none' \\| 'under' \\| 'delete' \\| 'under-delete'\` | 文本装饰线。 |\r
| \`letterSpacing\` | \`number\` | 字间距。 |\r
| \`lineHeight\` | \`number\` | 行高。 |\r
| \`writingMode\` | \`'x' \\| 'y' \\| 'y-reverse'\` | 横排或竖排。 |\r
| \`rotation\` | \`number\` | 旋转角度。 |\r
| \`opacity\` | \`number\` | 透明度。 |\r
| \`draggable\` | \`boolean\` | 是否可拖动。 |\r
| \`editable\` | \`boolean\` | 是否可编辑。 |\r
\r
### \`editor.text.update(target, options)\`\r
\r
更新指定文本节点。\r
\r
\`\`\`js\r
editor.text.update(text, {\r
  text: '新的文字',\r
  fontSize: 48,\r
  italic: true,\r
  fill: '#000000'\r
})\r
\`\`\`\r
\r
### \`editor.text.update(options)\`\r
\r
不传 \`target\` 时，默认更新当前选中的文本节点。\r
\r
\`\`\`js\r
editor.text.update({\r
  text: '更新选中文本',\r
  textAlign: 'left'\r
})\r
\`\`\`\r
\r
### \`editor.text.edit(target)\`\r
\r
打开官方 TextEditor 内部编辑器。\`target\` 不传时使用当前选中文本。\r
\r
\`\`\`js\r
editor.text.edit(text)\r
editor.text.edit()\r
\`\`\`\r
\r
### \`editor.text.getSelected()\`\r
\r
获取当前选中文本；如果当前没有选中文本，会回退到最近一次可用文本。\r
\r
\`\`\`js\r
const selectedText = editor.text.getSelected()\r
\`\`\`\r
\r
### \`editor.text.getStyle(target)\`\r
\r
读取文本样式快照。\r
\r
\`\`\`js\r
const style = editor.text.getStyle(text)\r
\`\`\`\r
\r
返回内容包含：\r
\r
\`\`\`js\r
{\r
  text,\r
  fontFamily,\r
  fontSize,\r
  fontWeight,\r
  italic,\r
  fill,\r
  textAlign,\r
  textDecoration,\r
  letterSpacing,\r
  lineHeight,\r
  writingMode,\r
  width,\r
  verticalAlign\r
}\r
\`\`\`\r
\r
### \`TextPlugin.normalizeOptions(text, baseText)\`\r
\r
归一化文本插件配置。通常业务层不需要直接调用，做插件扩展或配置面板校验时可使用。\r
\r
\`\`\`js\r
import { TextPlugin, DEFAULT_CANVAS_CONFIG } from './canvas-editor-core/src/index.js'\r
\r
const textOptions = TextPlugin.normalizeOptions(\r
  { fontSize: 48, italic: true },\r
  DEFAULT_CANVAS_CONFIG.text\r
)\r
\`\`\`\r
\r
## 事件\r
\r
> **EventBus 模块** · 命名空间：\`editor.eventBus\` · 源码：\`logic/event-bus.js\`\r
\r
通过 \`editor.eventBus\` 订阅内部事件。\r
\r
\`\`\`js\r
const unsubscribe = editor.eventBus.on('text:selected', ({ text, options }) => {\r
  console.log(text, options)\r
})\r
\r
unsubscribe()\r
\`\`\`\r
\r
常用事件：\r
\r
| 事件名 | 触发时机 | payload |\r
| --- | --- | --- |\r
| \`text:added\` | 新增文本后 | \`{ text }\` |\r
| \`text:updated\` | 更新文本后 | \`{ text, options }\` |\r
| \`text:selected\` | 选中文本或文本样式变化后 | \`{ text, options }\` |\r
| \`image:added\` | 新增图片后 | \`{ image }\` |\r
| \`viewport:zoom-changed\` | 缩放变化后 | \`{ zoom, previous }\` |\r
| \`viewport:zoom-source\` | 记录缩放来源后 | \`{ source, zoom }\` |\r
| \`viewport:transform-end\` | 手势缩放或变换结束后 | \`{ zoom }\` |\r
| \`canvas:resized\` | 外层画布尺寸变化后 | \`{ width, height }\` |\r
| \`canvas:background-changed\` | 背景色变化后 | \`{ background }\` |\r
| \`canvas:grid-visibility-changed\` | 网格显隐变化后 | \`{ showGrid }\` |\r
| \`canvas:area-type-changed\` | 区域类型变化后 | \`{ areaType }\` |\r
| \`canvas:grid-changed\` | 网格配置变化后 | \`{ grid }\` |\r
| \`artboard:resized\` | 白色画板尺寸变化后 | \`{ artboard }\` |\r
| \`history:changed\` | 命令历史变化后 | \`{ canUndo, canRedo }\` |\r
| \`layers:changed\` | 图层增删、重排、锁定或属性变化后 | \`{ layers }\` |\r
| \`element-data:changed\` | 元素业务属性写入、删除或清空后 | \`{ element, elementId, attributes }\` |\r
| \`selection:deleted\` | 通过编辑器动作或图层面板删除元素后 | \`{ targets }\` |\r
| \`selection:layer-changed\` | 选区或图层层级发生变化后 | \`{ action, selected }\` |\r
| \`selection:layer-menu-open\` | 请求 Vue 打开层级菜单 | \`{ x, y, actions }\` |\r
| \`selection:layer-menu-close\` | 请求关闭层级菜单 | \`undefined\` |\r
\r
## 命令与历史\r
\r
> **Command 模块** · 命名空间：\`editor.commands\` · 源码：\`canvas-editor-core/src/commands\`\r
\r
### \`editor.execute(command)\`\r
\r
执行命令并压入历史栈。\r
\r
\`\`\`js\r
import { ZoomCommand } from './canvas-editor-core/src/index.js'\r
\r
editor.execute(new ZoomCommand(editor.state, 1.5))\r
\`\`\`\r
\r
### \`editor.undo()\`\r
\r
撤销一步。\r
\r
\`\`\`js\r
editor.undo()\r
\`\`\`\r
\r
### \`editor.redo()\`\r
\r
重做一步。\r
\r
\`\`\`js\r
editor.redo()\r
\`\`\`\r
\r
### \`editor.commands.canUndo\`\r
\r
是否可以撤销。\r
\r
\`\`\`js\r
if (editor.commands.canUndo) {\r
  editor.undo()\r
}\r
\`\`\`\r
\r
### \`editor.commands.canRedo\`\r
\r
是否可以重做。\r
\r
\`\`\`js\r
if (editor.commands.canRedo) {\r
  editor.redo()\r
}\r
\`\`\`\r
\r
### \`editor.commands.clear()\`\r
\r
清空历史栈。\r
\r
\`\`\`js\r
editor.commands.clear()\r
\`\`\`\r
\r
## 元素业务属性\r
\r
> **ElementData 模块** · 命名空间：\`editor.elementData\` · 源码：\`plugins/feature-plugins/element-data\`\r
\r
元素业务属性用于保存 H5 运行时所需的数据，例如跳转链接、商品 ID、埋点标识、\r
交互动作和业务组件配置。它与 Leafer 的 \`x\`、\`fill\`、\`locked\` 等渲染属性隔离，\r
不会改变现有画布编辑流程。\r
\r
每个通过文字或图片插件创建的元素都会自动获得稳定 \`elementId\`。业务属性必须是\r
可 JSON 序列化的普通对象，不允许函数、DOM、Date、Map、循环引用等运行时对象。\r
\r
### 推荐数据结构\r
\r
\`\`\`js\r
// 图片元素\r
{\r
  image: {\r
    description: '红色礼盒正面展示图',\r
    role: 'background'\r
  }\r
}\r
\r
// 文本元素\r
{\r
  textInput: {\r
    enabled: true,\r
    characterSet: 'latin',\r
    allowManualNewline: true,\r
    allowSymbols: true,\r
    maxCharactersPerLine: 20,\r
    maxCharacters: 100,\r
    maxLines: 5\r
  }\r
}\r
\`\`\`\r
\r
图片 \`role\` 只允许以下值：\r
\r
| 值 | 图层标记 | 用途 |\r
| --- | --- | --- |\r
| \`background\` | 背景 | 生产背景图；通过上传背景图创建时自动写入。 |\r
| \`mask\` | 遮罩 | 标记为生产遮罩图。 |\r
| \`ai-variable\` | AI | 标记为 AI 可变图片。 |\r
\r
图片用途属于业务标记，不会自动改变图层层级。点击穿透属于 Leafer 命中属性，使用\r
\`editor.layer.togglePointerThrough(id)\` 单独控制。\r
\r
\`characterSet: 'latin'\` 表示只允许英文字母、数字和空格；\`'any'\` 表示不限制\r
中英文。自动换行由 \`maxCharactersPerLine\` 控制，\`allowManualNewline\` 只控制\r
用户是否可以主动输入换行。\r
\r
不要把元素位置、颜色、字号等画布渲染属性重复写入业务属性。这些仍由 Leafer\r
节点和对应插件负责，避免形成两份互相冲突的数据源。\r
\r
### \`editor.elementData.setSelected(attributes, options)\`\r
\r
给当前单选元素写入业务属性。默认浅合并顶层字段，\`replace: true\` 时整体替换。\r
\r
\`\`\`js\r
editor.elementData.setSelected({\r
  action: { type: 'navigate', url: '/pages/activity/index' },\r
  tracking: { eventName: 'activity_click' }\r
})\r
\`\`\`\r
\r
### \`editor.elementData.getSelected()\`\r
\r
获取当前单选元素的业务属性副本。未配置时返回 \`null\`。\r
\r
\`\`\`js\r
const attributes = editor.elementData.getSelected()\r
\`\`\`\r
\r
### \`editor.elementData.removeSelected(keys)\`\r
\r
删除当前单选元素的一个或多个顶层字段。\r
\r
\`\`\`js\r
editor.elementData.removeSelected(['tracking', 'business'])\r
\`\`\`\r
\r
### \`editor.elementData.clearSelected()\`\r
\r
清空当前单选元素的业务属性，但保留稳定 \`elementId\`。\r
\r
### \`editor.elementData.getById(elementId)\` / \`setById(elementId, attributes)\`\r
\r
适合图层面板、批量属性配置等不依赖当前选区的业务场景。\r
\r
### \`editor.elementData.export(options)\`\r
\r
导出供 H5 消费的元素业务属性列表。默认忽略未配置属性的元素。\r
\r
\`\`\`js\r
const h5ElementData = editor.elementData.export()\r
\r
// [\r
//   {\r
//     elementId: 'V1StGXR8_Z5jdHi6B-myT',\r
//     type: 'Text',\r
//     attributes: {\r
//       action: { type: 'navigate', url: '/pages/activity/index' }\r
//     }\r
//   }\r
// ]\r
\`\`\`\r
\r
如需导出空属性元素：\r
\r
\`\`\`js\r
editor.elementData.export({ includeEmpty: true })\r
\`\`\`\r
\r
### Vue 组件调用\r
\r
\`useCanvasEditor()\` 已提供不暴露 Leafer 节点的应用层方法：\r
\r
\`\`\`js\r
editor.setSelectedElementAttributes({\r
  action: { type: 'navigate', url: '/pages/product/detail?id=1001' }\r
})\r
\r
const current = editor.getSelectedElementAttributes()\r
const payload = editor.exportElementAttributes()\r
\`\`\`\r
\r
插件会发送 \`element-data:changed\` 事件，属性面板需要响应外部变化时可以订阅：\r
\r
\`\`\`js\r
const unsubscribe = editor.eventBus.on('element-data:changed', (payload) => {\r
  console.log(payload.elementId, payload.attributes)\r
})\r
\`\`\`\r
\r
复制元素时会复制业务属性，但会生成新的 \`elementId\`，避免 H5 页面出现重复身份。\r
\r
## 生命周期\r
\r
> **Core 生命周期** · 入口：\`editor.destroy()\` · 组件卸载时必须调用\r
\r
### \`editor.destroy()\`\r
\r
销毁编辑器，组件卸载时必须调用。\r
\r
\`\`\`js\r
onBeforeUnmount(() => {\r
  editor?.destroy()\r
})\r
\`\`\`\r
\r
## 高级导出\r
\r
> **扩展 API** · 面向自定义插件、命令和测试；普通页面优先使用 \`createEditor()\` 返回的外观实例\r
\r
以下模块已从 \`src/canvas-editor-core/src/index.js\` 显式导出，通常用于高级扩展、\r
测试或自定义插件，不建议普通业务直接改底层状态。\r
\r
| 导出 | 用途 |\r
| --- | --- |\r
| \`Editor\` | 编辑器外观类。 |\r
| \`EditorBuilder\` | 分步骤构建编辑器。 |\r
| \`EditorState\` | 状态代理类。 |\r
| \`ViewportManager\` | 视口缩放服务。 |\r
| \`CommandManager\` | 命令历史管理。 |\r
| \`Command\` | 自定义命令基类。 |\r
| \`ZoomCommand\` | 内置缩放命令。 |\r
| \`PluginManager\` | 插件注册和生命周期管理。 |\r
| \`EventBus\` | 事件总线。 |\r
| \`EditorError\` | 编辑器错误类型。 |\r
| \`DEFAULT_CANVAS_CONFIG\` | 默认配置。 |\r
| \`ElementDataPlugin\` | 元素业务属性插件。 |\r
| \`ELEMENT_DATA_KEY\` | 元素业务数据内部存储键；普通业务不应直接使用。 |\r
| \`TextPlugin\` | 文本插件类。 |\r
| \`ImagePlugin\` | 图片插件类。 |\r
\r
## 完整业务示例\r
\r
\`\`\`js\r
import { createEditor } from './canvas-editor-core/src/index.js'\r
\r
const editor = createEditor({\r
  view: document.querySelector('#canvas'),\r
  autoResize: true\r
})\r
\r
const text = await editor.text.add('标题', {\r
  fontSize: 48,\r
  fontWeight: 700,\r
  fill: '#111827'\r
})\r
\r
editor.text.update(text, {\r
  italic: true,\r
  textDecoration: 'under'\r
})\r
\r
await editor.image.add('/demo.png', {\r
  width: 240,\r
  lockRatio: true\r
})\r
\r
editor\r
  .setArtboardSize(375, 667)\r
  .setZoom(1.2)\r
  .setShowGrid(true)\r
\r
const unsubscribe = editor.eventBus.on('text:selected', ({ options }) => {\r
  console.log('当前文本样式', options)\r
})\r
\r
editor.deselect()\r
unsubscribe()\r
editor.destroy()\r
\`\`\`\r
\r
## 移动端 H5 文档协议\r
\r
> **H5 Document 模块** · 入口：\`exportH5Document()\` · 源码：\`src/services/h5-document.js\`\r
\r
编辑器页面位于 \`#/editor\`，移动端只读预览页面位于 \`#/h5-preview\`。\r
点击编辑器顶部的“H5 预览”后，会将当前画板导出为普通 JSON 并交给 H5 页面渲染。\r
\r
\`\`\`js\r
{\r
  version: 1,\r
  canvas: {\r
    width: 375,\r
    height: 667,\r
    background: '#ffffff'\r
  },\r
  elements: [\r
    {\r
      tag: 'Text',\r
      x: 24,\r
      y: 80,\r
      width: 327,\r
      text: '活动标题',\r
      fontSize: 32,\r
      elementId: 'stable-element-id',\r
      attributes: {\r
        textInput: {\r
          enabled: true,\r
          characterSet: 'any',\r
          allowManualNewline: true,\r
          allowSymbols: true,\r
          maxCharactersPerLine: 20,\r
          maxCharacters: 100,\r
          maxLines: 4\r
        }\r
      }\r
    }\r
  ]\r
}\r
\`\`\`\r
\r
- 元素坐标以画板左上角为原点，与编辑器工作区中的缩放和居中位置无关。\r
- 图片 Blob URL 在导出时转成 Data URL，避免页面跳转后资源失效。\r
- H5 页面也可以在“导入或查看 JSON”中接收后端返回的同结构数据。\r
- \`textInput.enabled=true\` 的文字元素会渲染为 H5 输入控件，其余元素保持只读展示。\r
`;const Jr={class:"api-docs-header"},Kr={class:"api-docs-brand"},Yr={class:"api-docs-actions","aria-label":"文档页面导航"},et={class:"api-docs-layout"},rt={class:"api-docs-sidebar"},tt={class:"api-docs-search"},nt={class:"api-docs-toc","aria-label":"API 文档目录"},it=["aria-expanded","onClick"],ot={class:"api-docs-toc-module-items"},st=["onClick"],at={key:0},lt={class:"api-docs-main"},ct={class:"api-docs-intro"},dt={class:"api-docs-module-index","aria-label":"API 模块索引"},ut=["onClick"],pt=["innerHTML"],kt={__name:"ApiDocsPage",setup(t){var Re;const e=[{key:"guide",label:"接入指南",namespace:"Application",icon:"mdi-map-outline",headings:["阅读路线","10 分钟快速上手","调用边界","模块总览","Vue 应用层调用","常见业务流程","错误处理与调试","API 速查"]},{key:"core",label:"Core 核心",namespace:"createEditor / Editor",icon:"mdi-cube-outline",headings:["核心层初始化示例","入口 API","Editor 实例属性","生命周期","高级导出","完整业务示例"]},{key:"canvas",label:"画布画板",namespace:"editor.artboard",icon:"mdi-artboard",headings:["画布与画板"]},{key:"viewport",label:"视口缩放",namespace:"editor.setZoom",icon:"mdi-magnify-scan",headings:["缩放"]},{key:"selection",label:"选区",namespace:"editor.select",icon:"mdi-selection-drag",headings:["选择"]},{key:"layer",label:"图层",namespace:"editor.layer",icon:"mdi-layers-outline",headings:["图层插件"]},{key:"image",label:"图片",namespace:"editor.image",icon:"mdi-image-outline",headings:["图片"]},{key:"text",label:"文字",namespace:"editor.text",icon:"mdi-format-text",headings:["文本"]},{key:"event",label:"事件",namespace:"editor.eventBus",icon:"mdi-broadcast",headings:["事件"]},{key:"command",label:"命令历史",namespace:"editor.commands",icon:"mdi-history",headings:["命令与历史"]},{key:"data",label:"业务属性",namespace:"editor.elementData",icon:"mdi-database-outline",headings:["元素业务属性"]},{key:"request",label:"网络请求",namespace:"alova / editorDocumentApi",icon:"mdi-api",headings:["Alova API 请求层"]},{key:"h5",label:"H5 协议",namespace:"exportH5Document",icon:"mdi-cellphone-link",headings:["移动端 H5 文档协议"]}],r=new Map(e.map(m=>[m.key,m])),i=X(""),n=X(""),s=X(!1),a=X(null),l=X(new Set(["guide","core"])),o=E(ge),d=S(o);let c=null;const p=nr(()=>{const m=i.value.toLowerCase();return m?d.flatMap(g=>{const k=`${g.label} ${g.namespace}`.toLowerCase().includes(m)?g.items:g.items.filter(x=>x.title.toLowerCase().includes(m));return k.length?[{...g,items:k}]:[]}):d}),h=d.filter(m=>m.key!=="guide"),A={modules:h.length,sections:o.filter(m=>m.level===2).length,codeBlocks:(((Re=ge.match(/```/g))==null?void 0:Re.length)??0)/2},u=q(ge,o);ir(()=>{var g;const m=o.map(y=>document.getElementById(y.id)).filter(Boolean);c=new IntersectionObserver(Je,{root:a.value,rootMargin:"-72px 0px -72% 0px",threshold:[0,1]}),m.forEach(y=>c.observe(y)),(g=a.value)==null||g.addEventListener("scroll",le,{passive:!0}),le()}),or(()=>{var m;c==null||c.disconnect(),(m=a.value)==null||m.removeEventListener("scroll",le)});function E(m){const g=new Map;let y=e[0];return m.split(`
`).flatMap(k=>{const x=/^(#{2,4})\s+(.+)$/.exec(k);if(!x)return[];const z=Q(x[2]);x[1].length===2&&(y=D(z));const $=ae(z),W=g.get($)??0;return g.set($,W+1),[{level:x[1].length,title:z,id:W?`${$}-${W+1}`:$,moduleKey:y.key}]})}function S(m){return e.flatMap(g=>{const y=m.filter(x=>x.moduleKey===g.key&&x.level<=3),k=y.find(x=>x.level===2)??y[0];return y.length?[{...g,items:y,firstHeadingId:k.id}]:[]})}function q(m,g){let y=0,k="";return b.parse(m,{gfm:!0,breaks:!1}).replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g,(z,$,W)=>{const ce=g[y++];if(!ce)return z;const C=r.get(ce.moduleKey),er=Number($)===2&&(C==null?void 0:C.key)!==k?`<div class="api-docs-module-marker api-docs-module--${C.key}"><span>${C.label}</span><code>${C.namespace}</code></div>`:"";return Number($)===2&&(k=(C==null?void 0:C.key)??k),`${er}<h${$} id="${ce.id}">${W}</h${$}>`}).replace(/<pre><code/g,'<div class="api-docs-code"><button type="button" data-copy-code>复制</button><pre><code').replace(/<\/code><\/pre>/g,"</code></pre></div>")}function D(m){return e.find(g=>g.headings.includes(m))??e[0]}function Q(m){return m.replace(/`([^`]+)`/g,"$1").replace(/\[([^\]]+)]\([^)]*\)/g,"$1").replace(/[*_~]/g,"").trim()}function ae(m){return m.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"")||"section"}function Z(m){const g=document.getElementById(m),y=a.value;if(!g||!y)return;const k=g.getBoundingClientRect().top-y.getBoundingClientRect().top+y.scrollTop-68;y.scrollTo({top:Math.max(0,k),behavior:"smooth"})}function L(m){return!!i.value||l.value.has(m)}function Xe(m){const g=new Set(l.value);g.has(m)?g.delete(m):g.add(m),l.value=g}function Je(m){var y,k;const g=m.filter(x=>x.isIntersecting).sort((x,z)=>x.boundingClientRect.top-z.boundingClientRect.top);if((k=(y=g[0])==null?void 0:y.target)!=null&&k.id){n.value=g[0].target.id;const x=o.find(z=>z.id===n.value);x&&!l.value.has(x.moduleKey)&&(l.value=new Set([...l.value,x.moduleKey]))}}function le(){var m;s.value=(((m=a.value)==null?void 0:m.scrollTop)??0)>560}function Ke(){var m;(m=a.value)==null||m.scrollTo({top:0,behavior:"smooth"})}async function Ye(m){var k,x;const g=m.target.closest("[data-copy-code]");if(!g)return;const y=((x=(k=g.parentElement)==null?void 0:k.querySelector("code"))==null?void 0:x.textContent)??"";try{await navigator.clipboard.writeText(y),g.textContent="已复制",window.setTimeout(()=>{g.textContent="复制"},1200)}catch{g.textContent="复制失败"}}return(m,g)=>{const y=sr("router-link");return j(),P("div",{ref_key:"scrollContainer",ref:a,class:"api-docs-page"},[v("header",Jr,[v("div",Kr,[B(N,{icon:"mdi-book-open-page-variant-outline",size:"21"}),g[2]||(g[2]=v("div",null,[v("strong",null,"ELE Editor"),v("span",null,"开发者文档")],-1))]),v("nav",Yr,[B(y,{to:"/editor"},{default:Ie(()=>[...g[3]||(g[3]=[Le("编辑器",-1)])]),_:1}),B(y,{to:"/h5-preview"},{default:Ie(()=>[...g[4]||(g[4]=[Le("H5 预览",-1)])]),_:1})])]),v("div",et,[v("aside",rt,[v("label",tt,[B(N,{icon:"mdi-magnify",size:"17"}),de(v("input",{"onUpdate:modelValue":g[0]||(g[0]=k=>i.value=k),type:"search",placeholder:"搜索章节","aria-label":"搜索 API 文档章节"},null,512),[[ar,i.value,void 0,{trim:!0}]]),i.value?(j(),P("button",{key:0,type:"button","aria-label":"清空搜索",onClick:g[1]||(g[1]=k=>i.value="")},[B(N,{icon:"mdi-close",size:"15"})])):ze("",!0)]),v("nav",nt,[(j(!0),P(ue,null,pe(p.value,k=>(j(),P("section",{key:k.key,class:he(["api-docs-toc-module",`api-docs-module--${k.key}`])},[v("button",{type:"button",class:"api-docs-toc-module-header","aria-expanded":L(k.key),onClick:x=>Xe(k.key)},[B(N,{icon:k.icon,size:"16"},null,8,["icon"]),v("span",null,[v("strong",null,M(k.label),1),v("small",null,M(k.namespace),1)]),B(N,{icon:L(k.key)?"mdi-chevron-up":"mdi-chevron-down",size:"16"},null,8,["icon"])],8,it),de(v("div",ot,[(j(!0),P(ue,null,pe(k.items,x=>(j(),P("button",{key:x.id,type:"button",class:he([`api-docs-toc-level-${x.level}`,{"api-docs-toc-active":n.value===x.id}]),onClick:z=>Z(x.id)},M(x.title),11,st))),128))],512),[[De,L(k.key)]])],2))),128)),p.value.length===0?(j(),P("p",at,"没有匹配的模块或章节")):ze("",!0)])]),v("main",lt,[v("div",ct,[g[5]||(g[5]=v("span",null,"API Reference",-1)),v("strong",null,M(A.modules)+" 个模块 · "+M(A.sections)+" 个章节 · "+M(A.codeBlocks)+" 个代码示例",1)]),v("nav",dt,[(j(!0),P(ue,null,pe(_e(h),k=>(j(),P("button",{key:k.key,type:"button",class:he(`api-docs-module--${k.key}`),onClick:x=>Z(k.firstHeadingId)},[B(N,{icon:k.icon,size:"17"},null,8,["icon"]),v("span",null,[v("strong",null,M(k.label),1),v("small",null,M(k.namespace),1)])],10,ut))),128))]),v("article",{class:"api-docs-content",onClick:Ye,innerHTML:_e(u)},null,8,pt)]),de(v("button",{type:"button",class:"api-docs-back-top","aria-label":"返回顶部",onClick:Ke},[B(N,{icon:"mdi-arrow-up",size:"18"})],512),[[De,s.value]])])],512)}}};export{kt as default};
