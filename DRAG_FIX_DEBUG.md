# 🔧 Drag Fix - Debug Guide

## ❌ Vấn Đề Đã Được Fix:

### Issue: Header không có ID
**Before:**
```html
<div class="actnow-chat-header">
```

**After:**
```html
<div id="actnow-chat-header" class="actnow-chat-header">
```

**Impact:** `get('actnow-chat-header')` trả về `null` → listener không được attach → không kéo được

---

## ✅ Improvements Made:

### 1. Added ID to Header
```javascript
// HTML now has:
<div id="actnow-chat-header" class="actnow-chat-header">
```

### 2. Enhanced Drag Detection
```javascript
handleDragStart(e) {
    console.log('🖱️ handleDragStart called, target:', e.target.className);
    
    // Skip if clicking buttons
    if (e.target.closest('button') || 
        e.target.closest('.actnow-icon-btn-modern') ||
        e.target.closest('.actnow-header-actions')) {
        console.log('⏭️ Skipping drag - clicked on button');
        return;
    }
    
    // ... rest of drag logic
}
```

### 3. Added Debug Logging
```javascript
// In setupDOMEvents():
if (header) {
    header.addEventListener('mousedown', (e) => this.handleDragStart(e));
    console.log('✅ Drag listener attached to header');
} else {
    console.error('❌ Header element not found for drag');
}
```

### 4. Improved Visual Feedback
```css
.actnow-chat-header {
    cursor: move;              /* Shows it's draggable */
    transition: background 0.2s;
}

.actnow-chat-header:hover {
    background: brighter;      /* Hover feedback */
}

.actnow-chat-header:active {
    cursor: grabbing;          /* While dragging */
}
```

### 5. Better Cursor Management
```javascript
// Start drag:
document.body.style.cursor = 'move';

// End drag:
document.body.style.cursor = '';
```

---

## 🧪 Test Now (30 seconds):

### Step 1: Reload Extension
```
chrome://extensions/ → Click "Reload"
```

### Step 2: Check Console Logs
```
1. Open any webpage
2. F12 → Console
3. Reload page
```

**Expected Logs:**
```
✅ Drag listener attached to header
```

**If you see:**
```
❌ Header element not found for drag
```
→ Extension needs to be reloaded again

### Step 3: Test Drag
```
1. Click chat button to open
2. Hover over header (purple area)
3. Cursor should show "move" icon ✋
4. Click and hold on header
5. Drag mouse
6. Release
```

**Expected Console Logs:**
```
🖱️ handleDragStart called, target: actnow-header-left
✅ Drag started at: {x: 234, y: 156}
🖱️ Drag ended
💾 Position saved: {x: 300, y: 200}
```

### Step 4: Verify Movement
```
1. Window should move with mouse
2. At least 50px stays visible
3. Position saved to storage
4. Reload page → same position ✅
```

---

## 🔍 Troubleshooting:

### Issue 1: Still Can't Drag

**Check Console:**
```javascript
// Type in Console:
window.ActNowInstance.shadowRoot.getElementById('actnow-chat-header')
```

**Expected:** Should return header element (not `null`)

**If `null`:**
- Extension not reloaded properly
- Page needs hard refresh (Ctrl+Shift+R)

### Issue 2: Drag Logs Show But No Movement

**Check State:**
```javascript
// Type in Console:
window.ActNowInstance.state.isDragging
```

**During drag, should be:** `true`

**Check Listeners:**
```javascript
// Manually test drag:
const instance = window.ActNowInstance;
instance.state.isDragging = true;
instance.state.dragStart = {x: 0, y: 0, containerX: 100, containerY: 100};
// Then move mouse - should log in console
```

### Issue 3: Cursor Doesn't Change

**Check CSS:**
```javascript
// Type in Console:
const header = window.ActNowInstance.shadowRoot.getElementById('actnow-chat-header');
console.log(getComputedStyle(header).cursor);
```

**Expected:** `"move"`

**If not:**
- CSS not loaded properly
- Reload extension

### Issue 4: Buttons Don't Work

**Expected Behavior:**
- Clicking buttons should NOT trigger drag
- Should see: `⏭️ Skipping drag - clicked on button`

**If buttons drag instead:**
- Logic for skipping buttons not working
- Check console logs

---

## 📊 Debug Commands:

### Check Header Element:
```javascript
const instance = window.ActNowInstance;
const header = instance.shadowRoot.getElementById('actnow-chat-header');
console.log('Header element:', header);
console.log('Has listener:', !!header.onmousedown);
```

### Check State:
```javascript
const instance = window.ActNowInstance;
console.log('isDragging:', instance.state.isDragging);
console.log('chatPosition:', instance.state.chatPosition);
console.log('dragStart:', instance.state.dragStart);
```

### Manual Trigger Drag:
```javascript
const header = window.ActNowInstance.shadowRoot.getElementById('actnow-chat-header');
const event = new MouseEvent('mousedown', {
    clientX: 100,
    clientY: 100,
    bubbles: true
});
header.dispatchEvent(event);
```

### Check Listeners:
```javascript
const instance = window.ActNowInstance;
console.log('boundDragMove:', typeof instance.boundDragMove);
console.log('boundDragEnd:', typeof instance.boundDragEnd);
```

---

## 🎯 Expected Behavior:

### Visual Flow:

**1. Hover Header:**
```
Normal → Hover → Cursor changes to "move" ✋
         Background slightly brighter
```

**2. Click and Hold:**
```
Hover → Click → Cursor changes to "grabbing" ✊
                Body cursor = 'move'
                Console: 🖱️ handleDragStart called
```

**3. Drag:**
```
Click → Drag → Window follows mouse
               Console logs position updates
               Container moves smoothly
```

**4. Release:**
```
Drag → Release → Cursor back to normal
                 Console: 🖱️ Drag ended
                 Console: 💾 Position saved: {...}
```

### Console Log Timeline:
```
Page Load:
  ✅ Drag listener attached to header

Click Header:
  🖱️ handleDragStart called, target: actnow-header-left
  ✅ Drag started at: {x: 234, y: 156}

During Drag:
  (No logs - smooth dragging)

Release:
  🖱️ Drag ended
  💾 Position saved: {x: 300, y: 200}
```

---

## 🔧 Technical Details:

### Event Flow:
```
mousedown on header
    ↓
handleDragStart()
    ↓ (if not button)
isDragging = true
    ↓
Add document listeners
    ↓
mousemove on document
    ↓
handleDragMove()
    ↓
Update position
    ↓
mouseup on document
    ↓
handleDragEnd()
    ↓
Save to storage
```

### Position Calculation:
```javascript
deltaX = currentMouseX - startMouseX
deltaY = currentMouseY - startMouseY

newX = startContainerX + deltaX
newY = startContainerY + deltaY

// Apply constraints:
minVisible = 50px
newX = clamp(newX, minVisible - width, windowWidth - minVisible)
newY = clamp(newY, minVisible - height, windowHeight - minVisible)
```

---

## ✅ Files Modified:

### 1. content.js
- ✅ Added `id="actnow-chat-header"` to HTML
- ✅ Added debug logging in `handleDragStart`
- ✅ Added `e.stopPropagation()` in drag start
- ✅ Added `e.preventDefault()` in drag move
- ✅ Improved cursor management
- ✅ Added error log if header not found

### 2. chat-widget.css
- ✅ Added hover effect for header
- ✅ Added `:active` state with `grabbing` cursor
- ✅ Added transition for smooth feedback

---

## 🎉 Success Checklist:

After reload, all should be TRUE:

- [ ] ✅ Console shows: "Drag listener attached to header"
- [ ] ✅ Hovering header shows "move" cursor
- [ ] ✅ Clicking & dragging header moves window
- [ ] ✅ Console shows: "Drag started" on click
- [ ] ✅ Window follows mouse smoothly
- [ ] ✅ Console shows: "Position saved" on release
- [ ] ✅ Position persists after reload
- [ ] ✅ Buttons still clickable (don't drag)
- [ ] ✅ Can't drag window completely off-screen

---

## 💡 Tips:

### For Best Drag Experience:

1. **Click on empty area of header** (not on text/icons)
2. **Drag smoothly** - don't jerk the mouse
3. **Release when positioned** - saves automatically

### For Debugging:

1. **Always check Console first** - logs tell you everything
2. **Use debug commands** - manual inspection helps
3. **Reload extension fully** - some changes need full reload

---

## 🚀 Now Go Test!

```
1. Reload extension
2. Open chat
3. Hover header → See "move" cursor
4. Click & drag → Window moves
5. Release → Position saved
6. Reload page → Same position
```

**Drag should work perfectly now! 🎊**
