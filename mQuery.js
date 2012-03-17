/** 
 *
 * mQuery.js
 * (c) 2011-2012 mk31415926535@gmail.com
 * mQuery.js may be freely distributed under the MIT license.
 *
 * */

(function(w){ if(!w.mQuery){
	w.mQuery = {
		REG : /(>|\~|\+| )?([\.#])?([^\[\]:> ]*)(\[[^\]]*\])?(:([^\(> ]+)(\((.*)\))?)?/,
		ATTR_REG : /([^=\s\^\*\$\!]+)\s*((\^|\*|\$|\!)?\s*=\s*(.*)\s*)?/,
		read : function(arr, eventChars, eventCallBack){
			var looper = [], queue = [], i = 0, len = arr.length, readChar;
			eventChars = eventChars || ''
			while(i < len){
				readChar = arr[i];
				switch(readChar){
					case '(':
						looper.unshift(')');
						break;
					case '[':
						looper.unshift(']');
						break;
					case "'":
					case '"':
						looper.length > 0 && looper[0] == readChar ? looper.shift() : looper.unshift(readChar);
						break;
					default:
						if(looper.length < 1 && eventChars.indexOf(readChar) > -1){
							if(typeof eventCallBack === 'function'){
								eventCallBack(queue);
								queue = [];
							}
						} else if(looper.length > 0 && readChar === looper[0]){
							looper.shift();
						}
						break;
				}
				queue.push(readChar);
				i++;
			}
			if(queue.length > 0 && typeof eventCallBack === 'function'){
				eventCallBack(queue);
				queue = null;
			}
		},
		loop : function(obj, queryGroup){
			var arr = [];
			if(queryGroup instanceof w.mQuery.QueryGroup && obj.firstChild){
				var n = obj.firstChild;
				while(n){
					if(queryGroup.match(n)){
						arr.push(n);
					}
					if(n.childNodes.length > 0){
						arr = arr.concat(w.mQuery.loop(n, queryGroup));
					}
					n = n.nextSibling;
				}
			}
			return arr;
		}
	}
	w.mQuery.QueryGroup = function(str){ this.init(str); }
	w.mQuery.QueryGroup.prototype = {
		init : function(str){
			if(typeof str != 'string') return;
			var qs = this.qs = [];
			mQuery.read(str.split(''), ',', function(arr){
				arr = arr.join('').replace(/^,?\s*|\s*$/g, '')
				var qi = null;
				mQuery.read(arr.split(''), ' >+~', function(arr){
					if(qi == null){
						qi = new mQuery.queryItem(arr.join(''));
					} else {
						qi = qi.Next(arr.join(''));
					}
				});
				qs.push(qi);
			});
			qs = null;
		}, match : function(n){
			if(this.qs instanceof Array){
				var i = 0, len = this.qs.length;
				for(; i < len; i++){
					if(this.qs[i] && this.qs[i].match(n)) return true;
				}
			}
			return false;
		}
	}
	w.mQuery.queryItem = function(str){ this.init(str); }
	w.mQuery.queryItem.prototype = {
		init : function(str){
			this.origin = str;
			if(mQuery.REG.test(str || '')){
				var m = str.match(mQuery.REG);
				
				this.init = true;
				this.relation = m[1];
				this.attr = new mQuery.QA(m[4]);
				this.attr2 = new mQuery.QA();
				this.spec = new mQuery.SP(m[6], m[8]);
				switch(m[2]){
					case '.': 
						this.attr2.init('[class=' + m[3] + ']'); 
						break;
					case '#':
						this.attr2.init('[id=' + m[3] + ']');
						break;
					default:
						if(!!m[3]){
							var _i;
							if((_i = Math.max(m[3].indexOf('.'), m[3].indexOf('#'))) > 0){
								this.type = m[3].substr(0, _i);
								switch(m[3].substr(_i, 1)){
									case '.': 
										this.attr2.init('[class=' + m[3].substr(_i + 1) + ']'); 
										break;
									case '#':
										this.attr2.init('[id=' + m[3].substr(_i + 1) + ']');
										break;
								}
							} else {
								this.type = m[3].toLowerCase()
							}
						} else {
							this.type = '';
						}
						
						break;
				}
				
				m = str = null;
			}
		}, match : function(n){
			if(!this.init) return true;
			var b = (!this.type || this.type == n.nodeName.toLowerCase())
					&& this.attr.match(n) 
					&& this.attr2.match(n) 
					&& this.spec.match(n);
			if(!b){
				return false
			} else if(this.previous && n.parentNode.nodeName.toLowerCase() != 'html') {
				switch(this.relation){
					case '>':
						return this.previous.match(n.parentNode);
					case '+':
						return n.previousSibling && this.previous.match(n.previousSibling);
					case '~':
						var _n = n.previousSibling;
						while(_n){
							if(this.previous.match(_n)) return true;
							_n = _n.previousSibling;
						}
						return false;
					case ' ':
						var _n = n.parentNode;
						while(_n.nodeName.toLowerCase() != 'html'){
							if(this.previous.match(_n)){
								return true;
							}
							_n = _n.parentNode;
						}
						return false;
					default: return false;
				}
			} else {
				return true;
			}
		}, Next : function(str){
			var qi = new w.mQuery.queryItem(str);
			if(qi.init){
				this.next = qi;
				qi.previous = this;
				return qi;
			}
			return this;
		}
	}
	w.mQuery.QA = function(s){ this.init(s); }
	w.mQuery.QA.prototype = {
		init : function(s){
			this.origin = s;
			if(!!s && mQuery.ATTR_REG.test(s = s.replace(/^\s*\[\s*|\s*\]\s*$/g, ''))){
				var m = s.match(mQuery.ATTR_REG);
				this.name = m[1];
				this.value = m[4];
				this.equal = m[3];
				m = null;
			}
		}, match : function(n){
			if(!!this.name && !!this.value){
				var v = !!n.getAttribute ? n.getAttribute(this.name) || n[this.name] : n[this.name];
				switch(this.equal){
					case '^': return v.indexOf(this.value) == 0;
					case '$': return v.substr(v.length - this.value.length, this.value.length) == this.value;
					case '*': return v.indexOf(this.value) > -1;
					case '!': return v != this.value;
					default : return v == this.value;
				}
			} else if(!!this.name){
				return !!n.hasAttribute ? n.hasAttribute(this.name) || !!n[this.name] : !!n[this.name];
			} else {
				return true;
			}
		}
	}
	w.mQuery.SP = function(n, v){ this.init(n, v); }
	w.mQuery.SP.prototype = {
		init : function(n, v){
			this.name = (n || '').toLowerCase();
			switch(this.name){
				case 'eq':
				case 'lt':
				case 'qt':
					this.value = parseInt(v);
					break;
				case 'not':
					this.subquery = new w.mQuery.QueryGroup(v);
					break;
				default:
					this.value = v;
					break;
			}
		}, match : function(n){
			if(n.nodeType != 1) return false;
			switch(this.name){
				case 'first':
					var _n = n.previousSibling;
					while(_n){
						if(_n.nodeType == 1) return false;
						_n = _n.previousSibling;
					}
					return true;
				case 'last':
					var _n = n.nextSibling;
					while(_n){
						if(_n.nodeType == 1) return false;
						_n = _n.nextSibling;
					}
					return true;
				case 'only':
					var _n = n.previousSibling;
					while(_n){
						if(_n.nodeType == 1) return false;
						_n = _n.previousSibling;
					}
					_n = n.nextSibling;
					while(_n){
						if(_n.nodeType == 1) return false;
						_n = _n.nextSibling;
					}
					return true;
				case 'first-of-type':
					var _n = n.previousSibling;
					while(_n){
						if(_n.nodeName == n.nodeName) return false;
						_n = _n.previousSibling;
					}
					return true;
				case 'last-of-type':
					var _n = n.nextSibling;
					while(_n){
						if(_n.nodeName == n.nodeName) return false;
						_n = _n.nextSibling;
					}
					return true;
				case 'only-of-type':
					return n.parentNode.getElementsByTagName(n.nodeName).length == 1;
				case 'contains':
					var text = n.innerHTML.replace(/<[^>]+>/g, '');
					var b = text.indexOf(this.value) > -1;
					text = null;
					return b;
				case 'eq':
					var i = 0, _n = n.previousSibling;
					while(_n){ if(_n.nodeType == 1) i++; _n = _n.previousSibling; }
					return i == this.value
				case 'lt':
					var i = 0, _n = n.previousSibling;
					while(_n){ if(_n.nodeType == 1) i++; _n = _n.previousSibling; }
					return i < this.value
				case 'qt':
					var i = 0, _n = n.previousSibling;
					while(_n){ if(_n.nodeType == 1) i++; _n = _n.previousSibling; }
					return i > this.value
				case 'not':
					if(!!this.subquery){
						return !this.subquery.match(n);
					}
					return true;
				default:
					return true;
			}
		}
	}
	//w.mQ = 
	w.mQuery.Q = function(query, dom){
		var r = w.mQuery.loop(dom || document, new w.mQuery.QueryGroup(query));
		return r;
	}
} })(window)