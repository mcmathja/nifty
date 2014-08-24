define("nifty",function(e){function t(e,n){if(!(this instanceof t))return new t(e,n);if(e===undefined||n===undefined||e>n)throw new Error("Invalid interval specified");this.lo=e;this.hi=n}function n(e,i){if(!(this instanceof n))return new n(e,i);if(!(e instanceof t))return new r;if(e.empty())if(i)return new n(i.intv,i.tail);else return new r;this.intv=e;this.tail=i||new r;this.empty=false}function r(){this.empty=true}function i(e,r,s){if(!(this instanceof i))return new i(e,r,s);this.t=e||"";this.bold=r?r.window(t(0,e.length)):new n;this.italic=s?s.window(t(0,e.length)):new n}function s(e,t){return e.serialize().reduce(function(e,n){e.push({idx:n[0],start:true,val:t},{idx:n[1],start:false,val:t});return e},[])}function o(e,t){if(t)return"<"+e+">";else return"</"+e+">"}function u(e,r){function a(t,n){var r=document.createRange();var i=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);while(i.nextNode()&&t>i.currentNode.length)t-=i.currentNode.length;r.setStart(i.currentNode,t);if(n){var i=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);while(i.nextNode()&&n>i.currentNode.length)n-=i.currentNode.length;r.setEnd(i.currentNode,n)}document.getSelection().removeAllRanges();document.getSelection().addRange(r)}function f(){var t=window.getSelection().getRangeAt(0);var n=document.createRange();n.selectNodeContents(e);n.setEnd(t.startContainer,t.startOffset);var r=Math.min(n.toString().length,s.length());var i=Math.min(r+t.toString().length,s.length());return{start:r,end:i}}function l(t,n){e.innerHTML=s.toHTML();a(t,n)}console.log(r.bold);r=r?r:{};var e=e;var s=new i(r.text||"",n.unserialize(r.bold),n.unserialize(r.italic));var o=r.local||true;var u=[];this.state=function(){return{ele:e,text:s}};e.addEventListener("keypress",function(e){if(key=e.which){e.preventDefault();var t=f();s=s.del(t.end-t.start,t.start).ins(key!==13?String.fromCharCode(key):"\n",t.end);l(t.start+1)}});e.addEventListener("keydown",function(e){var n=e.which;if(n===8){e.preventDefault();r=f();if(r.start===r.end&&r.start!==0){s=s.del(1,r.start-1);l(r.start-1)}else{s=s.del(r.end-r.start,r.start);l(r.start)}}else if(e.metaKey&&(n===66||n===73||n===65)){e.preventDefault();var r=f();switch(n){case 65:r.start=0,r.end=s.length();break;case 66:s=s.embolden(new t(r.start,r.end));break;case 73:s=s.italicize(new t(r.start,r.end));break;default:break}l(r.start,r.end)}});e.addEventListener("compositionend",function(e){e.preventDefault();sel=f();s=s.ins(e.data,sel.start);l(sel.start+e.data.length)});e.addEventListener("textInput",function(e){e.preventDefault()});l()}t.prototype.empty=function(){return this.lo===this.hi};t.prototype.length=function(){return this.hi-this.lo};t.prototype.expand=function(e){return new t(this.lo,this.hi+e)};t.prototype.shrink=function(e){return this.hi-e>0?this.expand(-e):new t(this.lo,this.lo)};t.prototype.shift=function(e){return new t(this.lo+e,this.hi+e)};t.prototype.incl=function(e){if(e instanceof t)return this.incl(e.lo)&&this.incl(e.hi);else return this.lo<=e&&this.hi>=e};t.prototype.below=function(e){if(e instanceof t)return this.hi<e.lo;else return this.hi<e};t.prototype.above=function(e){if(e instanceof t)return this.lo>e.hi;else return this.lo>e};t.prototype.intersects=function(e){return this.incl(e.lo)||this.incl(e.hi)};t.prototype.equals=function(e){return this.lo===e.lo&&this.hi===e.hi};t.prototype.fullIntv=function(e){return new t(Math.min(this.lo,e.lo),Math.max(this.hi,e.hi))};t.prototype.loIntv=function(e){return new t(Math.min(this.lo,e.lo),Math.max(Math.min(this.hi,e.lo),Math.min(this.lo,e.hi)))};t.prototype.hiIntv=function(e){return new t(Math.min(Math.max(this.hi,e.lo),Math.max(this.lo,e.hi)),Math.max(this.hi,e.hi))};t.prototype.limit=function(e){return new t(Math.max(this.lo,e.lo),Math.min(this.hi,e.hi))};t.prototype.serialize=function(){return[this.lo,this.hi]};t.unserialize=function(e){return new t(e[0],e[1])};r.prototype=Object.create(n.prototype);r.prototype.constructor=r;n.prototype.length=function(e){var t=e||0;if(this.tail.empty)return t;else return this.tail.length(t+1)};n.prototype.intersects=function(e){if(this.empty)return false;else if(this.intv.incl(e))return true;else return this.tail.intersects(e)};n.prototype.shift=function(e){if(this.empty)return this;else return new n(this.intv.shift(e),this.tail.shift(e))};n.prototype.ins=function(e,t){if(this.empty)return this;else if(this.intv.below(t))return new n(this.intv,this.tail.ins(e,t));else if(this.intv.above(t))return this.shift(e);else return new n(this.intv.expand(e),this.tail.shift(e))};n.prototype.del=function(e,r){var i=new t(r,r+e);if(this.empty||e===0)return this;else if(this.intv.below(i))return new n(this.intv,this.tail.del(e,r));else if(this.intv.above(i))return this.shift(-e);else if(this.intv.incl(i))return new n(this.intv.shrink(e),this.tail.shift(-e));else if(this.intv.incl(i.hi))return new n(new t(r,this.intv.hi-e),this.tail.shift(-e));else if(this.intv.incl(i.lo))return this.tail.del(e,r).app(new t(this.intv.lo,r));else return this.tail.del(e,r)};n.prototype.app=function(e){if(e.empty())return this;else if(this.empty)return new n(e);else if(this.intv.below(e))return new n(this.intv,this.tail.app(e));else if(this.intv.above(e))return new n(e,this);else if(this.intv.incl(e))return new n(this.intv.loIntv(e),new n(this.intv.hiIntv(e),this.tail));else return this.tail.app(this.intv.fullIntv(e))};n.prototype.window=function(e){if(this.empty)return this;else if(e.incl(this.intv))return new n(this.intv,this.tail.window(e));else if(this.intv.intersects(e))return new n(this.intv.limit(e),this.tail.window(e));else return this.tail.window(e)};n.prototype.serialize=function(){if(this.empty)return[];return[this.intv.serialize()].concat(this.tail.serialize())};n.gen=function(){if(!arguments.length)return new r;return[].slice.call(arguments).reduce(function(e,t){return e.app(t)},new n)};n.unserialize=function(e){if(!e)return new r;return n.gen.apply(null,e.map(function(e){return t.unserialize(e)}))};i.prototype.ins=function(e,t){return new i(this.t.substr(0,t)+e+this.t.substr(t),this.bold.ins(e.length,t),this.italic.ins(e.length,t))};i.prototype.del=function(e,t){return new i(this.t.substr(0,t)+this.t.substr(t+e),this.bold.del(e,t),this.italic.del(e,t))};i.prototype.length=function(){return this.t.length};i.prototype.format=function(e,t){switch(e){case"bold":case"embolden":return this.embolden(t);break;case"italic":case"italicize":return this.italicize(t);break;default:throw new Error(e+" is not a valid formatting option")}};i.prototype.embolden=function(e){return new i(this.t,this.bold.app(e),this.italic)};i.prototype.italicize=function(e){return new i(this.t,this.bold,this.italic.app(e))};i.prototype.toHTML=function(){var e=s(this.bold,"b");var t=s(this.italic,"i");var n=[].concat(e,t).sort(function(e,t){return e.idx-t.idx});if(!n.length)return this.t;return n.reduce(function(e,t,n,r){e.html+=e.text.slice(e.offset,t.idx);if(t.start){e.states.unshift(t.val);e.html+=o(t.val,true)}else{var i=[];while(e.states[0]!=t.val){i.unshift(e.states.shift());e.html+=o(i[0],false)}e.html+=o(e.states.shift(),false);while(i.length){e.states.unshift(i.shift());e.html+=o(e.states[0],true)}}e.offset=t.idx;if(n===r.length-1)return e.html+e.text.slice(t.idx);return e},{states:[],html:"",text:this.t,offset:0}).replace(/\n(<\/.>)*$/,"$1\n\r")};i.prototype.serialize=function(){return{t:this.t,format:{b:this.bold.serialize(),i:this.italic.serialize()}}};i.unserialize=function(e){if(!e)return new i;return new i(e.t,n.unserialize(e.format.b),n.unserialize(e.format.i))};return u})