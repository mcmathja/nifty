nifty
=====

A purely functional wysiwyg editor

```JavaScript
var b = new CharFormat(['b'])
var i = new CharFormat(['i'])
var txt = 'Stephen, an elbow rested on the jagged granite, leaned his palm against his brow and gazed at the fraying edge of his shiny black coat-sleeve. Pain, that was not yet the pain of love, fretted his heart. Silently, in a dream she had come to him after her death, her wasted body within its loose brown graveclothes giving off an odour of wax and rosewood, her breath, that had bent upon him, mute, reproachful, a faint odour of wetted ashes. Across the threadbare cuffedge he saw the sea hailed as a great sweet mother by the wellfed voice beside him. The ring of bay and skyline held a dull green mass of liquid. A bowl of white china had stood beside her deathbed holding the green sluggish bile which she had torn up from her rotting liver by fits of loud groaning vomiting.'

var mountPoint = document.getElementById('editor')
var editor = (new Editor).mount(mountPoint)
editor.ins(0, txt).add(20, 50, b).add(10, 50, i).del(33, 10).mov(300, 'aaa').render()
```