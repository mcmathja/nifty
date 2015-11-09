/**
 * nifty.js
 * A nifty rich text editor powered by a purely functional data model.
 */

 // Predef

var CHAR_STYLES = ['b','i','u','sup','sub']
var PARA_STYLES = ['l','r','c']

var inherits = function(child, parent) {
  child.prototype = Object.create(parent.prototype)
  child.prototype.constructor = child
  child.super_ = parent
}



// Caret model

/**
 * Base case representing an absence of Carets.
 */

function Caretless() {}
Caretless.prototype.shift = function() { return this }
Caretless.prototype.put = function(off, uid) { return new Caret(off, uid, this) }
Caretless.prototype.rem = function() { return this }
Caretless.prototype.find = function() { return null }
Caretless.prototype.ins = function() { return this }
Caretless.prototype.del = function() { return this }
Caretless.prototype.split = function() { return this }
Caretless.prototype.truncate = function() { return this }
Caretless.prototype.render = function() { }
Caretless.prototype.dom = function() { return null }

/**
 * Represents a sequence of editing Carets.
 */

function Caret(off, uid, next) {
  this.off = off
  this.uid = uid
  this.next = next
  this.style = 'ni-ele ni-ele-c ni-ele-uid-' + this.uid
}

Caret.prototype.shift = function(off) {
  return new Caret(this.off + off, this.uid, this.next)
}

Caret.prototype.put = function(pos, uid) {
  if(pos < this.off)
    return new Caret(pos, uid, new Caret(this.off - pos, this.uid, this.next))
  else
    return new Caret(this.off, this.uid, this.next.put(pos - this.off, uid))
}

Caret.prototype.rem = function(uid) {
  if(uid === this.uid)
    return this.next.shift(this.off)
  else
    return new Caret(this.off, this.uid, this.next.rem(uid))
}

Caret.prototype.find = function(off, uid) {
  if(uid === this.uid)
    return off + this.off
  else
    return this.next.find(off + this.off, uid)
}

Caret.prototype.ins = function(pos, txt) {
  if(pos < this.off)
    return this.shift(txt.length)
  else
    return new Caret(this.off, this.uid, this.next.ins(pos - this.off, txt))
}

Caret.prototype.del = function(pos, len) {
  if(pos + len <= this.off)
    return this.shift(-len)
  else if(pos < this.off)
    return new Caret(pos, this.uid, this.next.del(0, len - (this.off - pos)))
  else
    return new Caret(this.off, this.uid, this.next.del(pos - this.off, len))
}

Caret.prototype.split = function(pos) {
  return this.ins(pos, ' ')
}

Caret.prototype.truncate = function(pos) {
  if(pos <= this.off)
    return new Caret(this.off - pos, this.uid, this.next)
  else
    return this.next.truncate(pos - this.off)
}

Caret.prototype.render = function(mount, until) {
  if(this.off <= until) {
    if(mount.nodeType === 3) {
      var sibling = mount.splitText(this.off)
      mount.parentNode.insertBefore(this.dom(), sibling)
      this.next.render(sibling, until - this.off)
    } else {
      mount.appendChild(this.dom())
      this.next.render(mount, until - this.off)
    }
  }
}

Caret.prototype.dom = function() {
  var dom = document.createElement('div')
  dom.setAttribute('class', 'ni-cursor')
  dom.niNode = this
  return dom
}



// Text model

/**
 * Format represents a set of styles to be applied to a given text block.
 */

function Format(valid, style) {
  this.valid = valid
  this.style = this.valid.filter(function(val) {
    return style.indexOf(val) > -1
  })

  this.html = this.style.length ?
    'ni-' + this.style.join(' ni-') : ''
}

Format.prototype.eq = function(that) {
  return this.html === that.html && this.valid === that.valid
}

Format.prototype.add = function(that) {
  return new Format(this.valid, this.style.concat(that.style))
}

Format.prototype.sub = function(that) {
  return new Format(this.valid, this.style.filter(function(tag) {
    return that.style.indexOf(tag) < 0
  }))
}

/**
 * CharFormat wraps formats that apply on a per-Interval basis.
 */

function CharFormat(conf) { return new Format(CHAR_STYLES, conf || []) }

/**
 * ParaFormat wraps formats that apply on a per-Paragraph basis.
 */

function ParaFormat(conf) { return new Format(PARA_STYLES, conf || []) }



/**
 * Abstract class representing a node of the text tree.
 */

function Node() {}

Node.prototype.inc = function(pos) {
  return pos >= 0 && pos <= this.len
}

Node.prototype.sect = function(pos, len) {
  return pos < this.len && pos + len > 0
}

Node.prototype.inside = function(pos, len) {
  return pos <= 0 && pos + len >= this.len
}

Node.prototype.render = function(mount, carets, offset) {
  if(mount.niNode !== this) {
    if(mount.niNode && mount.niNode.ele === this.ele) {
      mount.niNode = this
      this.upd(mount, carets, offset)
    } else {
      mount.parentNode.replaceChild(this.dom(carets, offset), mount)
    }
  }
  return this
}

Node.prototype.domFragment = function() {
  var dom = document.createElement('div')
  dom.setAttribute('class', this.style)
  dom.niNode = this
  return dom
}



/** 
 * Abstract class representing a leaf node of the text tree.
 */

function Leaf() {
  Leaf.super_.call(this)

  this.leaf = true
  this.size = 1

  this.leftmost = this
  this.rightmost = this
}

inherits(Leaf, Node)



/**
 * Abstract class representing a branch node of the text tree.
 */

function Branch(left, right) {
  Branch.super_.call(this)

  // If the tree is growing lopsided, rebalance it.
  if(right.size / 2 > left.size) {
    this.left = new this.constructor(left, right.left)
    this.right = right.right
  } else if(left.size / 2 > right.size) {
    this.left = left.left
    this.right = new this.constructor(left.right, right)
  } else {
    this.left = left
    this.right = right
  }

  // Hoist up a direct reference to the left/rightmost descendant nodes.
  this.leftmost = this.left.leaf ? this.left : this.left.leftmost
  this.rightmost = this.right.leaf ? this.right : this.right.rightmost

  this.leaf = false
  this.size = this.left.size + this.right.size
  this.len = this.left.len + this.right.len
  this.mid = this.left.len
}

inherits(Branch, Node)

Branch.prototype.merge = function() {
  if(this.right.leaf)
    return this.left.concat(this.right)
  return new this.constructor(this.left.concat(this.right.leftmost),
    this.right.unshift())
}

Branch.prototype.concat = function(that) {
  return new this.constructor(this.left, this.right.concat(that))
}

Branch.prototype.unshift = function() {
  if(this.left.leaf)
    return this.right
  else
    return new this.constructor(this.left.unshift(), this.right)
}

Branch.prototype.dom = function(carets, offset) {
  var dom = this.domFragment()
  dom.appendChild(this.left.dom(carets, offset))
  dom.appendChild(this.right.dom(carets, offset + this.left.len))
  return dom
}

Branch.prototype.upd = function(mount, carets, offset) {
  this.left.render(mount.children[0], carets, offset)
  this.right.render(mount.children[1], carets, offset + this.left.len)
}



/**
 * Represents a basic interval of formatted text.
 */

function Interval(txt, fmt) {
  Interval.super_.call(this)

  this.txt = txt || ''
  this.fmt = fmt || new CharFormat
  this.len = this.txt.length
  this.ele = 'i'
  this.style = 'ni-ele ni-ele-i ' + this.fmt.html
}

inherits(Interval, Leaf)

Interval.prototype.ins = function(pos, txt) {
  if(this.inc(pos))
    return new Interval(
      this.txt.slice(0, pos) + txt + this.txt.slice(pos),
      this.fmt
    )
  else
    return this
}

Interval.prototype.del = function(pos, len) {
  if(this.sect(pos, len))
    return new Interval(
      this.txt.slice(0, Math.max(0, pos)) + this.txt.slice(pos + len),
      this.fmt
    )
  else
    return this
}

Interval.prototype.app = function(pos, len, fmt) {
  if(this.inside(pos, len))
    return new Interval(this.txt, fmt)
  else if(this.sect(pos, len))
    return this.split(pos + len, fmt).split(pos, this.fmt)
  else
    return this
}

Interval.prototype.add = function(pos, len, fmt) {
  return this.app(pos, len, this.fmt.add(fmt))
}

Interval.prototype.sub = function(pos, len, fmt) {
  return this.app(pos, len, this.fmt.sub(fmt))
}

Interval.prototype.split = function(pos, fmt) {
  if(pos <= 0)
    return this
  else if(pos >= this.len)
    return new Interval(this.txt, fmt)
  else
    return new IntervalTree(
      new Interval(this.txt.slice(0, pos), fmt),
      new Interval(this.txt.slice(pos), this.fmt)
    )
}

Interval.prototype.concat = function(that) {
  return new Interval(this.txt + that.txt, this.fmt)
}

Interval.prototype.dom = function(carets, offset) {
  var dom = this.domFragment()
  dom.textContent = this.txt
  carets.truncate(offset).render(dom.firstChild || dom, this.len)
  return dom
}

Interval.prototype.upd = function(mount, carets, offset) {
  mount.setAttribute('class', this.style)
  mount.textContent = this.txt
  carets.truncate(offset).render(mount.firstChild || mount, this.len)
}



/**
 * Represents an ordered set of Intervals.
 */

function IntervalTree(left, right) {
  IntervalTree.super_.call(this, left, right)

  // Neighboring intervals should always have distinct Formats.
  if(left.rightmost.fmt.eq(right.leftmost.fmt))
    return this.merge()

  this.ele = 'it'
  this.style = 'ni-ele ni-ele-it'
}

inherits(IntervalTree, Branch)

IntervalTree.prototype.ins = function(pos, txt) {
  if(pos === this.mid)
    return new IntervalTree(this.left.ins(pos, txt), this.right)
  else if(this.inc(pos))
    return new IntervalTree(this.left.ins(pos, txt),
      this.right.ins(pos - this.mid, txt))
  else
    return this
}

IntervalTree.prototype.del = function(pos, len) {
  if(pos <= this.mid && pos + len >= this.len)
    return this.left.del(pos, len)
  else if(pos <= 0 && pos + len >= this.mid)
    return this.right.del(pos - this.mid, len)
  else if(this.sect(pos, len))
    return new IntervalTree(this.left.del(pos, len),
      this.right.del(pos - this.mid, len))
  else
    return this
}

IntervalTree.prototype.add = function(pos, len, fmt) {
  if(this.sect(pos, len))
    return new IntervalTree(this.left.add(pos, len, fmt),
      this.right.add(pos - this.mid, len, fmt))
  else
    return this
}

IntervalTree.prototype.sub = function(pos, len, fmt) {
  if(this.sect(pos, len))
    return new IntervalTree(this.left.sub(pos, len, fmt),
      this.right.sub(pos - this.mid, len, fmt))
  else
    return this
}

IntervalTree.prototype.split = function(pos, fmt) {
  if(this.inc(pos))
    return new IntervalTree(this.left.split(pos, fmt),
      this.right.split(pos - this.mid, fmt))
  else
    return this
}



/**
 * Represents a paragraph of formatted text as the root of a tree.
 */

function Paragraph(root, fmt) {
  Paragraph.super_.call(this)

  this.root = root || new Interval
  this.fmt = fmt || new ParaFormat

  // A paragraph always contains a paragraph break.
  this.len = this.root.len + 1

  this.ele = 'p'
  this.style = 'ni-ele ni-ele-p ' + this.fmt.html
}

inherits(Paragraph, Leaf)

Paragraph.prototype.ins = function(pos, txt) {
  if(this.inc(pos))
    return new Paragraph(this.root.ins(pos, txt), this.fmt)
  else
    return this
}

Paragraph.prototype.del = function(pos, len) {
  if(this.sect(pos, len))
    return new Paragraph(this.root.del(pos, len), this.fmt)
  else
    return this
}

Paragraph.prototype.add = function(pos, len, fmt) {
  if(this.sect(pos, len) || pos === 0) {
    if(fmt.valid === CHAR_STYLES)
      return new Paragraph(this.root.add(pos, len, fmt), this.fmt)
    else
      return new Paragraph(this.root, this.fmt.add(fmt))
  } else
    return this
}

Paragraph.prototype.sub = function(pos, len, fmt) {
  if(this.sect(pos, len) || pos === 0) {
    if(fmt.valid === CHAR_STYLES)
      return new Paragraph(this.root.sub(pos, len, fmt), this.fmt)
    else
      return new Paragraph(this.root, this.fmt.sub(fmt))
  } else
    return this
}

Paragraph.prototype.concat = function(that) {
  return new Paragraph(
    new IntervalTree(this.root, that.root),
    this.fmt
  )
}

Paragraph.prototype.split = function(pos) {
  if(this.inc(pos))
    return new ParagraphTree(
      this.del(pos, this.len),
      this.del(0, pos)
    )
  else
    return this
}

Paragraph.prototype.dom = function(carets, offset) {
  var dom = this.domFragment()
  dom.appendChild(this.root.dom(carets.truncate(offset), 0))
  return dom
}

Paragraph.prototype.upd = function(mount, carets, offset) {
  mount.setAttribute('class', this.style)
  this.root.render(mount.children[0], carets.truncate(offset), 0)
}



/**
 * Represents an ordered set of Paragraphs.
 */

ParagraphTree = function(left, right) {
  ParagraphTree.super_.call(this, left, right)

  this.ele = 'pt'
  this.style = 'ni-ele ni-ele-pt'
}

inherits(ParagraphTree, Branch)

ParagraphTree.prototype.ins = function(pos, txt) {
  if(this.inc(pos))
    return new ParagraphTree(this.left.ins(pos, txt),
      this.right.ins(pos - this.mid, txt))
  else
    return this
}

ParagraphTree.prototype.del = function(pos, len) {
  if(pos < this.mid && pos + len > this.len)
    return this.left.del(pos, len)
  else if(pos < this.mid && pos + len >= this.mid)
    return new ParagraphTree(this.left.del(pos, len),
      this.right.del(pos - this.mid, len)).merge()
  else if(this.sect(pos, len))
    return new ParagraphTree(this.left.del(pos, len),
      this.right.del(pos - this.mid, len))
  else
    return this
}

ParagraphTree.prototype.add = function(pos, len, fmt) {
  if(this.sect(pos, len) || pos === 0)
    return new ParagraphTree(this.left.add(pos, len, fmt),
      this.right.add(pos - this.mid, len, fmt))
  else
    return this
}

ParagraphTree.prototype.sub = function(pos, len, fmt) {
  if(this.sect(pos, len) || pos === 0)
    return new ParagraphTree(this.left.sub(pos, len, fmt),
      this.right.sub(pos - this.mid, len, fmt))
  else
    return this
}

ParagraphTree.prototype.split = function(pos) {
  if(this.inc(pos))
    return new ParagraphTree(this.left.split(pos),
      this.right.split(pos - this.mid))
  else
    return this
}



/**
 * An Editor consists of text content and editing carets.
 */

function Editor(content, carets) {
  this.content = content || new Paragraph
  this.carets = carets || new Caretless
  this.mounts = []
}

Editor.prototype.ins = function(pos, txt) {
  this.content = this.content.ins(pos, txt)
  this.carets = this.carets.ins(pos, txt)
  return this
}

Editor.prototype.del = function(pos, len) {
  this.content = this.content.del(pos, len)
  this.carets = this.carets.del(pos, len)
  return this
}

Editor.prototype.add = function(pos, len, fmt) {
  this.content = this.content.add(pos, len, fmt)
  return this
}

Editor.prototype.sub = function(pos, len, fmt) {
  this.content = this.content.sub(pos, len, fmt)
  return this
}

Editor.prototype.split = function(pos) {
  this.content = this.content.split(pos)
  this.carets = this.carets.split(pos)
  return this
}

Editor.prototype.mov = function(pos, uid) {
  var orig = this.carets.find(0, uid)
  this.content = orig === null ?
    this.content.ins(pos, '') : this.content.ins(orig, '').ins(pos, '')
  this.carets = this.carets.rem(uid).put(pos, uid)
  return this
}

Editor.prototype.rem = function(uid) {
  var orig = this.carets.find(0, uid)
  this.content = orig === null ?
    this.content : this.content.ins(orig, '')
  this.carets = this.carets.rem(uid)
  return this
}

Editor.prototype.mount = function(mountPoint) {
  if(this.mounts.indexOf(mountPoint) < 0) {
    if(mountPoint.tagName.toLowerCase() !== "div")
      throw new Error("Must mount to a div.")
    while(mountPoint.lastChild)
      mountPoint.removeChild(mountPoint.lastChild)

    mountPoint.appendChild(this.content.dom(this.carets, 0))
    this.mounts.push(mountPoint)
  }
  return this
}

Editor.prototype.render = function() {
  var self = this
  this.mounts.forEach(function(mount) {
    self.content.render(mount.firstChild, self.carets, 0)
  })
  return this
}