# 🔧 Fix: UI Biến Mất Khi Drag

## ✅ Những Gì Đã Fix:

### 1. **Position Mode Switch** 🔄
- **Before:** Container dùng `position: absolute` (relative to parent)
- **After:** Khi drag, chuyển sang `position: fixed` (relative to viewport)
- **Why:** Tránh bị ảnh hưởng bởi parent's transform

### 2. **Disable Animations During Drag** 🎬
```javascript
// Khi bắt đầu drag:
container.style.transition = 'none';
container.style.animation = 'none';  // ✅ NEW
```
- Animation `actnow-slide-in-right` có thể conflict với drag
- Disable để đảm bảo smooth dragging

### 3. **Enhanced Constraints** 📏
```javascript
// Improved validation:
const maxX = window.innerWidth - minVisible;
const maxY = window.innerHeight - minVisible;
const minX = minVisible - this.state.chatSize.width;
const minY = minVisible - this.state.chatSize.height;

// Check for NaN
if (isNaN(newX) || isNaN(newY)) {
    console.error('❌ Invalid position');
    return;
}
```

### 4. **Force Visibility** 👁️
```javascript
container.style.visibility = 'visible';
container.style.opacity = '1';
```
- Đảm bảo container không bị ẩn

### 5. **Comprehensive Debug Logging** 📝
- Log position changes
- Log container rect
- Log visibility status
- Check if rect has valid dimensions

---

## 🧪 Test Now - Follow These Steps:

### Step 1: Reload Extension
```
chrome://extensions/ → Click "Reload"
```

### Step 2: Open Console (IMPORTANT!)
```
F12 → Console tab
Keep console open to see debug logs!
```

### Step 3: Reload Page
```
F5 to reload the webpage
```

**Expected Initial Logs:**
```
✅ Drag listener attached to header
📍 Default centered position applied
```

### Step 4: Open Chat
```
Click chat button to open
```

### Step 5: Attempt to Drag
```
1. Hover header (purple bar) → cursor should be ✋
2. Click and hold on header (not buttons!)
3. Try to drag slowly
```

**Watch Console for These Logs:**
```
🖱️ handleDragStart called, target: ...
✅ Drag started at: {x: ..., y: ...} containerRect: {left: ..., top: ..., width: ..., height: ...}
📍 Position applied: {x: ..., y: ...} actualRect: {...}
```

### Step 6: Check actualRect
**CRITICAL: Look at the `actualRect` log**

Example of GOOD log:
```
📍 Position applied: {x: 300, y: 200} actualRect: {
    left: 300,
    top: 200,
    width: 380,
    height: 600,
    visible: true  ← IMPORTANT!
}
```

Example of BAD log (UI invisible):
```
📍 Position applied: {x: 300, y: 200} actualRect: {
    left: -5000,  ← Off-screen!
    top: -3000,   ← Off-screen!
    width: 0,     ← Width is 0!
    height: 0,    ← Height is 0!
    visible: false  ← NOT VISIBLE!
}
```

---

## 🔍 Debugging Scenarios:

### Scenario A: UI Still Disappears

**What to check in Console:**
1. Does `handleDragStart` log appear?
   - **NO** → Drag listener not working
   - **YES** → Continue to #2

2. Does `Position applied` log appear?
   - **NO** → handleDragMove not being called
   - **YES** → Check the values

3. Check `actualRect` values:
   - `left` should be between -320 and window.innerWidth
   - `top` should be between -400 and window.innerHeight
   - `width` should be > 0
   - `height` should be > 0
   - `visible` should be `true`

**If actualRect shows invalid values:**
```javascript
// Type in Console to check:
window.ActNowInstance.state.chatPosition
window.ActNowInstance.state.chatSize
window.ActNowInstance.state.isDragging
```

### Scenario B: Logs Show Correct Position But Still Invisible

**Check computed styles:**
```javascript
// Type in Console:
const container = window.ActNowInstance.shadowRoot.getElementById('actnow-chat-container');
const styles = getComputedStyle(container);
console.log({
    position: styles.position,
    top: styles.top,
    left: styles.left,
    width: styles.width,
    height: styles.height,
    visibility: styles.visibility,
    opacity: styles.opacity,
    display: styles.display,
    zIndex: styles.zIndex
});
```

**Expected values:**
```
position: "fixed"
top: "300px" (or similar)
left: "200px" (or similar)
width: "380px" (or your size)
height: "600px" (or your size)
visibility: "visible"
opacity: "1"
display: "flex"
zIndex: "2147483645"
```

### Scenario C: Drag Starts But Stops Immediately

**Check event listeners:**
```javascript
// Type in Console:
const instance = window.ActNowInstance;
console.log('boundDragMove:', typeof instance.boundDragMove);  // should be "function"
console.log('boundDragEnd:', typeof instance.boundDragEnd);    // should be "function"
console.log('isDragging:', instance.state.isDragging);         // should be false when not dragging
```

---

## 🛠️ Manual Recovery Commands:

### If UI is Lost:

**1. Reset position to default:**
```javascript
const instance = window.ActNowInstance;
instance.state.chatPosition = { x: null, y: null };
instance.applyChatSizeAndPosition();
```

**2. Force to specific visible position:**
```javascript
const instance = window.ActNowInstance;
instance.state.chatPosition = { x: 100, y: 100 };
instance.applyChatSizeAndPosition();
```

**3. Check if container exists:**
```javascript
const container = window.ActNowInstance.shadowRoot.getElementById('actnow-chat-container');
console.log('Container:', container);
console.log('Classes:', container.className);
console.log('Display:', getComputedStyle(container).display);
```

**4. Force show container:**
```javascript
const container = window.ActNowInstance.shadowRoot.getElementById('actnow-chat-container');
container.style.position = 'fixed';
container.style.top = '100px';
container.style.left = '100px';
container.style.visibility = 'visible';
container.style.opacity = '1';
container.style.display = 'flex';
```

---

## 📊 Expected Console Output (Full Flow):

```
Page Load:
  ✅ Drag listener attached to header
  📍 Default centered position applied

Open Chat:
  (no special logs)

Hover Header:
  (cursor changes to ✋)

Click Header:
  🖱️ handleDragStart called, target: actnow-header-left
  ✅ Drag started at: {x: 234, y: 156} containerRect: {left: 520, top: 300, width: 380, height: 600}

Drag Move (multiple times):
  📍 Position applied: {x: 530, y: 310} actualRect: {left: 530, top: 310, width: 380, height: 600, visible: true}
  📍 Position applied: {x: 540, y: 320} actualRect: {left: 540, top: 320, width: 380, height: 600, visible: true}
  ... (smooth updates)

Release Mouse:
  🖱️ Drag ended
  💾 Position saved: {x: 600, y: 400}
```

---

## ⚠️ Report Back:

**If still not working, please provide:**

1. **Full console logs** (copy all logs from page load to drag attempt)
2. **actualRect values** (the complete object)
3. **State values:**
   ```javascript
   console.log(JSON.stringify({
       chatPosition: window.ActNowInstance.state.chatPosition,
       chatSize: window.ActNowInstance.state.chatSize,
       isDragging: window.ActNowInstance.state.isDragging
   }, null, 2));
   ```
4. **Browser info** (Chrome version, OS)

---

## 📝 Files Changed:

### content.js:
- ✅ Added `position: fixed` when custom position
- ✅ Added `animation: none` during drag
- ✅ Added visibility/opacity force
- ✅ Enhanced constraints with NaN check
- ✅ Added comprehensive debug logging

### chat-widget.css:
- ✅ Removed transform transition (conflicts with drag)
- ✅ Added rule for `position: fixed` state

---

## ✅ Success Indicators:

- [ ] Console shows drag start log
- [ ] Console shows position applied logs
- [ ] `actualRect.visible` is `true`
- [ ] `actualRect.left` and `actualRect.top` are reasonable values
- [ ] UI stays visible during drag
- [ ] UI moves smoothly with mouse
- [ ] Position saved after release

**If ALL checked → Drag works! 🎉**

**If ANY unchecked → Copy console logs and report back**
