define('nifty', function(ele) {

  /**
    Class: Interval
    Represents a range of text.
   */

  function Interval(lo, hi) {
    if(!(this instanceof Interval))
      return new Interval(lo, hi)
    if(lo === undefined || hi === undefined || lo > hi)
      throw new Error("Invalid interval specified")
    this.lo = lo
    this.hi = hi
  }

  Interval.prototype.empty = function() {
    return this.lo === this.hi
  }

  Interval.prototype.length = function() {
    return this.hi - this.lo
  }

  Interval.prototype.expand = function(amt) {
    return new Interval(this.lo, this.hi + amt)
  }

  Interval.prototype.shrink = function(amt) {
    return this.hi - amt > 0 ?
      this.expand(-amt) : new Interval(this.lo, this.lo)
  }

  Interval.prototype.shift = function(amt) {
    return new Interval(this.lo + amt, this.hi + amt)
  }

  Interval.prototype.incl = function(that) {
    if(that instanceof Interval)
      return this.incl(that.lo) && this.incl(that.hi)
    else
      return this.lo <= that && this.hi >= that
  }

  Interval.prototype.below = function(that) {
    if(that instanceof Interval)
      return this.hi < that.lo
    else
      return this.hi < that
  }

  Interval.prototype.above = function(that) {
    if(that instanceof Interval)
      return this.lo > that.hi
    else
      return this.lo > that
  }

  Interval.prototype.intersects = function(that) {
    return this.incl(that.lo) || this.incl(that.hi)
  }

  Interval.prototype.equals = function(that) {
    return this.lo === that.lo && this.hi === that.hi
  }

  Interval.prototype.fullIntv = function(that) {
    return new Interval(Math.min(this.lo, that.lo),
      Math.max(this.hi, that.hi))
  }

  Interval.prototype.loIntv = function(that) {
    return new Interval(Math.min(this.lo, that.lo),
      Math.max(Math.min(this.hi, that.lo),
        Math.min(this.lo, that.hi)))
  }

  Interval.prototype.hiIntv = function(that) {
    return new Interval(Math.min(Math.max(this.hi, that.lo),
        Math.max(this.lo, that.hi)),
      Math.max(this.hi, that.hi))
  }

  Interval.prototype.limit = function(that) {
    return new Interval(Math.max(this.lo, that.lo),
      Math.min(this.hi, that.hi))
  }

  Interval.prototype.serialize = function() {
    return [this.lo, this.hi]
  }

  Interval.unserialize = function(serialized) {
    return new Interval(serialized[0], serialized[1])
  }



  /**
    Class: IntervalList
    Specifies a list of formatting Intervals.
   */

  function IntervalList(intv, tail) {
    if(!(this instanceof IntervalList))
      return new IntervalList(intv, tail)
    if(!(intv instanceof Interval))
      return new EmptyList()
    if(intv.empty())
      if(tail)
        return new IntervalList(tail.intv, tail.tail)
      else
        return new EmptyList()
    
    this.intv = intv
    this.tail = tail || new EmptyList()
    this.empty = false
  }

  function EmptyList() {
    this.empty = true
  }
  EmptyList.prototype = Object.create(IntervalList.prototype)
  EmptyList.prototype.constructor = EmptyList

  IntervalList.prototype.length = function(offset) {
    var o = offset || 0
    if(this.tail.empty)
      return o
    else
      return this.tail.length(o + 1)
  }

  IntervalList.prototype.intersects = function(idx) {
    if(this.empty)
      return false
    else if(this.intv.incl(idx))
      return true
    else
      return this.tail.intersects(idx)
  }

  IntervalList.prototype.shift = function(amt) {
    if(this.empty)
      return this
    else
      return new IntervalList(this.intv.shift(amt),
        this.tail.shift(amt))
  }

  IntervalList.prototype.ins = function(len, idx) {
    if(this.empty)
      return this
    else if(this.intv.below(idx))
      return new IntervalList(this.intv,
        this.tail.ins(len, idx))
    else if(this.intv.above(idx))
      return this.shift(len)
    else
      return new IntervalList(this.intv.expand(len),
        this.tail.shift(len))
  }

  IntervalList.prototype.del = function(len, idx) {
    var i = new Interval(idx, idx + len)
    if(this.empty || len === 0)
      return this
    else if(this.intv.below(i))
      return new IntervalList(this.intv,
        this.tail.del(len, idx))
    else if(this.intv.above(i))
      return this.shift(-len)
    else if(this.intv.incl(i))
      return new IntervalList(this.intv.shrink(len),
        this.tail.shift(-len))
    else if(this.intv.incl(i.hi))
      return new IntervalList(new Interval(idx, this.intv.hi - len),
        this.tail.shift(-len))
    else if(this.intv.incl(i.lo))
      return this.tail.del(len, idx).app(new Interval(this.intv.lo, idx))
    else
      return this.tail.del(len, idx)
  }

  IntervalList.prototype.app = function(i) {
    if(i.empty())
      return this
    else if(this.empty)
      return new IntervalList(i)
    else if(this.intv.below(i))
      return new IntervalList(this.intv,
        this.tail.app(i))
    else if(this.intv.above(i))
      return new IntervalList(i, this)
    else if(this.intv.incl(i))
      return new IntervalList(this.intv.loIntv(i),
        new IntervalList(this.intv.hiIntv(i), this.tail))
    else
      return this.tail.app(this.intv.fullIntv(i))
  }

  IntervalList.prototype.window = function(i) {
    if(this.empty)
      return this
    else if(i.incl(this.intv))
      return new IntervalList(this.intv, this.tail.window(i))
    else if(this.intv.intersects(i))
      return new IntervalList(this.intv.limit(i), this.tail.window(i))
    else
      return this.tail.window(i)
  }

  IntervalList.prototype.serialize = function() {
    if(this.empty)
      return []
    return [this.intv.serialize()].concat(this.tail.serialize())
  }

  IntervalList.gen = function() {
    if(!arguments.length)
      return new EmptyList()
    return [].slice.call(arguments).reduce(
      function(ilist, i) {
        return ilist.app(i)
      }, new IntervalList())
  }

  IntervalList.unserialize = function(serialized) {
    if(!serialized)
      return new EmptyList()
    return IntervalList.gen.apply(null, serialized.map(function(i) {
      return Interval.unserialize(i)
    }))
  }



  /**
    Class: Text
    Contains the model data representing the rich text.
   */

  function Text(t, bold, italic) {
    if(!(this instanceof Text))
      return new Text(t, bold, italic)
    this.t = t || ''
    this.bold = bold ? bold.window(Interval(0, t.length)) :
      new IntervalList()
    this.italic = italic ? italic.window(Interval(0, t.length)) :
      new IntervalList()
  }

  Text.prototype.ins = function(str, idx) {
    return new Text(this.t.substr(0,idx) + str + this.t.substr(idx),
      this.bold.ins(str.length, idx),
      this.italic.ins(str.length, idx))
  }

  Text.prototype.del = function(len, idx) {
    return new Text(this.t.substr(0,idx) + this.t.substr(idx + len),
      this.bold.del(len, idx),
      this.italic.del(len, idx))
  }

  Text.prototype.length = function() {
    return this.t.length
  }

  Text.prototype.format = function(type, intv) {
    switch(type) {
      case 'bold':
      case 'embolden':
        return this.embolden(intv)
        break
      case 'italic':
      case 'italicize':
        return this.italicize(intv)
        break
      default:
        throw new Error(type + " is not a valid formatting option")
    }
  }

  Text.prototype.embolden = function(intv) {
    return new Text(this.t, this.bold.app(intv), this.italic)
  }

  Text.prototype.italicize = function(intv) {
    return new Text(this.t, this.bold, this.italic.app(intv))
  }

  Text.prototype.toHTML = function() {
    var b = makeObj(this.bold, 'b')
    var i = makeObj(this.italic, 'i')
    var x = [].concat(b,i).sort(function(a,b) {
      return a.idx - b.idx
    })

    if(!x.length)
      return this.t
    return x.reduce(function(gen, i, idx, arr) {
      gen.html += gen.text.slice(gen.offset, i.idx)
      if(i.start) {
        gen.states.unshift(i.val)
        gen.html += makeTag(i.val, true)
      } else {
        var x = []
        while(gen.states[0] != i.val) {
          x.unshift(gen.states.shift())
          gen.html += makeTag(x[0], false)
        }
        gen.html += makeTag(gen.states.shift(), false)
        while(x.length) {
          gen.states.unshift(x.shift())
          gen.html += makeTag(gen.states[0], true)
        }
      }
      gen.offset = i.idx
      if(idx === arr.length - 1)
        return gen.html + gen.text.slice(i.idx)
      return gen
    }, {
      states: [],
      html: '',
      text: this.t,
      offset: 0
    }).replace(/\n(<\/.>)*$/, '$1\n\r')
  }

  function makeObj(intvl, tag) {
    return intvl.serialize().reduce(function(gen, i) {
      gen.push({idx: i[0], start:true, val:tag},
        {idx:i[1], start: false, val:tag})
      return gen
    }, [])
  }

  function makeTag(name, open) {
    if(open)
      return '<' + name + '>'
    else
      return '</' + name + '>'
  }

  Text.prototype.serialize = function() {
    return {
      t: this.t,
      format: {
        b: this.bold.serialize(),
        i: this.italic.serialize()
      }
    }
  }

  Text.unserialize = function(serialized) {
    if(!serialized)
      return new Text()
    return new Text(serialized.t,
      IntervalList.unserialize(serialized.format.b),
      IntervalList.unserialize(serialized.format.i))
  }




  /**
    Class: Editor
    Controller managing DOM view & interactions with text model.
   */

  function Editor(ele, opt) {
    console.log(opt.bold)
    opt = opt ? opt : {}
    var ele = ele
    var text = new Text(opt.text || '',
      IntervalList.unserialize(opt.bold),
      IntervalList.unserialize(opt.italic))
    var local = opt.local || true
    var history = []

    this.state = function() {
      return {
        ele: ele,
        text: text
      }
    }

    function setSel(start, end) {
      var range = document.createRange()

      var tw = document.createTreeWalker(ele, NodeFilter.SHOW_TEXT)
      while(tw.nextNode() && start > tw.currentNode.length)
        start -= tw.currentNode.length
      range.setStart(tw.currentNode, start)

      if(end) {
        var tw = document.createTreeWalker(ele, NodeFilter.SHOW_TEXT)
        while(tw.nextNode() && end > tw.currentNode.length)
          end -= tw.currentNode.length
        range.setEnd(tw.currentNode, end)
      }

      document.getSelection().removeAllRanges()
      document.getSelection().addRange(range)
    }

    function getSel() {
      var cur = window.getSelection().getRangeAt(0)
      var range = document.createRange()

      range.selectNodeContents(ele)
      range.setEnd(cur.startContainer, cur.startOffset)
      var start = Math.min(range.toString().length, text.length())
      var end = Math.min(start + cur.toString().length, text.length())

      return {
        start: start,
        end: end
      }
    }

    function update(start, end) {
      ele.innerHTML = text.toHTML()
      setSel(start, end)
    }

    ele.addEventListener('keypress', function(e) {
      if(key = e.which) {
        e.preventDefault()
        var sel = getSel()
        text = text.del(sel.end - sel.start, sel.start).ins(
          key !== 13 ? String.fromCharCode(key) : "\n",
          sel.end)
        update(sel.start + 1)
      }
    })

    ele.addEventListener('keydown', function(e) {
      var key = e.which
      if(key === 8) {
        e.preventDefault()
        sel = getSel()
        if(sel.start === sel.end && sel.start !== 0) {
          text = text.del(1, sel.start - 1)
          update(sel.start - 1)
        } else {
          text = text.del(sel.end - sel.start, sel.start)
          update(sel.start)
        }
      } else if(e.metaKey && (key === 66 || key === 73 || key === 65)) {
        e.preventDefault()
        var sel = getSel()
        switch(key) {
          case 65:
            sel.start = 0, sel.end = text.length()
            break
          case 66:
            text = text.embolden(new Interval(sel.start, sel.end))
            break
          case 73:
            text = text.italicize(new Interval(sel.start, sel.end))
            break
          default:
            break
        }
        update(sel.start, sel.end)
      }
    })

    ele.addEventListener('compositionend', function(e) {
      e.preventDefault()
      sel = getSel()
      text = text.ins(e.data, sel.start)
      update(sel.start + e.data.length)
    })

    ele.addEventListener('textInput', function(e) {
      e.preventDefault()
    })

    update()
  }



  /**
    Module exports
   */

  return Editor
})