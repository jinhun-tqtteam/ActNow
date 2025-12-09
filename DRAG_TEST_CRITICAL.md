# 🚨 CRITICAL: Test Drag - Check Console!

## ⚡ Quick Test (30 seconds):

### 1. Reload Extension
```
chrome://extensions/ → "Reload"
```

### 2. **OPEN CONSOLE** (Critical!)
```
F12 → Console tab
KEEP IT OPEN!
```

### 3. Reload Page
```
F5
```

### 4. Open Chat & Try Drag
```
1. Click chat button
2. Click & hold header (purple bar)
3. Try to drag
```

---

## 📋 What to Look For in Console:

### If UI Disappears:

**Check these logs:**
```
✅ Drag started at: {...} containerRect: {...}
📍 Position applied: {...} actualRect: {...}
```

**CRITICAL: Look at `actualRect`:**
```javascript
actualRect: {
    left: ???,    // Should be 0-1920 (your screen width)
    top: ???,     // Should be 0-1080 (your screen height)
    width: ???,   // Should be > 0
    height: ???,  // Should be > 0
    visible: ???  // Should be TRUE
}
```

### Good Example:
```
actualRect: {
    left: 300,
    top: 200,
    width: 380,
    height: 600,
    visible: true  ✅
}
→ This means UI is at correct position!
```

### Bad Example:
```
actualRect: {
    left: -5000,    ❌ Off-screen!
    top: -3000,     ❌ Off-screen!
    width: 0,       ❌ No width!
    height: 0,      ❌ No height!
    visible: false  ❌ INVISIBLE!
}
→ This is the problem!
```

---

## 🔧 If UI Disappears:

### Quick Fix:
```javascript
// Type in Console:
const instance = window.ActNowInstance;
instance.state.chatPosition = { x: 100, y: 100 };
instance.applyChatSizeAndPosition();
```

### Then Report:
**Copy and send me:**
1. All console logs
2. The `actualRect` values
3. Result of:
```javascript
console.log(JSON.stringify({
    position: window.ActNowInstance.state.chatPosition,
    size: window.ActNowInstance.state.chatSize
}, null, 2));
```

---

## ✅ Success:
- Console shows logs ✅
- `actualRect.visible: true` ✅
- UI moves with mouse ✅

## ❌ Failure:
- UI disappears when drag ❌
- `actualRect.visible: false` ❌
- Invalid position values ❌

**→ Send me console logs!**

---

**Total time: 30 seconds**
**Key: WATCH THE CONSOLE!** 📺
